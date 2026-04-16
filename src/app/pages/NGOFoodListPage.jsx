import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { Drumstick, Leaf, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { TopNav } from '../components/TopNav';
import { CategoryBadge } from '../components/CategoryBadge';
import { CountdownTimer } from '../components/CountdownTimer';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '../components/ui/select';
import { useAppState } from '../state/AppState';
export default function NGOFoodListPage() {
    const [sortBy, setSortBy] = useState('nearest');
    const [dismissedIds, setDismissedIds] = useState([]);
    const { donations, acceptDonation, profile, isLoading } = useAppState();
    const pendingPosts = useMemo(() => donations.filter((post) => post.status === 'pending' && !dismissedIds.includes(post.id)), [dismissedIds, donations]);
    const sortedPosts = [...pendingPosts].sort((a, b) => {
        if (sortBy === 'nearest') {
            return (a.distance || 0) - (b.distance || 0);
        }
        const priority = { red: 3, yellow: 2, green: 1 };
        return priority[b.category] - priority[a.category];
    });
    const ngoName = profile.organization || 'Your NGO';
    const handleAccept = async (postId, foodName) => {
        const confirmed = window.confirm(`Accept \"${foodName}\" and assign it into the volunteer workflow?`);
        if (!confirmed) {
            return;
        }
        try {
            await acceptDonation(postId);
            toast.success('Food accepted and assigned for volunteer pickup.');
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : 'Unable to accept donation');
        }
    };
    const handleDecline = (postId) => {
        setDismissedIds((current) => [...current, postId]);
        toast.info('Donation hidden from your NGO queue.');
    };
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsx(TopNav, {}), _jsxs("div", { className: "max-w-7xl mx-auto px-4 py-8", children: [_jsxs("div", { className: "mb-8", children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900 mb-2", children: "Nearby Food Donations" }), _jsxs("p", { className: "text-gray-600", children: ["Accept food donations from nearby donors as ", ngoName] })] }), _jsx(Card, { className: "mb-6", children: _jsx(CardContent, { className: "p-4", children: _jsxs("div", { className: "flex items-center gap-4", children: [_jsx("span", { className: "font-medium text-gray-700", children: "Sort by:" }), _jsxs(Select, { value: sortBy, onValueChange: setSortBy, children: [_jsx(SelectTrigger, { className: "w-48", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "nearest", children: "Nearest First" }), _jsx(SelectItem, { value: "priority", children: "Highest Priority" })] })] })] }) }) }), _jsx("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: sortedPosts.map((post) => {
                            const isExpired = new Date(post.safeUntil).getTime() <= Date.now();
                            return (_jsx(Card, { className: "hover:shadow-xl transition-shadow", children: _jsxs(CardContent, { className: "p-6", children: [_jsxs("div", { className: "flex items-start justify-between mb-4 gap-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-xl font-semibold text-gray-900 mb-2", children: post.foodName }), _jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsx(CategoryBadge, { category: post.category }), isExpired && (_jsx("span", { className: "px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700", children: "Expired" }))] })] }), _jsx(CountdownTimer, { targetTime: post.safeUntil })] }), _jsxs("div", { className: "space-y-3 mb-6", children: [_jsxs("div", { className: "flex items-center gap-2 text-gray-600", children: [post.isVeg ? (_jsx(Leaf, { className: "w-4 h-4 text-green-600" })) : (_jsx(Drumstick, { className: "w-4 h-4 text-red-600" })), _jsx("span", { children: post.isVeg ? 'Vegetarian' : 'Non-Vegetarian' })] }), _jsxs("div", { className: "flex items-center gap-2 text-gray-600", children: [_jsx(MapPin, { className: "w-4 h-4" }), _jsxs("span", { children: [post.location, " - ", post.distance, " km away"] })] }), _jsxs("div", { className: "text-gray-600", children: [_jsx("span", { className: "font-medium", children: "Quantity:" }), " ", post.quantity] }), _jsxs("div", { className: "text-gray-600", children: [_jsx("span", { className: "font-medium", children: "Donor:" }), " ", post.donorName] }), post.volunteerName && (_jsxs("div", { className: "text-gray-600", children: [_jsx("span", { className: "font-medium", children: "Volunteer:" }), " ", post.volunteerName] })), _jsxs("div", { className: "text-gray-600", children: [_jsx("span", { className: "font-medium", children: "Cooked:" }), ' ', new Date(post.cookedTime).toLocaleTimeString('en-US', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })] }), isExpired && (_jsx("div", { className: "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700", children: "This donation has passed its safe handling window and cannot be accepted." }))] }), _jsxs("div", { className: "flex gap-3", children: [_jsx(Button, { onClick: () => void handleAccept(post.id, post.foodName), className: "flex-1 bg-green-600 hover:bg-green-700 text-white", disabled: isLoading || isExpired, children: isExpired ? 'Expired' : isLoading ? 'Accepting...' : 'Accept' }), _jsx(Button, { onClick: () => handleDecline(post.id), variant: "outline", className: "flex-1", disabled: isLoading, children: "Decline" })] })] }) }, post.id));
                        }) }), sortedPosts.length === 0 && (_jsx(Card, { children: _jsx(CardContent, { className: "p-12 text-center", children: _jsx("p", { className: "text-gray-600", children: "No pending food donations at the moment" }) }) }))] })] }));
}
