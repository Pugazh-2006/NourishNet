import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Filter, Plus } from 'lucide-react';
import { TopNav } from '../components/TopNav';
import { CategoryBadge } from '../components/CategoryBadge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '../components/ui/select';
import { useAppState } from '../state/AppState';
export default function DonorDashboardPage() {
    const navigate = useNavigate();
    const [filterCategory, setFilterCategory] = useState('all');
    const { donations } = useAppState();
    const filteredPosts = donations.filter((post) => {
        return filterCategory === 'all' || post.category === filterCategory;
    });
    const getStatusColor = (status) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-700';
            case 'accepted':
                return 'bg-blue-100 text-blue-700';
            case 'pickedup':
                return 'bg-purple-100 text-purple-700';
            case 'delivered':
                return 'bg-green-100 text-green-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsx(TopNav, {}), _jsxs("div", { className: "max-w-7xl mx-auto px-4 py-8", children: [_jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900 mb-2", children: "Donor Dashboard" }), _jsx("p", { className: "text-gray-600", children: "Manage your food donations and track their status" })] }), _jsxs(Button, { onClick: () => navigate('/post-food'), className: "bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto", size: "lg", children: [_jsx(Plus, { className: "w-5 h-5 mr-2" }), "Post Surplus Food"] })] }), _jsx(Card, { className: "mb-6", children: _jsx(CardContent, { className: "p-4", children: _jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center gap-4", children: [_jsx(Filter, { className: "w-5 h-5 text-gray-600" }), _jsx("span", { className: "font-medium text-gray-700", children: "Filter by Category:" }), _jsxs(Select, { value: filterCategory, onValueChange: setFilterCategory, children: [_jsx(SelectTrigger, { className: "w-full sm:w-48", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "All Categories" }), _jsx(SelectItem, { value: "red", children: "High Priority" }), _jsx(SelectItem, { value: "yellow", children: "Medium Priority" }), _jsx(SelectItem, { value: "green", children: "Low Priority" })] })] })] }) }) }), _jsx("div", { className: "grid grid-cols-1 gap-4", children: filteredPosts.map((post) => (_jsx(Card, { className: "hover:shadow-lg transition-shadow", children: _jsx(CardContent, { className: "p-6", children: _jsxs("div", { className: "flex flex-col md:flex-row md:items-start md:justify-between gap-4", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-4 mb-3 flex-wrap", children: [_jsx("h3", { className: "text-xl font-semibold text-gray-900", children: post.foodName }), _jsx(CategoryBadge, { category: post.category }), _jsx("span", { className: `px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(post.status)}`, children: post.status })] }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600", children: [_jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "Type:" }), " ", post.isVeg ? 'Veg' : 'Non-Veg'] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "Quantity:" }), " ", post.quantity] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "Location:" }), " ", post.location] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium", children: "Safe Until:" }), ' ', new Date(post.safeUntil).toLocaleTimeString('en-US', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                })] })] }), post.acceptedBy && (_jsxs("div", { className: "mt-3 text-sm text-gray-600", children: [_jsx("span", { className: "font-medium", children: "Accepted by:" }), " ", post.acceptedBy] }))] }), _jsx(Button, { onClick: () => navigate(`/tracking/${post.id}`), variant: "outline", className: "w-full md:w-auto", children: "Track" })] }) }) }, post.id))) }), filteredPosts.length === 0 && (_jsx(Card, { children: _jsxs(CardContent, { className: "p-12 text-center", children: [_jsx("p", { className: "text-gray-900 font-medium", children: "No donations match this view yet." }), _jsx("p", { className: "text-gray-600 mt-2", children: "Post your first donation or switch the category filter to see more items." }), _jsx(Button, { onClick: () => navigate('/post-food'), className: "mt-4 bg-green-600 hover:bg-green-700 text-white", children: "Post Surplus Food" })] }) }))] })] }));
}
