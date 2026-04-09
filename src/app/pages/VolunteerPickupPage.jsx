import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, MapPin, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { TopNav } from '../components/TopNav';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { useAppState } from '../state/AppState';
import { ApiError } from '../lib/api';
function buildMapSearchUrl(lat, lng, label) {
    const query = label ? `${lat},${lng} (${label})` : `${lat},${lng}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
function buildDirectionsUrl(fromLat, fromLng, toLat, toLng) {
    return `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&travelmode=driving`;
}
export default function VolunteerPickupPage() {
    const { donations, updateDonationStatus, ngos, isLoading } = useAppState();
    const assignedPickups = donations.filter((post) => post.status === 'accepted' || post.status === 'pickedup');
    const [selectedPickupId, setSelectedPickupId] = useState(assignedPickups[0]?.id ?? null);
    useEffect(() => {
        if (!assignedPickups.some((pickup) => pickup.id === selectedPickupId)) {
            setSelectedPickupId(assignedPickups[0]?.id ?? null);
        }
    }, [assignedPickups, selectedPickupId]);
    const assignedPickup = assignedPickups.find((post) => post.id === selectedPickupId) ?? null;
    const deliveryNgo = useMemo(() => {
        if (!assignedPickup?.acceptedBy) {
            return null;
        }
        return ngos.find((ngo) => ngo.name === assignedPickup.acceptedBy) ?? null;
    }, [assignedPickup?.acceptedBy, ngos]);
    if (!assignedPickup) {
        return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsx(TopNav, {}), _jsx("div", { className: "max-w-7xl mx-auto px-4 py-8", children: _jsx(Card, { children: _jsx(CardContent, { className: "p-12 text-center", children: _jsx("p", { className: "text-gray-600 text-lg", children: "No pickups assigned at the moment" }) }) }) })] }));
    }
    const currentStatus = assignedPickup.status === 'pickedup' ? 'pickedup' : 'assigned';
    const statusSteps = [
        { id: 'assigned', label: 'Assigned', progress: 0 },
        { id: 'pickedup', label: 'Picked Up', progress: 50 },
        { id: 'delivered', label: 'Delivered', progress: 100 },
    ];
    const currentStepIndex = assignedPickup.status === 'delivered'
        ? 2
        : statusSteps.findIndex((step) => step.id === currentStatus);
    const progressValue = statusSteps[currentStepIndex].progress;
    const handleConfirmPickup = async () => {
        const confirmed = window.confirm(`Confirm pickup for \"${assignedPickup.foodName}\" from ${assignedPickup.location}?`);
        if (!confirmed) {
            return;
        }
        try {
            await updateDonationStatus(assignedPickup.id, 'pickedup');
            toast.success('Pickup confirmed. Head to the NGO delivery point.');
        }
        catch (error) {
            if (error instanceof ApiError && error.code === 'stale_state') {
                toast.warning('Pickup status changed by another action. View has been refreshed.');
                return;
            }
            if (error instanceof ApiError && error.code === 'duplicate_in_flight') {
                toast.info('Pickup update already in progress. Please wait.');
                return;
            }
            toast.error(error instanceof Error ? error.message : 'Unable to confirm pickup');
        }
    };
    const handleConfirmDelivery = async () => {
        const confirmed = window.confirm(`Confirm delivery for \"${assignedPickup.foodName}\" to ${assignedPickup.acceptedBy}?`);
        if (!confirmed) {
            return;
        }
        try {
            await updateDonationStatus(assignedPickup.id, 'delivered');
            toast.success('Delivery completed successfully.');
        }
        catch (error) {
            if (error instanceof ApiError && error.code === 'stale_state') {
                toast.warning('Delivery status changed by another action. View has been refreshed.');
                return;
            }
            if (error instanceof ApiError && error.code === 'duplicate_in_flight') {
                toast.info('Delivery update already in progress. Please wait.');
                return;
            }
            toast.error(error instanceof Error ? error.message : 'Unable to confirm delivery');
        }
    };
    const pickupMapUrl = buildMapSearchUrl(assignedPickup.pickupLat, assignedPickup.pickupLng, assignedPickup.location);
    const deliveryMapUrl = deliveryNgo
        ? buildDirectionsUrl(assignedPickup.pickupLat, assignedPickup.pickupLng, deliveryNgo.lat, deliveryNgo.lng)
        : null;
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsx(TopNav, {}), _jsxs("div", { className: "max-w-4xl mx-auto px-4 py-8", children: [_jsxs("div", { className: "mb-8", children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900 mb-2", children: "Volunteer Pickup" }), _jsx("p", { className: "text-gray-600", children: "Manage your assigned pickups and update delivery status" })] }), _jsxs(Card, { className: "mb-6", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Your Assigned Pickups" }) }), _jsx(CardContent, { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: assignedPickups.map((pickup) => (_jsxs("button", { type: "button", onClick: () => setSelectedPickupId(pickup.id), disabled: isLoading, className: `rounded-xl border p-4 text-left transition ${pickup.id === assignedPickup.id
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-gray-200 hover:border-gray-300'} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`, children: [_jsx("div", { className: "font-semibold text-gray-900", children: pickup.foodName }), _jsx("div", { className: "text-sm text-gray-600 mt-1", children: pickup.location }), _jsx("div", { className: "text-sm text-gray-600 mt-2", children: pickup.status === 'accepted' ? 'Waiting for pickup' : 'On the way to delivery' })] }, pickup.id))) })] }), _jsxs(Card, { className: "mb-6", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Delivery Status" }) }), _jsx(CardContent, { children: _jsxs("div", { className: "space-y-4", children: [_jsx(Progress, { value: progressValue, className: "h-3" }), _jsx("div", { className: "flex justify-between", children: statusSteps.map((step, index) => (_jsxs("div", { className: `flex flex-col items-center ${index <= currentStepIndex ? 'text-green-600' : 'text-gray-400'}`, children: [_jsx("div", { className: `w-10 h-10 rounded-full flex items-center justify-center mb-2 ${index <= currentStepIndex ? 'bg-green-600 text-white' : 'bg-gray-200'}`, children: index < currentStepIndex ? _jsx(CheckCircle, { className: "w-5 h-5" }) : index + 1 }), _jsx("span", { className: "text-sm font-medium", children: step.label })] }, step.id))) })] }) })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 mb-6", children: [_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(MapPin, { className: "w-5 h-5 text-red-600" }), "Pickup Location"] }) }), _jsx(CardContent, { children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm text-gray-600", children: "Donor" }), _jsx("div", { className: "font-semibold", children: assignedPickup.donorName })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm text-gray-600", children: "Address" }), _jsx("div", { className: "font-semibold", children: assignedPickup.location })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm text-gray-600", children: "Coordinates" }), _jsxs("div", { className: "font-semibold", children: [assignedPickup.pickupLat.toFixed(5), ", ", assignedPickup.pickupLng.toFixed(5)] })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm text-gray-600", children: "Food Item" }), _jsx("div", { className: "font-semibold", children: assignedPickup.foodName })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm text-gray-600", children: "Quantity" }), _jsx("div", { className: "font-semibold", children: assignedPickup.quantity })] }), _jsx(Button, { className: "w-full", variant: "outline", asChild: true, children: _jsxs("a", { href: pickupMapUrl, target: "_blank", rel: "noreferrer", children: [_jsx(Navigation, { className: "w-4 h-4 mr-2" }), "Open Pickup in Maps"] }) })] }) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(MapPin, { className: "w-5 h-5 text-green-600" }), "Delivery Location"] }) }), _jsx(CardContent, { children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm text-gray-600", children: "NGO" }), _jsx("div", { className: "font-semibold", children: assignedPickup.acceptedBy })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm text-gray-600", children: "Volunteer" }), _jsx("div", { className: "font-semibold", children: assignedPickup.volunteerName })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm text-gray-600", children: "Address" }), _jsx("div", { className: "font-semibold", children: deliveryNgo?.location || 'Central Chennai Office' })] }), deliveryNgo && (_jsxs("div", { children: [_jsx("div", { className: "text-sm text-gray-600", children: "Coordinates" }), _jsxs("div", { className: "font-semibold", children: [deliveryNgo.lat.toFixed(5), ", ", deliveryNgo.lng.toFixed(5)] })] })), _jsxs("div", { children: [_jsx("div", { className: "text-sm text-gray-600", children: "Contact" }), _jsx("div", { className: "font-semibold", children: "+91 98765 43210" })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm text-gray-600", children: "Estimated Distance" }), _jsxs("div", { className: "font-semibold", children: [assignedPickup.distance, " km"] })] }), deliveryMapUrl ? (_jsx(Button, { className: "w-full", variant: "outline", asChild: true, children: _jsxs("a", { href: deliveryMapUrl, target: "_blank", rel: "noreferrer", children: [_jsx(Navigation, { className: "w-4 h-4 mr-2" }), "Navigate to NGO"] }) })) : (_jsxs(Button, { className: "w-full", variant: "outline", disabled: true, children: [_jsx(Navigation, { className: "w-4 h-4 mr-2" }), "NGO map unavailable"] }))] }) })] })] }), _jsx(Card, { children: _jsx(CardContent, { className: "p-6", children: _jsxs("div", { className: "flex gap-4", children: [assignedPickup.status === 'accepted' && (_jsx(Button, { onClick: () => void handleConfirmPickup(), className: "flex-1 bg-green-600 hover:bg-green-700 text-white", size: "lg", disabled: isLoading, children: isLoading ? 'Saving Pickup...' : 'Confirm Pickup' })), assignedPickup.status === 'pickedup' && (_jsx(Button, { onClick: () => void handleConfirmDelivery(), className: "flex-1 bg-green-600 hover:bg-green-700 text-white", size: "lg", disabled: isLoading, children: isLoading ? 'Saving Delivery...' : 'Confirm Delivery' })), assignedPickup.status === 'delivered' && (_jsxs("div", { className: "flex-1 text-center", children: [_jsx("div", { className: "text-green-600 text-lg font-semibold mb-2", children: "Delivery completed successfully." }), _jsx("p", { className: "text-gray-600", children: "Thank you for your service." })] }))] }) }) })] })] }));
}

