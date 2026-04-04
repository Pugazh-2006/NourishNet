import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, MapPin, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { TopNav } from '../components/TopNav';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { useAppState } from '../state/AppState';

function buildMapSearchUrl(lat: number, lng: number, label?: string) {
  const query = label ? `${lat},${lng} (${label})` : `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function buildDirectionsUrl(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  return `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&travelmode=driving`;
}

export default function VolunteerPickupPage() {
  const { donations, updateDonationStatus, ngos, isLoading } = useAppState();
  const assignedPickups = donations.filter(
    (post) => post.status === 'accepted' || post.status === 'pickedup',
  );
  const [selectedPickupId, setSelectedPickupId] = useState<string | null>(assignedPickups[0]?.id ?? null);

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
    return (
      <div className="min-h-screen bg-gray-50">
        <TopNav />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-600 text-lg">No pickups assigned at the moment</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentStatus = assignedPickup.status === 'pickedup' ? 'pickedup' : 'assigned';
  const statusSteps = [
    { id: 'assigned', label: 'Assigned', progress: 0 },
    { id: 'pickedup', label: 'Picked Up', progress: 50 },
    { id: 'delivered', label: 'Delivered', progress: 100 },
  ];
  const currentStepIndex =
    assignedPickup.status === 'delivered'
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
    } catch (error) {
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to confirm delivery');
    }
  };

  const pickupMapUrl = buildMapSearchUrl(assignedPickup.pickupLat, assignedPickup.pickupLng, assignedPickup.location);
  const deliveryMapUrl = deliveryNgo
    ? buildDirectionsUrl(assignedPickup.pickupLat, assignedPickup.pickupLng, deliveryNgo.lat, deliveryNgo.lng)
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Volunteer Pickup</h1>
          <p className="text-gray-600">Manage your assigned pickups and update delivery status</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Assigned Pickups</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignedPickups.map((pickup) => (
              <button
                key={pickup.id}
                type="button"
                onClick={() => setSelectedPickupId(pickup.id)}
                disabled={isLoading}
                className={`rounded-xl border p-4 text-left transition ${
                  pickup.id === assignedPickup.id
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <div className="font-semibold text-gray-900">{pickup.foodName}</div>
                <div className="text-sm text-gray-600 mt-1">{pickup.location}</div>
                <div className="text-sm text-gray-600 mt-2">
                  {pickup.status === 'accepted' ? 'Waiting for pickup' : 'On the way to delivery'}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Delivery Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress value={progressValue} className="h-3" />
              <div className="flex justify-between">
                {statusSteps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`flex flex-col items-center ${
                      index <= currentStepIndex ? 'text-green-600' : 'text-gray-400'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                        index <= currentStepIndex ? 'bg-green-600 text-white' : 'bg-gray-200'
                      }`}
                    >
                      {index < currentStepIndex ? <CheckCircle className="w-5 h-5" /> : index + 1}
                    </div>
                    <span className="text-sm font-medium">{step.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-red-600" />
                Pickup Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-600">Donor</div>
                  <div className="font-semibold">{assignedPickup.donorName}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Address</div>
                  <div className="font-semibold">{assignedPickup.location}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Coordinates</div>
                  <div className="font-semibold">{assignedPickup.pickupLat.toFixed(5)}, {assignedPickup.pickupLng.toFixed(5)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Food Item</div>
                  <div className="font-semibold">{assignedPickup.foodName}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Quantity</div>
                  <div className="font-semibold">{assignedPickup.quantity}</div>
                </div>
                <Button className="w-full" variant="outline" asChild>
                  <a href={pickupMapUrl} target="_blank" rel="noreferrer">
                    <Navigation className="w-4 h-4 mr-2" />
                    Open Pickup in Maps
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-green-600" />
                Delivery Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-600">NGO</div>
                  <div className="font-semibold">{assignedPickup.acceptedBy}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Volunteer</div>
                  <div className="font-semibold">{assignedPickup.volunteerName}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Address</div>
                  <div className="font-semibold">{deliveryNgo?.location || 'Central District Office'}</div>
                </div>
                {deliveryNgo && (
                  <div>
                    <div className="text-sm text-gray-600">Coordinates</div>
                    <div className="font-semibold">{deliveryNgo.lat.toFixed(5)}, {deliveryNgo.lng.toFixed(5)}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-gray-600">Contact</div>
                  <div className="font-semibold">+91 98765 43210</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Estimated Distance</div>
                  <div className="font-semibold">{assignedPickup.distance} km</div>
                </div>
                {deliveryMapUrl ? (
                  <Button className="w-full" variant="outline" asChild>
                    <a href={deliveryMapUrl} target="_blank" rel="noreferrer">
                      <Navigation className="w-4 h-4 mr-2" />
                      Navigate to NGO
                    </a>
                  </Button>
                ) : (
                  <Button className="w-full" variant="outline" disabled>
                    <Navigation className="w-4 h-4 mr-2" />
                    NGO map unavailable
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex gap-4">
              {assignedPickup.status === 'accepted' && (
                <Button
                  onClick={() => void handleConfirmPickup()}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving Pickup...' : 'Confirm Pickup'}
                </Button>
              )}
              {assignedPickup.status === 'pickedup' && (
                <Button
                  onClick={() => void handleConfirmDelivery()}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving Delivery...' : 'Confirm Delivery'}
                </Button>
              )}
              {assignedPickup.status === 'delivered' && (
                <div className="flex-1 text-center">
                  <div className="text-green-600 text-lg font-semibold mb-2">
                    Delivery completed successfully.
                  </div>
                  <p className="text-gray-600">Thank you for your service.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
