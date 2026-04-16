import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate, useParams } from 'react-router';
import { CheckCircle, Package, Truck } from 'lucide-react';
import { TopNav } from '../components/TopNav';
import { CategoryBadge } from '../components/CategoryBadge';
import { CountdownTimer } from '../components/CountdownTimer';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useAppState } from '../state/AppState';
export default function TrackingPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { donations } = useAppState();
    const post = donations.find((donation) => donation.id === id);
    if (!post) {
        return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsx(TopNav, {}), _jsx("div", { className: "max-w-7xl mx-auto px-4 py-8", children: _jsx(Card, { children: _jsxs(CardContent, { className: "p-12 text-center", children: [_jsx("p", { className: "text-gray-900 font-medium", children: "Donation not found." }), _jsx("p", { className: "text-gray-600 mt-2", children: "It may have been removed from your current view, or you may have opened an invalid tracking link." }), _jsxs("div", { className: "flex flex-col sm:flex-row justify-center gap-3 mt-4", children: [_jsx(Button, { onClick: () => navigate('/donor-dashboard'), className: "bg-green-600 hover:bg-green-700 text-white", children: "Back To Dashboard" }), _jsx(Button, { onClick: () => navigate('/active-donations'), variant: "outline", children: "View Active Donations" })] })] }) }) })] }));
    }
    const eventMap = new Map(post.history.map((item) => [item.status, item]));
    const timeline = [
        {
            status: 'posted',
            label: 'Posted',
            time: eventMap.get('posted')?.note || new Date(post.cookedTime).toLocaleString(),
            icon: Package,
            completed: true,
            at: eventMap.get('posted')?.at || post.cookedTime,
        },
        {
            status: 'accepted',
            label: 'Accepted',
            time: eventMap.get('accepted')?.note || 'Waiting for NGO response',
            icon: CheckCircle,
            completed: post.status !== 'pending',
            at: eventMap.get('accepted')?.at,
        },
        {
            status: 'pickedup',
            label: 'Picked Up',
            time: eventMap.get('pickedup')?.note || 'Awaiting pickup',
            icon: Truck,
            completed: post.status === 'pickedup' || post.status === 'delivered',
            at: eventMap.get('pickedup')?.at,
        },
        {
            status: 'delivered',
            label: 'Delivered',
            time: eventMap.get('delivered')?.note || 'In progress',
            icon: CheckCircle,
            completed: post.status === 'delivered',
            at: eventMap.get('delivered')?.at,
        },
    ];
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsx(TopNav, {}), _jsxs("div", { className: "max-w-4xl mx-auto px-4 py-8", children: [_jsxs("div", { className: "mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900 mb-2", children: "Donation Tracking" }), _jsx("p", { className: "text-gray-600", children: "Track the status of your food donation" })] }), _jsx(Button, { onClick: () => navigate(-1), variant: "outline", className: "w-full sm:w-auto", children: "Back" })] }), _jsxs(Card, { className: "mb-6", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center justify-between", children: [_jsx("span", { children: post.foodName }), _jsx(CategoryBadge, { category: post.category })] }) }), _jsxs(CardContent, { children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm text-gray-600", children: "Type" }), _jsx("div", { className: "font-semibold", children: post.isVeg ? 'Veg' : 'Non-Veg' })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm text-gray-600", children: "Quantity" }), _jsx("div", { className: "font-semibold", children: post.quantity })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm text-gray-600", children: "Location" }), _jsx("div", { className: "font-semibold", children: post.location })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm text-gray-600", children: "Safe Until" }), _jsx("div", { className: "font-semibold", children: _jsx(CountdownTimer, { targetTime: post.safeUntil }) })] })] }), _jsxs("div", { className: "mt-4 flex flex-col sm:flex-row gap-3", children: [_jsx(Button, { onClick: () => navigate('/donor-dashboard'), variant: "outline", className: "w-full sm:w-auto", children: "Back To My Donations" }), _jsx(Button, { onClick: () => navigate('/map'), variant: "outline", className: "w-full sm:w-auto", children: "Open Map View" })] })] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Delivery Timeline" }) }), _jsx(CardContent, { children: _jsx("div", { className: "relative", children: timeline.map((item, index) => (_jsxs("div", { className: "flex gap-4 pb-8 last:pb-0", children: [index < timeline.length - 1 && (_jsx("div", { className: "absolute left-6 top-12 w-0.5 h-16 bg-gray-200" })), _jsx("div", { className: `relative z-10 w-12 h-12 rounded-full flex items-center justify-center ${item.completed ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-400'}`, children: _jsx(item.icon, { className: "w-6 h-6" }) }), _jsxs("div", { className: "flex-1 pt-2", children: [_jsx("div", { className: "font-semibold text-gray-900 mb-1", children: item.label }), _jsx("div", { className: "text-sm text-gray-600", children: item.time }), item.at && (_jsx("div", { className: "text-xs text-gray-500 mt-1", children: new Date(item.at).toLocaleString() }))] }), _jsx("div", { className: "pt-2", children: item.completed ? (_jsx("span", { className: "text-green-600 text-sm font-medium", children: "Complete" })) : (_jsx("span", { className: "text-gray-400 text-sm font-medium", children: "Pending" })) })] }, item.status))) }) })] }), post.status === 'delivered' && (_jsx(Card, { className: "mt-6 border-green-200 bg-green-50", children: _jsx(CardContent, { className: "p-6", children: _jsxs("div", { className: "text-center", children: [_jsx(CheckCircle, { className: "w-16 h-16 text-green-600 mx-auto mb-4" }), _jsx("h3", { className: "text-xl font-bold text-gray-900 mb-2", children: "Delivery completed successfully" }), _jsx("p", { className: "text-gray-600", children: "Thank you for reducing food waste and helping those in need." })] }) }) }))] })] }));
}
