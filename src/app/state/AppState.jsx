import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as api from '../lib/api';
import { summarizeDonations } from './analytics';

const TOKEN_STORAGE_KEY = 'nourish-net-auth-token';

const EMPTY_PROFILE = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  organization: '',
};

const EMPTY_ANALYTICS_SUMMARY = {
  totalDonations: 0,
  openDonations: 0,
  deliveredDonations: 0,
  foodWeightKg: 0,
  mealsCount: 0,
  itemCount: 0,
  averagePickupTime: null,
  averageDeliveryTime: null,
  totalPartnerNGOs: 0,
  trackedWeightDonations: 0,
  trackedMealDonations: 0,
  categoryDistribution: [
    { name: 'High Priority', value: 0, count: 0, fill: '#ef4444' },
    { name: 'Medium Priority', value: 0, count: 0, fill: '#eab308' },
    { name: 'Low Priority', value: 0, count: 0, fill: '#22c55e' },
  ],
  activeNGOsByZone: [],
};

const EMPTY_GEOCODE_HEALTH = {
  totalRequests: 0,
  fallbackCount: 0,
  cacheCount: 0,
  nominatimCount: 0,
  fallbackRate: 0,
  fallbackReasons: [],
};

const AppStateContext = createContext(null);

function timeAgo(dateString) {
  const diffMinutes = Math.max(0, Math.round((Date.now() - new Date(dateString).getTime()) / 60000));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} day ago`;
}

function getStoredToken() {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function AppStateProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [donations, setDonations] = useState([]);
  const [ngos, setNgos] = useState([]);
  const [platformAnalytics, setPlatformAnalytics] = useState(EMPTY_ANALYTICS_SUMMARY);
  const [geocodeHealth, setGeocodeHealth] = useState(EMPTY_GEOCODE_HEALTH);
  const [isLoading, setIsLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const inFlightActionsRef = useRef(new Set());

  const clearSession = () => {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setDonations([]);
    setNgos([]);
    setPlatformAnalytics(EMPTY_ANALYTICS_SUMMARY);
    setGeocodeHealth(EMPTY_GEOCODE_HEALTH);
  };

  const refreshData = async (sessionToken = token) => {
    if (!sessionToken) {
      setAuthReady(true);
      return;
    }

    const data = await api.getBootstrap(sessionToken);
    setUser(data.user);
    setDonations(data.donations);
    setNgos(data.ngos);
    setPlatformAnalytics(data.platformAnalytics);
    setGeocodeHealth(data.geocodeHealth || EMPTY_GEOCODE_HEALTH);
    setAuthReady(true);
  };

  useEffect(() => {
    const existingToken = getStoredToken();
    if (!existingToken) {
      setAuthReady(true);
      return;
    }

    setToken(existingToken);
    refreshData(existingToken).catch(() => {
      clearSession();
      setAuthReady(true);
    });
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const response = await api.login(email, password);
      window.localStorage.setItem(TOKEN_STORAGE_KEY, response.token);
      setToken(response.token);
      await refreshData(response.token);
      return response.user;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (payload) => {
    setIsLoading(true);
    try {
      const response = await api.signup(payload);
      window.localStorage.setItem(TOKEN_STORAGE_KEY, response.token);
      setToken(response.token);
      await refreshData(response.token);
      return response.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await api.logout(token);
      } catch {
        // Keep logout resilient even if the API is already down.
      }
    }

    clearSession();
    setAuthReady(true);
  };

  const profile = user
    ? {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        address: user.address,
        organization: user.organization,
      }
    : EMPTY_PROFILE;

  const notifications = useMemo(() => {
    return [...donations]
      .sort((a, b) => {
        const rightTime = b.deliveredAt || b.pickedUpAt || b.acceptedAt || b.cookedTime;
        const leftTime = a.deliveredAt || a.pickedUpAt || a.acceptedAt || a.cookedTime;
        return new Date(rightTime).getTime() - new Date(leftTime).getTime();
      })
      .slice(0, 4)
      .map((donation) => {
        const urgent = donation.category === 'red' && donation.status === 'pending';
        const type = donation.status === 'delivered' ? 'success' : urgent ? 'urgent' : 'warning';

        let message = `${donation.foodName} is pending review`;
        if (donation.status === 'accepted') {
          message = `${donation.foodName} accepted by ${donation.acceptedBy}`;
        } else if (donation.status === 'pickedup') {
          message = `${donation.foodName} picked up by ${donation.volunteerName || 'volunteer'}`;
        } else if (donation.status === 'delivered') {
          message = `${donation.foodName} delivered successfully`;
        }

        const referenceTime = donation.deliveredAt || donation.pickedUpAt || donation.acceptedAt || donation.cookedTime;
        return {
          id: donation.id,
          message,
          time: timeAgo(referenceTime),
          type,
        };
      });
  }, [donations]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    return {
      totalDonationsToday: donations.filter((donation) => new Date(donation.cookedTime).toDateString() === today).length,
      activePickups: donations.filter((donation) => donation.status === 'accepted' || donation.status === 'pickedup').length,
      completedDeliveries: donations.filter((donation) => donation.status === 'delivered').length,
      highPriorityAlerts: donations.filter((donation) => donation.category === 'red' && donation.status === 'pending').length,
    };
  }, [donations]);

  const analytics = useMemo(() => {
    const personalSummary = summarizeDonations(donations, ngos);
    const scopeLabel =
      user?.role === 'donor'
        ? 'Your donor impact'
        : user?.role === 'ngo'
          ? 'Your NGO impact'
          : user?.role === 'volunteer'
            ? 'Your volunteer impact'
            : 'Your impact';

    return {
      platform: platformAnalytics,
      personal: {
        scopeLabel,
        totalContributions: personalSummary.totalDonations,
        openContributions: personalSummary.openDonations,
        completedContributions: personalSummary.deliveredDonations,
        foodWeightKg: personalSummary.foodWeightKg,
        mealsCount: personalSummary.mealsCount,
        itemCount: personalSummary.itemCount,
        averagePickupTime: personalSummary.averagePickupTime,
        averageDeliveryTime: personalSummary.averageDeliveryTime,
        trackedWeightDonations: personalSummary.trackedWeightDonations,
        trackedMealDonations: personalSummary.trackedMealDonations,
      },
      dataQuality: {
        platformHasWeightData: platformAnalytics.trackedWeightDonations > 0,
        platformHasMealData: platformAnalytics.trackedMealDonations > 0,
        personalHasWeightData: personalSummary.trackedWeightDonations > 0,
        personalHasMealData: personalSummary.trackedMealDonations > 0,
      },
    };
  }, [donations, ngos, platformAnalytics, user?.role]);

  const saveProfile = async (nextProfile) => {
    if (!token) {
      throw new Error('Not authenticated');
    }

    setIsLoading(true);
    try {
      const nextUser = await api.saveProfile(token, nextProfile);
      setUser(nextUser);
      await refreshData(token);
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    if (!token) {
      throw new Error('Not authenticated');
    }

    setIsLoading(true);
    try {
      await api.changePassword(token, currentPassword, newPassword);
      clearSession();
      setAuthReady(true);
    } finally {
      setIsLoading(false);
    }
  };

  const addDonation = async (donation) => {
    if (!token) {
      throw new Error('Not authenticated');
    }

    setIsLoading(true);
    try {
      const created = await api.createDonation(token, donation);
      await refreshData(token);
      return created;
    } finally {
      setIsLoading(false);
    }
  };

  const runActionOnce = async (actionKey, runner) => {
    if (inFlightActionsRef.current.has(actionKey)) {
      throw new api.ApiError('This action is already being processed. Please wait.', 409, {
        code: 'duplicate_in_flight',
        retryable: true,
      });
    }

    inFlightActionsRef.current.add(actionKey);
    try {
      return await runner();
    } finally {
      inFlightActionsRef.current.delete(actionKey);
    }
  };

  const acceptDonation = async (id) => {
    if (!token) {
      throw new Error('Not authenticated');
    }

    return runActionOnce(`accept:${id}`, async () => {
      setIsLoading(true);
      try {
        await api.acceptDonation(token, id, `accept:${id}`);
        await refreshData(token);
      } catch (error) {
        if (error instanceof api.ApiError && error.code === 'stale_state') {
          await refreshData(token);
        }
        throw error;
      } finally {
        setIsLoading(false);
      }
    });
  };

  const updateDonationStatus = async (id, status) => {
    if (!token) {
      throw new Error('Not authenticated');
    }

    return runActionOnce(`status:${id}:${status}`, async () => {
      setIsLoading(true);
      try {
        await api.updateDonationStatus(token, id, status, `status:${id}:${status}`);
        await refreshData(token);
      } catch (error) {
        if (error instanceof api.ApiError && error.code === 'stale_state') {
          await refreshData(token);
        }
        throw error;
      } finally {
        setIsLoading(false);
      }
    });
  };

  const value = {
    user,
    donations,
    ngos,
    profile,
    currentRole: user?.role ?? null,
    notifications,
    stats,
    analytics,
    geocodeHealth,
    isAuthenticated: Boolean(user),
    isLoading,
    authReady,
    login,
    signup,
    changePassword,
    logout,
    refreshData: () => refreshData(),
    saveProfile,
    addDonation,
    acceptDonation,
    updateDonationStatus,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) {
    throw new Error('useAppState must be used within AppStateProvider');
  }

  return value;
}



