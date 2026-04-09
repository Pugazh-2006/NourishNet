import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { TopNav } from '../components/TopNav';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { TrendingUp, Package, CheckCircle, AlertTriangle, Bell } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAppState } from '../state/AppState';
export default function HomePage() {
    const navigate = useNavigate();
    const { stats: dashboardStats, notifications, currentRole } = useAppState();
    const workspacePath = currentRole === 'donor'
        ? '/donor-dashboard'
        : currentRole === 'ngo'
            ? '/ngo-food-list'
            : '/volunteer-pickup';
    const stats = [
        { label: 'Total Donations Today', value: dashboardStats.totalDonationsToday, icon: Package, color: 'text-blue-600 bg-blue-100' },
        { label: 'Active Pickups', value: dashboardStats.activePickups, icon: TrendingUp, color: 'text-green-600 bg-green-100' },
        { label: 'Completed Deliveries', value: dashboardStats.completedDeliveries, icon: CheckCircle, color: 'text-purple-600 bg-purple-100' },
        { label: 'High Priority Alerts', value: dashboardStats.highPriorityAlerts, icon: AlertTriangle, color: 'text-red-600 bg-red-100' },
    ];
    const roleGuide = currentRole === 'donor'
        ? {
            title: 'Donor Flow',
            description: 'Post a donation, review its status, and track it through NGO acceptance and delivery.',
            primaryLabel: 'Post New Donation',
            primaryAction: () => navigate('/post-food'),
            secondaryLabel: 'Open My Donations',
            secondaryAction: () => navigate('/donor-dashboard'),
        }
        : currentRole === 'ngo'
            ? {
                title: 'NGO Flow',
                description: 'Review pending food, accept safe donations, and monitor live handoff progress.',
                primaryLabel: 'Review NGO Queue',
                primaryAction: () => navigate('/ngo-food-list'),
                secondaryLabel: 'Open Active Donations',
                secondaryAction: () => navigate('/active-donations'),
            }
            : {
                title: 'Volunteer Flow',
                description: 'Open your assigned pickups, confirm collection, and complete delivery safely.',
                primaryLabel: 'Open Assigned Pickups',
                primaryAction: () => navigate('/volunteer-pickup'),
                secondaryLabel: 'Open Map View',
                secondaryAction: () => navigate('/map'),
            };
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsx(TopNav, {}), _jsxs("div", { className: "max-w-7xl mx-auto px-4 py-8", children: [_jsxs("div", { className: "mb-8", children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900 mb-2", children: "Main Dashboard" }), _jsx("p", { className: "text-gray-600", children: "Monitor food donations and manage pickups in real-time" })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8", children: stats.map((stat) => (_jsx(Card, { className: "hover:shadow-lg transition-shadow", children: _jsx(CardContent, { className: "p-6", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600 mb-1", children: stat.label }), _jsx("p", { className: "text-3xl font-bold text-gray-900", children: stat.value })] }), _jsx("div", { className: `p-3 rounded-lg ${stat.color}`, children: _jsx(stat.icon, { className: "w-6 h-6" }) })] }) }) }, stat.label))) }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [_jsxs(Card, { className: "lg:col-span-2", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Bell, { className: "w-5 h-5" }), "Recent Notifications"] }) }), _jsx(CardContent, { children: notifications.length === 0 ? (_jsxs("div", { className: "rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center", children: [_jsx("p", { className: "font-medium text-gray-900", children: "No recent workflow alerts yet." }), _jsx("p", { className: "text-sm text-gray-600 mt-2", children: "Your next updates will appear here as donations move through the flow." })] })) : (_jsx("div", { className: "space-y-4", children: notifications.map((notification) => (_jsxs("div", { className: `p-4 rounded-lg border-l-4 ${notification.type === 'urgent'
                                                    ? 'border-red-500 bg-red-50'
                                                    : notification.type === 'warning'
                                                        ? 'border-yellow-500 bg-yellow-50'
                                                        : 'border-green-500 bg-green-50'}`, children: [_jsx("p", { className: "font-medium text-gray-900", children: notification.message }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: notification.time })] }, notification.id))) })) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Quick Actions" }) }), _jsx(CardContent, { children: _jsxs("div", { className: "space-y-3", children: [_jsx(Button, { onClick: () => navigate(workspacePath), className: "w-full bg-green-600 hover:bg-green-700 text-white", size: "lg", children: "Open Workspace" }), _jsx(Button, { onClick: () => navigate('/active-donations'), variant: "outline", className: "w-full", size: "lg", children: "View Active Donations" }), _jsx(Button, { onClick: () => navigate('/map'), variant: "outline", className: "w-full", size: "lg", children: "Open Map View" }), _jsx(Button, { onClick: () => navigate('/analytics'), variant: "outline", className: "w-full", size: "lg", children: "View Analytics" })] }) })] })] }), _jsxs(Card, { className: "mt-6", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: roleGuide.title }) }), _jsxs(CardContent, { className: "flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4", children: [_jsx("div", { children: _jsx("p", { className: "text-gray-700", children: roleGuide.description }) }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-3 lg:min-w-fit", children: [_jsx(Button, { onClick: roleGuide.primaryAction, className: "bg-green-600 hover:bg-green-700 text-white", children: roleGuide.primaryLabel }), _jsx(Button, { onClick: roleGuide.secondaryAction, variant: "outline", children: roleGuide.secondaryLabel })] })] })] })] })] }));
}
