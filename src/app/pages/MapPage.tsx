import { useMemo, useState } from 'react';
import { Circle, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { TopNav } from '../components/TopNav';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useAppState } from '../state/AppState';

const donorIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const ngoIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRad(lat2 - lat1);
  const deltaLon = toRad(lon2 - lon1);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export default function MapPage() {
  const [selectedCategory, setSelectedCategory] = useState<'red' | 'yellow' | 'green'>('red');
  const [selectedDonationId, setSelectedDonationId] = useState<string | null>(null);
  const { ngos, donations } = useAppState();

  const radiusConfig = {
    red: { radius: 2.5, color: '#ef4444', fillOpacity: 0.18, km: '2-3 km' },
    yellow: { radius: 6, color: '#eab308', fillOpacity: 0.16, km: '5-7 km' },
    green: { radius: 11.5, color: '#22c55e', fillOpacity: 0.14, km: '8-15 km' },
  };

  const visibleDonations = useMemo(() => {
    return donations.filter((donation) => donation.category === selectedCategory);
  }, [donations, selectedCategory]);

  const selectedDonation = useMemo(() => {
    return (
      visibleDonations.find((donation) => donation.id === selectedDonationId) ||
      visibleDonations[0] ||
      donations[0] ||
      null
    );
  }, [donations, selectedDonationId, visibleDonations]);

  const currentRadius = radiusConfig[selectedCategory];

  const ngosInRadius = useMemo(() => {
    if (!selectedDonation) {
      return [];
    }

    return ngos
      .map((ngo) => ({
        ...ngo,
        distanceKm: haversineKm(selectedDonation.pickupLat, selectedDonation.pickupLng, ngo.lat, ngo.lng),
      }))
      .filter((ngo) => ngo.distanceKm <= currentRadius.radius)
      .sort((left, right) => left.distanceKm - right.distanceKm);
  }, [currentRadius.radius, ngos, selectedDonation]);

  const mapCenter: [number, number] = selectedDonation
    ? [selectedDonation.pickupLat, selectedDonation.pickupLng]
    : [28.6139, 77.209];

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Live Radius Map</h1>
          <p className="text-gray-600">View actual donor pickup points and nearby NGOs on a real interactive map.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Select Category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(radiusConfig).map(([category, config]) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category as 'red' | 'yellow' | 'green')}
                  className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                    selectedCategory === category
                      ? 'border-gray-900 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={{ backgroundColor: selectedCategory === category ? `${config.color}14` : 'white' }}
                >
                  <div className="font-semibold capitalize">{category} Priority</div>
                  <div className="text-sm text-gray-600 mt-1">Radius: {config.km}</div>
                </button>
              ))}

              <div className="pt-4 border-t mt-4 space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Donations in Category</div>
                  <div className="text-2xl font-bold text-gray-900">{visibleDonations.length}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">NGOs in Radius</div>
                  <div className="text-2xl font-bold text-green-600">{ngosInRadius.length}</div>
                </div>
              </div>

              <div className="pt-4 border-t mt-4 space-y-2">
                <div className="text-sm font-medium text-gray-700">Select Donation</div>
                {visibleDonations.length === 0 && (
                  <div className="text-sm text-gray-500">No donations for this category yet.</div>
                )}
                {visibleDonations.map((donation) => (
                  <button
                    key={donation.id}
                    type="button"
                    onClick={() => setSelectedDonationId(donation.id)}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      selectedDonation?.id === donation.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{donation.foodName}</div>
                    <div className="text-xs text-gray-600 mt-1">{donation.location}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 overflow-hidden">
            <CardContent className="p-0">
              <div className="h-[620px]">
                <MapContainer center={mapCenter} zoom={12} scrollWheelZoom className="h-full w-full z-0">
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {selectedDonation && (
                    <>
                      <Marker position={[selectedDonation.pickupLat, selectedDonation.pickupLng]} icon={donorIcon}>
                        <Popup>
                          <div className="space-y-1">
                            <div className="font-semibold">{selectedDonation.foodName}</div>
                            <div>{selectedDonation.location}</div>
                            <div>Donor: {selectedDonation.donorName}</div>
                            <div>Quantity: {selectedDonation.quantity}</div>
                          </div>
                        </Popup>
                      </Marker>
                      <Circle
                        center={[selectedDonation.pickupLat, selectedDonation.pickupLng]}
                        radius={currentRadius.radius * 1000}
                        pathOptions={{ color: currentRadius.color, fillColor: currentRadius.color, fillOpacity: currentRadius.fillOpacity }}
                      />
                    </>
                  )}

                  {ngos.map((ngo) => {
                    const inRadius = ngosInRadius.some((item) => item.id === ngo.id);
                    return (
                      <Marker key={ngo.id} position={[ngo.lat, ngo.lng]} icon={ngoIcon} opacity={inRadius ? 1 : 0.6}>
                        <Popup>
                          <div className="space-y-1">
                            <div className="font-semibold">{ngo.name}</div>
                            <div>{ngo.location}</div>
                            <div>{inRadius ? 'Inside current radius' : 'Outside current radius'}</div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {selectedDonation && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Selected Pickup Point</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-700">
                <div><span className="font-medium">Food:</span> {selectedDonation.foodName}</div>
                <div><span className="font-medium">Address:</span> {selectedDonation.location}</div>
                <div><span className="font-medium">Coordinates:</span> {selectedDonation.pickupLat.toFixed(5)}, {selectedDonation.pickupLng.toFixed(5)}</div>
                <div><span className="font-medium">Matching Radius:</span> {currentRadius.km}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Nearby NGOs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {ngosInRadius.length === 0 && (
                  <div className="text-sm text-gray-500">No NGOs are inside the active radius yet.</div>
                )}
                {ngosInRadius.map((ngo) => (
                  <div key={ngo.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="font-medium text-gray-900">{ngo.name}</div>
                    <div className="text-sm text-gray-600">{ngo.location}</div>
                    <div className="text-xs text-gray-500 mt-1">{ngo.distanceKm.toFixed(2)} km away</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
