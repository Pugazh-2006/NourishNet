import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { toast } from 'sonner';
import { TopNav } from '../components/TopNav';
import { Card, CardContent } from '../components/ui/card';
import { CategoryBadge } from '../components/CategoryBadge';
import { Button } from '../components/ui/button';
import { useAppState } from '../state/AppState';
import { ApiError } from '../lib/api';
export default function ActiveDonationsPage() {
    const { donations, acceptDonation, currentRole, isLoading } = useAppState();
    const activeDonations = donations.filter((p) => p.status === 'pending' || p.status === 'accepted' || p.status === 'pickedup');
    const getStatusBadgeClassName = (status) => {
        if (status === 'pending') {
            return 'bg-amber-100 text-amber-700';
        }
        if (status === 'pickedup') {
            return 'bg-purple-100 text-purple-700';
        }
        return 'bg-blue-100 text-blue-700';
    };
    const handleAccept = async (donationId, foodName) => {
        const confirmed = window.confirm(`Accept \"${foodName}\" and move it into pickup workflow?`);
        if (!confirmed) {
            return;
        }
        try {
            await acceptDonation(donationId);
            toast.success('Food accepted and assigned for volunteer pickup.');
        }
        catch (error) {
            if (error instanceof ApiError && error.code === 'stale_state') {
                toast.warning('This donation was updated by someone else. The list has been refreshed.');
                return;
            }
            if (error instanceof ApiError && error.code === 'duplicate_in_flight') {
                toast.info('Accept request already in progress. Please wait.');
                return;
            }
            toast.error(error instanceof Error ? error.message : 'Unable to accept donation');
        }
    };
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsx(TopNav, {}), _jsxs("div", { className: "max-w-7xl mx-auto px-4 py-8", children: [_jsxs("div", { className: "mb-8", children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900 mb-2", children: "Active Donations" }), _jsx("p", { className: "text-gray-600", children: "View all donations that are open or currently in progress" })] }), _jsx("div", { className: "grid grid-cols-1 gap-4", children: activeDonations.map((post) => {
                            const isExpired = post.status === 'pending' && new Date(post.safeUntil).getTime() <= Date.now();
                            return (_jsx(Card, { className: "hover:shadow-lg transition-shadow", children: _jsx(CardContent, { className: "p-6", children: _jsx("div", { className: "flex items-start justify-between", children: _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-4 mb-3 flex-wrap", children: [_jsx("h3", { className: "text-xl font-semibold text-gray-900", children: post.foodName }), _jsx(CategoryBadge, { category: post.category }), _jsx("span", { className: `px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusBadgeClassName(post.status)}`, children: post.status }), isExpired && (_jsx("span", { className: "px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700", children: "expired" }))] }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-gray-600", children: [_jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "Donor:" }), " ", post.donorName] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "Quantity:" }), " ", post.quantity] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "Location:" }), " ", post.location] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "NGO:" }), " ", post.acceptedBy || 'Awaiting NGO acceptance'] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "Distance:" }), " ", post.distance, " km"] })] }), isExpired && (_jsx("div", { className: "mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700", children: "This donation has expired and can no longer be accepted." })), currentRole === 'ngo' && post.status === 'pending' && (_jsx("div", { className: "mt-5 flex justify-end", children: _jsx(Button, { onClick: () => void handleAccept(post.id, post.foodName), disabled: isLoading || isExpired, className: "bg-green-600 hover:bg-green-700 text-white", children: isExpired ? 'Expired' : isLoading ? 'Accepting...' : 'Accept Donation' }) }))] }) }) }) }, post.id));
                        }) }), activeDonations.length === 0 && (_jsx(Card, { children: _jsx(CardContent, { className: "p-12 text-center", children: _jsx("p", { className: "text-gray-600", children: "No active donations at the moment" }) }) }))] })] }));
}
