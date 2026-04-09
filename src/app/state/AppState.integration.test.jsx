import { act, render, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { AppStateProvider, useAppState } from './AppState';
import * as api from '../lib/api';

vi.mock('../lib/api', () => ({
  login: vi.fn(),
  signup: vi.fn(),
  logout: vi.fn(),
  changePassword: vi.fn(),
  getBootstrap: vi.fn(),
  saveProfile: vi.fn(),
  createDonation: vi.fn(),
  acceptDonation: vi.fn(),
  updateDonationStatus: vi.fn(),
}));

const mockedApi = vi.mocked(api);

const EMPTY_ANALYTICS = {
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
  categoryDistribution: [],
  activeNGOsByZone: [],
};

function makeUser(role) {
  return {
    id: `user-${role}`,
    role,
    email: `${role}@nourishnet.local`,
    firstName: role,
    lastName: 'user',
    phone: '9999999999',
    address: 'Central',
    organization: `${role}-org`,
  };
}

function makeDonation(status) {
  return {
    id: 'donation-1',
    foodName: 'Rice',
    isVeg: true,
    quantity: '10 servings',
    category: 'yellow',
    cookedTime: '2026-04-09T10:00:00.000Z',
    safeUntil: '2026-04-09T13:00:00.000Z',
    location: 'Central',
    pickupLat: 28.61,
    pickupLng: 77.2,
    donorUserId: 'user-donor',
    donorName: 'donor',
    status,
    history: [],
  };
}

function setupBootstrap(role, donations = [], ngos = []) {
  mockedApi.getBootstrap.mockResolvedValue({
    user: makeUser(role),
    donations,
    ngos,
    platformAnalytics: EMPTY_ANALYTICS,
    geocodeHealth: { totalRequests: 0, fallbackCount: 0, cacheCount: 0, nominatimCount: 0, fallbackRate: 0, fallbackReasons: [] },
  });
}

describe('AppState role integrations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('supports donor login and create donation flow', async () => {
    let latest = null;
    mockedApi.login.mockResolvedValue({ token: 'token-donor', user: makeUser('donor') });
    setupBootstrap('donor');
    mockedApi.createDonation.mockResolvedValue(makeDonation('pending'));

    function Probe() {
      const state = useAppState();
      useEffect(() => {
        latest = state;
      }, [state]);
      return null;
    }

    render(
      <AppStateProvider>
        <Probe />
      </AppStateProvider>,
    );

    await act(async () => {
      await latest?.login('donor@nourishnet.local', 'password123');
    });

    await waitFor(() => {
      expect(latest?.isAuthenticated).toBe(true);
      expect(latest?.currentRole).toBe('donor');
    });

    await act(async () => {
      await latest?.addDonation({
        foodName: 'Chapati',
        isVeg: true,
        quantity: '20 servings',
        category: 'green',
        cookedTime: '2026-04-09T10:00:00.000Z',
        safeUntil: '2026-04-09T14:00:00.000Z',
        location: 'North Block',
      });
    });

    expect(mockedApi.createDonation).toHaveBeenCalledWith('token-donor', expect.objectContaining({ foodName: 'Chapati' }));
  });

  it('supports signup flow for new donor accounts', async () => {
    let latest = null;
    mockedApi.signup.mockResolvedValue({ token: 'token-signup', user: makeUser('donor') });
    setupBootstrap('donor');

    function Probe() {
      const state = useAppState();
      useEffect(() => {
        latest = state;
      }, [state]);
      return null;
    }

    render(
      <AppStateProvider>
        <Probe />
      </AppStateProvider>,
    );

    await act(async () => {
      await latest?.signup({
        role: 'donor',
        firstName: 'Fresh',
        lastName: 'Donor',
        email: 'fresh@nourishnet.local',
        password: 'password123',
        phone: '+91 90000 00001',
        address: 'Central district',
        organization: 'Fresh Foods',
      });
    });

    await waitFor(() => {
      expect(latest?.isAuthenticated).toBe(true);
      expect(latest?.currentRole).toBe('donor');
    });

    expect(mockedApi.signup).toHaveBeenCalledWith(expect.objectContaining({ role: 'donor', email: 'fresh@nourishnet.local' }));
    expect(window.localStorage.getItem('nourish-net-auth-token')).toBe('token-signup');
  });

  it('supports NGO accept flow from authenticated session', async () => {
    let latest = null;
    window.localStorage.setItem('nourish-net-auth-token', 'token-ngo');
    setupBootstrap('ngo', [makeDonation('pending')]);
    mockedApi.acceptDonation.mockResolvedValue(makeDonation('accepted'));

    function Probe() {
      const state = useAppState();
      useEffect(() => {
        latest = state;
      }, [state]);
      return null;
    }

    render(
      <AppStateProvider>
        <Probe />
      </AppStateProvider>,
    );

    await waitFor(() => {
      expect(latest?.authReady).toBe(true);
      expect(latest?.currentRole).toBe('ngo');
    });

    await act(async () => {
      await latest?.acceptDonation('donation-1');
    });

    expect(mockedApi.acceptDonation).toHaveBeenCalledWith('token-ngo', 'donation-1', 'accept:donation-1');
  });

  it('supports volunteer pickup and delivery status updates', async () => {
    let latest = null;
    window.localStorage.setItem('nourish-net-auth-token', 'token-volunteer');
    setupBootstrap('volunteer', [makeDonation('accepted')]);
    mockedApi.updateDonationStatus
      .mockResolvedValueOnce(makeDonation('pickedup'))
      .mockResolvedValueOnce(makeDonation('delivered'));

    function Probe() {
      const state = useAppState();
      useEffect(() => {
        latest = state;
      }, [state]);
      return null;
    }

    render(
      <AppStateProvider>
        <Probe />
      </AppStateProvider>,
    );

    await waitFor(() => {
      expect(latest?.authReady).toBe(true);
      expect(latest?.currentRole).toBe('volunteer');
    });

    await act(async () => {
      await latest?.updateDonationStatus('donation-1', 'pickedup');
      await latest?.updateDonationStatus('donation-1', 'delivered');
    });

    expect(mockedApi.updateDonationStatus).toHaveBeenNthCalledWith(1, 'token-volunteer', 'donation-1', 'pickedup', 'status:donation-1:pickedup');
    expect(mockedApi.updateDonationStatus).toHaveBeenNthCalledWith(2, 'token-volunteer', 'donation-1', 'delivered', 'status:donation-1:delivered');
  });

  it('invalidates local session after password change', async () => {
    let latest = null;
    window.localStorage.setItem('nourish-net-auth-token', 'token-donor');
    setupBootstrap('donor');
    mockedApi.changePassword.mockResolvedValue({ ok: true });

    function Probe() {
      const state = useAppState();
      useEffect(() => {
        latest = state;
      }, [state]);
      return null;
    }

    render(
      <AppStateProvider>
        <Probe />
      </AppStateProvider>,
    );

    await waitFor(() => {
      expect(latest?.authReady).toBe(true);
      expect(latest?.isAuthenticated).toBe(true);
    });

    await act(async () => {
      await latest?.changePassword('password123', 'newpassword123');
    });

    expect(mockedApi.changePassword).toHaveBeenCalledWith('token-donor', 'password123', 'newpassword123');
    expect(window.localStorage.getItem('nourish-net-auth-token')).toBeNull();
    expect(latest?.isAuthenticated).toBe(false);
  });
});
