import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as api from '../lib/api';
import type { AnalyticsSummary, AppUser, FoodPost, NGO, UserProfile, UserRole } from '../types';

interface NotificationItem {
  id: string;
  message: string;
  time: string;
  type: 'urgent' | 'warning' | 'success';
}

interface PersonalImpactSummary {
  scopeLabel: string;
  totalContributions: number;
  openContributions: number;
  completedContributions: number;
  foodWeightKg: number;
  mealsCount: number;
  itemCount: number;
  averagePickupTime: number | null;
  averageDeliveryTime: number | null;
  trackedWeightDonations: number;
  trackedMealDonations: number;
}

interface AppStateValue {
  user: AppUser | null;
  donations: FoodPost[];
  ngos: NGO[];
  profile: UserProfile;
  currentRole: UserRole | null;
  notifications: NotificationItem[];
  stats: {
    totalDonationsToday: number;
    activePickups: number;
    completedDeliveries: number;
    highPriorityAlerts: number;
  };
  analytics: {
    platform: AnalyticsSummary;
    personal: PersonalImpactSummary;
    dataQuality: {
      platformHasWeightData: boolean;
      platformHasMealData: boolean;
      personalHasWeightData: boolean;
      personalHasMealData: boolean;
    };
  };
  isAuthenticated: boolean;
  isLoading: boolean;
  authReady: boolean;
  login: (email: string, password: string) => Promise<AppUser>;
  logout: () => Promise<void>;
  refreshData: () => Promise<void>;
  saveProfile: (profile: UserProfile) => Promise<void>;
  addDonation: (donation: Omit<FoodPost, 'id' | 'donorUserId' | 'donorName' | 'status' | 'distance' | 'history' | 'pickupLat' | 'pickupLng'>) => Promise<FoodPost>;
  acceptDonation: (id: string) => Promise<void>;
  updateDonationStatus: (id: string, status: FoodPost['status']) => Promise<void>;
}

const TOKEN_STORAGE_KEY = 'nourish-net-auth-token';

const EMPTY_PROFILE: UserProfile = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  organization: '',
};

const EMPTY_ANALYTICS_SUMMARY: AnalyticsSummary = {
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

const AppStateContext = createContext<AppStateValue | null>(null);

function timeAgo(dateString: string) {
  const diffMinutes = Math.max(0, Math.round((Date.now() - new Date(dateString).getTime()) / 60000));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} day ago`;
}

function inferZone(address: string) {
  const value = address.toLowerCase();
  if (value.includes('north')) return 'North';
  if (value.includes('south')) return 'South';
  if (value.includes('east')) return 'East';
  if (value.includes('west')) return 'West';
  return 'Central';
}

function parseQuantityMetrics(quantity: string) {
  const raw = quantity.trim().toLowerCase();
  const numericMatch = raw.match(/(\d+(?:\.\d+)?)/);
  if (!numericMatch) {
    return { foodWeightKg: 0, mealsCount: 0, itemCount: 0, hasWeightData: false, hasMealData: false };
  }

  const value = Number(numericMatch[1]);
  if (!Number.isFinite(value)) {
    return { foodWeightKg: 0, mealsCount: 0, itemCount: 0, hasWeightData: false, hasMealData: false };
  }

  if (/(^|\s)(kg|kgs|kilogram|kilograms)(\s|$)/.test(raw)) {
    return { foodWeightKg: value, mealsCount: 0, itemCount: 0, hasWeightData: true, hasMealData: false };
  }

  if (/(^|\s)(g|gm|gram|grams)(\s|$)/.test(raw)) {
    return { foodWeightKg: Number((value / 1000).toFixed(3)), mealsCount: 0, itemCount: 0, hasWeightData: true, hasMealData: false };
  }

  if (/(serving|servings|meal|meals|plate|plates)/.test(raw)) {
    return { foodWeightKg: 0, mealsCount: value, itemCount: 0, hasWeightData: false, hasMealData: true };
  }

  if (/(packet|packets|piece|pieces|box|boxes|container|containers|tray|trays)/.test(raw)) {
    return { foodWeightKg: 0, mealsCount: 0, itemCount: value, hasWeightData: false, hasMealData: false };
  }

  return { foodWeightKg: 0, mealsCount: 0, itemCount: 0, hasWeightData: false, hasMealData: false };
}

function averageMinutes(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function summarizeDonations(donations: FoodPost[], ngos: NGO[]): AnalyticsSummary {
  const categoryCounts = {
    red: donations.filter((donation) => donation.category === 'red').length,
    yellow: donations.filter((donation) => donation.category === 'yellow').length,
    green: donations.filter((donation) => donation.category === 'green').length,
  };
  const totalDonations = donations.length;
  const totalForPercent = Math.max(totalDonations, 1);
  const zoneCounts = ngos.reduce<Record<string, number>>((acc, ngo) => {
    const zone = inferZone(ngo.location);
    acc[zone] = (acc[zone] ?? 0) + 1;
    return acc;
  }, {});
  const quantityMetrics = donations.map((donation) => parseQuantityMetrics(donation.quantity));
  const pickupDurations = donations
    .filter((donation) => donation.acceptedAt && donation.pickedUpAt)
    .map((donation) => {
      return Math.round(
        (new Date(donation.pickedUpAt as string).getTime() - new Date(donation.acceptedAt as string).getTime()) / 60000,
      );
    });
  const deliveryDurations = donations
    .filter((donation) => donation.pickedUpAt && donation.deliveredAt)
    .map((donation) => {
      return Math.round(
        (new Date(donation.deliveredAt as string).getTime() - new Date(donation.pickedUpAt as string).getTime()) / 60000,
      );
    });

  return {
    totalDonations,
    openDonations: donations.filter((donation) => donation.status !== 'delivered').length,
    deliveredDonations: donations.filter((donation) => donation.status === 'delivered').length,
    foodWeightKg: Number(quantityMetrics.reduce((sum, item) => sum + item.foodWeightKg, 0).toFixed(2)),
    mealsCount: quantityMetrics.reduce((sum, item) => sum + item.mealsCount, 0),
    itemCount: quantityMetrics.reduce((sum, item) => sum + item.itemCount, 0),
    averagePickupTime: averageMinutes(pickupDurations),
    averageDeliveryTime: averageMinutes(deliveryDurations),
    totalPartnerNGOs: ngos.length,
    trackedWeightDonations: quantityMetrics.filter((item) => item.hasWeightData).length,
    trackedMealDonations: quantityMetrics.filter((item) => item.hasMealData).length,
    categoryDistribution: [
      { name: 'High Priority', value: Math.round((categoryCounts.red / totalForPercent) * 100), count: categoryCounts.red, fill: '#ef4444' },
      { name: 'Medium Priority', value: Math.round((categoryCounts.yellow / totalForPercent) * 100), count: categoryCounts.yellow, fill: '#eab308' },
      { name: 'Low Priority', value: Math.round((categoryCounts.green / totalForPercent) * 100), count: categoryCounts.green, fill: '#22c55e' },
    ],
    activeNGOsByZone: Object.entries(zoneCounts).map(([zone, count]) => ({ zone, count })),
  };
}

function getStoredToken() {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [donations, setDonations] = useState<FoodPost[]>([]);
  const [ngos, setNgos] = useState<NGO[]>([]);
  const [platformAnalytics, setPlatformAnalytics] = useState<AnalyticsSummary>(EMPTY_ANALYTICS_SUMMARY);
  const [isLoading, setIsLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  const clearSession = () => {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setDonations([]);
    setNgos([]);
    setPlatformAnalytics(EMPTY_ANALYTICS_SUMMARY);
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

  const login = async (email: string, password: string) => {
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

  const notifications = useMemo<NotificationItem[]>(() => {
    return [...donations]
      .sort((a, b) => {
        const rightTime = b.deliveredAt || b.pickedUpAt || b.acceptedAt || b.cookedTime;
        const leftTime = a.deliveredAt || a.pickedUpAt || a.acceptedAt || a.cookedTime;
        return new Date(rightTime).getTime() - new Date(leftTime).getTime();
      })
      .slice(0, 4)
      .map((donation) => {
        const urgent = donation.category === 'red' && donation.status === 'pending';
        const type =
          donation.status === 'delivered'
            ? 'success'
            : urgent
              ? 'urgent'
              : 'warning';

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
      totalDonationsToday: donations.filter(
        (donation) => new Date(donation.cookedTime).toDateString() === today,
      ).length,
      activePickups: donations.filter(
        (donation) => donation.status === 'accepted' || donation.status === 'pickedup',
      ).length,
      completedDeliveries: donations.filter((donation) => donation.status === 'delivered').length,
      highPriorityAlerts: donations.filter(
        (donation) => donation.category === 'red' && donation.status === 'pending',
      ).length,
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

  const saveProfile = async (nextProfile: UserProfile) => {
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

  const addDonation: AppStateValue['addDonation'] = async (donation) => {
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

  const acceptDonation = async (id: string) => {
    if (!token) {
      throw new Error('Not authenticated');
    }

    setIsLoading(true);
    try {
      await api.acceptDonation(token, id);
      await refreshData(token);
    } finally {
      setIsLoading(false);
    }
  };

  const updateDonationStatus = async (id: string, status: FoodPost['status']) => {
    if (!token) {
      throw new Error('Not authenticated');
    }

    setIsLoading(true);
    try {
      await api.updateDonationStatus(token, id, status);
      await refreshData(token);
    } finally {
      setIsLoading(false);
    }
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
    isAuthenticated: Boolean(user),
    isLoading,
    authReady,
    login,
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

