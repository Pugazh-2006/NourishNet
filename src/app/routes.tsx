import { createBrowserRouter } from 'react-router';
import HomePage from './pages/HomePage';
import RoleSelectionPage from './pages/RoleSelectionPage';
import DonorDashboardPage from './pages/DonorDashboardPage';
import PostFoodPage from './pages/PostFoodPage';
import NGOFoodListPage from './pages/NGOFoodListPage';
import MapPage from './pages/MapPage';
import VolunteerPickupPage from './pages/VolunteerPickupPage';
import TrackingPage from './pages/TrackingPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ActiveDonationsPage from './pages/ActiveDonationsPage';
import HistoryPage from './pages/HistoryPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import { PublicOnly, RequireAuth, RequireRole } from './components/RouteGuards';

function ProtectedHome() {
  return (
    <RequireAuth>
      <HomePage />
    </RequireAuth>
  );
}

function ProtectedRoleSelection() {
  return (
    <RequireAuth>
      <RoleSelectionPage />
    </RequireAuth>
  );
}

function ProtectedActiveDonations() {
  return (
    <RequireAuth>
      <ActiveDonationsPage />
    </RequireAuth>
  );
}

function ProtectedMap() {
  return (
    <RequireAuth>
      <MapPage />
    </RequireAuth>
  );
}

function ProtectedTracking() {
  return (
    <RequireAuth>
      <TrackingPage />
    </RequireAuth>
  );
}

function ProtectedAnalytics() {
  return (
    <RequireAuth>
      <AnalyticsPage />
    </RequireAuth>
  );
}

function ProtectedHistory() {
  return (
    <RequireAuth>
      <HistoryPage />
    </RequireAuth>
  );
}

function ProtectedProfile() {
  return (
    <RequireAuth>
      <ProfilePage />
    </RequireAuth>
  );
}

function DonorOnlyDashboard() {
  return (
    <RequireRole role="donor">
      <DonorDashboardPage />
    </RequireRole>
  );
}

function DonorOnlyPostFood() {
  return (
    <RequireRole role="donor">
      <PostFoodPage />
    </RequireRole>
  );
}

function NgoOnlyFoodList() {
  return (
    <RequireRole role="ngo">
      <NGOFoodListPage />
    </RequireRole>
  );
}

function VolunteerOnlyPickup() {
  return (
    <RequireRole role="volunteer">
      <VolunteerPickupPage />
    </RequireRole>
  );
}

function PublicLogin() {
  return (
    <PublicOnly>
      <LoginPage />
    </PublicOnly>
  );
}

export const router = createBrowserRouter([
  {
    path: '/login',
    Component: PublicLogin,
  },
  {
    path: '/',
    Component: ProtectedHome,
  },
  {
    path: '/role-selection',
    Component: ProtectedRoleSelection,
  },
  {
    path: '/donor-dashboard',
    Component: DonorOnlyDashboard,
  },
  {
    path: '/post-food',
    Component: DonorOnlyPostFood,
  },
  {
    path: '/ngo-food-list',
    Component: NgoOnlyFoodList,
  },
  {
    path: '/map',
    Component: ProtectedMap,
  },
  {
    path: '/volunteer-pickup',
    Component: VolunteerOnlyPickup,
  },
  {
    path: '/tracking/:id',
    Component: ProtectedTracking,
  },
  {
    path: '/analytics',
    Component: ProtectedAnalytics,
  },
  {
    path: '/active-donations',
    Component: ProtectedActiveDonations,
  },
  {
    path: '/history',
    Component: ProtectedHistory,
  },
  {
    path: '/profile',
    Component: ProtectedProfile,
  },
]);
