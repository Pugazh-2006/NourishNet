import { jsx as _jsx } from "react/jsx-runtime";
import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router';
import { PublicOnly, RequireAuth, RequireRole } from './components/RouteGuards';
const HomePage = lazy(() => import('./pages/HomePage'));
const RoleSelectionPage = lazy(() => import('./pages/RoleSelectionPage'));
const DonorDashboardPage = lazy(() => import('./pages/DonorDashboardPage'));
const PostFoodPage = lazy(() => import('./pages/PostFoodPage'));
const NGOFoodListPage = lazy(() => import('./pages/NGOFoodListPage'));
const MapPage = lazy(() => import('./pages/MapPage'));
const VolunteerPickupPage = lazy(() => import('./pages/VolunteerPickupPage'));
const TrackingPage = lazy(() => import('./pages/TrackingPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const ActiveDonationsPage = lazy(() => import('./pages/ActiveDonationsPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
function RouteFallback() {
    return _jsx("div", { className: "min-h-screen bg-gray-50" });
}
function withPageSuspense(element) {
    return _jsx(Suspense, { fallback: _jsx(RouteFallback, {}), children: element });
}
function ProtectedHome() {
    return (_jsx(RequireAuth, { children: withPageSuspense(_jsx(HomePage, {})) }));
}
function ProtectedRoleSelection() {
    return (_jsx(RequireAuth, { children: withPageSuspense(_jsx(RoleSelectionPage, {})) }));
}
function ProtectedActiveDonations() {
    return (_jsx(RequireAuth, { children: withPageSuspense(_jsx(ActiveDonationsPage, {})) }));
}
function ProtectedMap() {
    return (_jsx(RequireAuth, { children: withPageSuspense(_jsx(MapPage, {})) }));
}
function ProtectedTracking() {
    return (_jsx(RequireAuth, { children: withPageSuspense(_jsx(TrackingPage, {})) }));
}
function ProtectedAnalytics() {
    return (_jsx(RequireAuth, { children: withPageSuspense(_jsx(AnalyticsPage, {})) }));
}
function ProtectedHistory() {
    return (_jsx(RequireAuth, { children: withPageSuspense(_jsx(HistoryPage, {})) }));
}
function ProtectedProfile() {
    return (_jsx(RequireAuth, { children: withPageSuspense(_jsx(ProfilePage, {})) }));
}
function DonorOnlyDashboard() {
    return (_jsx(RequireRole, { role: "donor", children: withPageSuspense(_jsx(DonorDashboardPage, {})) }));
}
function DonorOnlyPostFood() {
    return (_jsx(RequireRole, { role: "donor", children: withPageSuspense(_jsx(PostFoodPage, {})) }));
}
function NgoOnlyFoodList() {
    return (_jsx(RequireRole, { role: "ngo", children: withPageSuspense(_jsx(NGOFoodListPage, {})) }));
}
function VolunteerOnlyPickup() {
    return (_jsx(RequireRole, { role: "volunteer", children: withPageSuspense(_jsx(VolunteerPickupPage, {})) }));
}
function PublicLogin() {
    return (_jsx(PublicOnly, { children: withPageSuspense(_jsx(LoginPage, {})) }));
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
