import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { lazy, Suspense } from 'react';
import { TopNav } from '../components/TopNav';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { TrendingUp, Users, Clock, Package, CheckCircle, ClipboardList } from 'lucide-react';
import { useAppState } from '../state/AppState';
const AnalyticsCharts = lazy(() => import('../components/analytics/AnalyticsCharts'));
function formatMinutes(value) {
    return value === null ? 'Not enough data' : `${value} mins`;
}
function formatWeight(value) {
    return value > 0 ? `${value.toLocaleString()} kg` : 'No kg data yet';
}
export default function AnalyticsPage() {
    const { analytics } = useAppState();
    const { platform, personal, dataQuality } = analytics;
    const platformStats = [
        {
            label: 'Platform Donations',
            value: platform.totalDonations.toLocaleString(),
            icon: ClipboardList,
            color: 'text-green-600 bg-green-100',
        },
        {
            label: 'Tracked Meals',
            value: dataQuality.platformHasMealData ? platform.mealsCount.toLocaleString() : 'No meal data yet',
            icon: Users,
            color: 'text-blue-600 bg-blue-100',
        },
        {
            label: 'Tracked Food Weight',
            value: formatWeight(platform.foodWeightKg),
            icon: Package,
            color: 'text-orange-600 bg-orange-100',
        },
        {
            label: 'Avg Pickup Time',
            value: formatMinutes(platform.averagePickupTime),
            icon: Clock,
            color: 'text-purple-600 bg-purple-100',
        },
    ];
    const personalStats = [
        {
            label: 'Your Donations in Scope',
            value: personal.totalContributions.toLocaleString(),
            icon: ClipboardList,
            color: 'text-slate-700 bg-slate-100',
        },
        {
            label: 'Your Completed Deliveries',
            value: personal.completedContributions.toLocaleString(),
            icon: CheckCircle,
            color: 'text-green-600 bg-green-100',
        },
        {
            label: 'Your Tracked Meals',
            value: dataQuality.personalHasMealData ? personal.mealsCount.toLocaleString() : 'No meal data yet',
            icon: Users,
            color: 'text-blue-600 bg-blue-100',
        },
        {
            label: 'Your Avg Pickup Time',
            value: formatMinutes(personal.averagePickupTime),
            icon: TrendingUp,
            color: 'text-purple-600 bg-purple-100',
        },
    ];
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsx(TopNav, {}), _jsxs("div", { className: "max-w-7xl mx-auto px-4 py-8", children: [_jsxs("div", { className: "mb-8", children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900 mb-2", children: "Analytics & Reports" }), _jsx("p", { className: "text-gray-600", children: "Track platform-wide activity separately from your own contribution history." })] }), _jsx(Card, { className: "mb-6 border-amber-200 bg-amber-50", children: _jsxs(CardContent, { className: "p-4 text-sm text-amber-900 space-y-1", children: [_jsx("p", { children: "Only structured quantity entries are counted as real metrics." }), _jsxs("p", { children: ["Meals are counted from entries like ", _jsx("span", { className: "font-medium", children: "50 servings" }), ". Food weight is counted from entries like ", _jsx("span", { className: "font-medium", children: "12 kg" }), " or ", _jsx("span", { className: "font-medium", children: "500 g" }), "."] })] }) }), _jsxs("div", { className: "mb-8", children: [_jsx("h2", { className: "text-xl font-semibold text-gray-900 mb-4", children: "Platform Overview" }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", children: platformStats.map((stat) => (_jsx(Card, { children: _jsx(CardContent, { className: "p-6", children: _jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600 mb-1", children: stat.label }), _jsx("p", { className: "text-2xl font-bold text-gray-900", children: stat.value })] }), _jsx("div", { className: `p-3 rounded-lg ${stat.color}`, children: _jsx(stat.icon, { className: "w-6 h-6" }) })] }) }) }, stat.label))) })] }), _jsxs("div", { className: "mb-8", children: [_jsx("h2", { className: "text-xl font-semibold text-gray-900 mb-4", children: "Your Impact" }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", children: personalStats.map((stat) => (_jsx(Card, { children: _jsx(CardContent, { className: "p-6", children: _jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600 mb-1", children: stat.label }), _jsx("p", { className: "text-2xl font-bold text-gray-900", children: stat.value })] }), _jsx("div", { className: `p-3 rounded-lg ${stat.color}`, children: _jsx(stat.icon, { className: "w-6 h-6" }) })] }) }) }, stat.label))) })] }), _jsx(Suspense, { fallback: _jsx("div", { className: "h-[300px] rounded-xl border bg-white" }), children: _jsx(AnalyticsCharts, { platform: platform }) }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6", children: [_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Platform Summary" }) }), _jsxs(CardContent, { className: "space-y-3 text-sm text-gray-700", children: [_jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "Open donations:" }), " ", platform.openDonations] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "Completed deliveries:" }), " ", platform.deliveredDonations] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "Partner NGOs:" }), " ", platform.totalPartnerNGOs] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "Tracked meal entries:" }), " ", platform.trackedMealDonations] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "Tracked weight entries:" }), " ", platform.trackedWeightDonations] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "Avg delivery time after pickup:" }), " ", formatMinutes(platform.averageDeliveryTime)] })] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: personal.scopeLabel }) }), _jsxs(CardContent, { className: "space-y-3 text-sm text-gray-700", children: [_jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "Open items in your scope:" }), " ", personal.openContributions] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "Completed items in your scope:" }), " ", personal.completedContributions] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "Tracked food weight:" }), " ", formatWeight(personal.foodWeightKg)] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "Tracked loose-item count:" }), " ", personal.itemCount] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "Tracked meal entries:" }), " ", personal.trackedMealDonations] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "Avg delivery time after pickup:" }), " ", formatMinutes(personal.averageDeliveryTime)] })] })] })] })] })] }));
}
