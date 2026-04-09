import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { TopNav } from '../components/TopNav';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { useAppState } from '../state/AppState';
function isStructuredQuantity(value) {
    return /^(\d+(?:\.\d+)?)\s*(servings?|meals?|plates?|packets?|pieces?|boxes?|containers?|trays?|kgs?|kilograms?|g|gm|grams?)$/i.test(value.trim());
}
export default function PostFoodPage() {
    const navigate = useNavigate();
    const { addDonation, isLoading } = useAppState();
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isVeg, setIsVeg] = useState(true);
    const [formData, setFormData] = useState({
        foodName: '',
        quantity: '',
        cookedTime: '',
        safeUntil: '',
        location: '',
    });
    const categories = [
        { id: 'red', label: 'High Priority', description: 'Fast Spoilage', color: 'border-red-500 bg-red-50 hover:bg-red-100', selectedColor: 'border-red-600 bg-red-100 ring-4 ring-red-200' },
        { id: 'yellow', label: 'Medium Priority', description: 'Moderate Shelf Life', color: 'border-yellow-500 bg-yellow-50 hover:bg-yellow-100', selectedColor: 'border-yellow-600 bg-yellow-100 ring-4 ring-yellow-200' },
        { id: 'green', label: 'Low Priority', description: 'Packed Food', color: 'border-green-500 bg-green-50 hover:bg-green-100', selectedColor: 'border-green-600 bg-green-100 ring-4 ring-green-200' },
    ];
    const quantityIsValid = isStructuredQuantity(formData.quantity);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCategory) {
            toast.error('Please select a food category');
            return;
        }
        if (!quantityIsValid) {
            toast.error('Use a structured quantity like "50 servings", "12 kg", or "100 packets"');
            return;
        }
        const cookedTime = new Date(formData.cookedTime);
        const safeUntil = new Date(formData.safeUntil);
        const now = new Date();
        if (cookedTime > now) {
            toast.error('Cooked time cannot be in the future');
            return;
        }
        if (safeUntil <= cookedTime) {
            toast.error('Safe until time must be later than cooked time');
            return;
        }
        if (safeUntil <= now) {
            toast.error('Safe until time must still be in the future');
            return;
        }
        try {
            const created = await addDonation({ ...formData, category: selectedCategory, isVeg });
            if (created?.geocodeWarning) {
                toast.warning(created.geocodeWarning);
            }
            else {
                toast.success('Food posted successfully with map-ready coordinates.');
            }
            navigate('/donor-dashboard');
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : 'Unable to post donation');
        }
    };
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsx(TopNav, {}), _jsxs("div", { className: "max-w-3xl mx-auto px-4 py-8", children: [_jsxs("div", { className: "mb-8", children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900 mb-2", children: "Post Surplus Food" }), _jsx("p", { className: "text-gray-600", children: "Share details about the food you want to donate" })] }), _jsx(Card, { children: _jsx(CardContent, { className: "p-6", children: _jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "foodName", children: "Food Name *" }), _jsx(Input, { id: "foodName", placeholder: "e.g., Fresh Biryani, Sandwiches", value: formData.foodName, onChange: (e) => setFormData({ ...formData, foodName: e.target.value }), required: true, disabled: isLoading })] }), _jsxs("div", { className: "flex items-center justify-between p-4 bg-gray-50 rounded-lg", children: [_jsxs("div", { children: [_jsx(Label, { children: "Food Type" }), _jsx("p", { className: "text-sm text-gray-600", children: isVeg ? 'Vegetarian' : 'Non-Vegetarian' })] }), _jsx(Switch, { checked: isVeg, onCheckedChange: setIsVeg, disabled: isLoading })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "quantity", children: "Quantity *" }), _jsx(Input, { id: "quantity", placeholder: "e.g., 50 servings, 12 kg, 100 packets", value: formData.quantity, onChange: (e) => setFormData({ ...formData, quantity: e.target.value }), required: true, disabled: isLoading, className: formData.quantity && !quantityIsValid ? 'border-red-500 focus-visible:ring-red-500' : '' }), _jsx("p", { className: `text-sm mt-1 ${formData.quantity && !quantityIsValid ? 'text-red-600' : 'text-gray-500'}`, children: "Use a number plus unit such as servings, kg, g, packets, pieces, boxes, containers, or trays." })] }), _jsxs("div", { children: [_jsx(Label, { className: "mb-3 block", children: "Food Category *" }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: categories.map((category) => (_jsxs("button", { type: "button", onClick: () => setSelectedCategory(category.id), disabled: isLoading, className: `p-4 border-2 rounded-lg text-left transition-all ${selectedCategory === category.id ? category.selectedColor : category.color} ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`, children: [_jsx("div", { className: "font-semibold text-gray-900 mb-1", children: category.label }), _jsx("div", { className: "text-sm text-gray-600", children: category.description })] }, category.id))) })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "cookedTime", children: "Cooked Time *" }), _jsx(Input, { id: "cookedTime", type: "datetime-local", value: formData.cookedTime, onChange: (e) => setFormData({ ...formData, cookedTime: e.target.value }), required: true, disabled: isLoading })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "safeUntil", children: "Safe Until Time *" }), _jsx(Input, { id: "safeUntil", type: "datetime-local", value: formData.safeUntil, onChange: (e) => setFormData({ ...formData, safeUntil: e.target.value }), required: true, disabled: isLoading })] })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "location", children: "Pickup Location *" }), _jsxs("div", { className: "relative", children: [_jsx(Input, { id: "location", placeholder: "e.g., Downtown Restaurant, 123 Main St", value: formData.location, onChange: (e) => setFormData({ ...formData, location: e.target.value }), required: true, className: "pr-10", disabled: isLoading }), _jsx(MapPin, { className: "absolute right-3 top-3 w-5 h-5 text-gray-400" })] }), _jsx("p", { className: "text-sm text-gray-500 mt-1", children: "Use a clear pickup address. The server will try to geocode it automatically for the live map." })] }), _jsxs("div", { className: "flex gap-4", children: [_jsx(Button, { type: "submit", className: "flex-1 bg-green-600 hover:bg-green-700 text-white", size: "lg", disabled: isLoading, children: isLoading ? 'Posting Donation...' : 'Notify Nearby NGOs' }), _jsx(Button, { type: "button", variant: "outline", onClick: () => navigate('/donor-dashboard'), size: "lg", disabled: isLoading, children: "Cancel" })] })] }) }) })] })] }));
}
