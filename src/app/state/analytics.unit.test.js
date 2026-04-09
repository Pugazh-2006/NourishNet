import { averageMinutes, inferZone, parseQuantityMetrics, summarizeDonations } from './analytics';
function makeDonation(overrides = {}) {
    return {
        id: 'donation-1',
        foodName: 'Rice',
        isVeg: true,
        quantity: '10 servings',
        category: 'yellow',
        cookedTime: '2026-04-09T10:00:00.000Z',
        safeUntil: '2026-04-09T16:00:00.000Z',
        location: 'Central District',
        pickupLat: 28.61,
        pickupLng: 77.2,
        donorUserId: 'donor-1',
        donorName: 'Donor One',
        status: 'pending',
        history: [],
        ...overrides,
    };
}
describe('workflow rule helpers', () => {
    it('parses structured quantity units consistently', () => {
        expect(parseQuantityMetrics('12 kg')).toMatchObject({ foodWeightKg: 12, hasWeightData: true, mealsCount: 0, itemCount: 0 });
        expect(parseQuantityMetrics('500 g')).toMatchObject({ foodWeightKg: 0.5, hasWeightData: true });
        expect(parseQuantityMetrics('40 servings')).toMatchObject({ mealsCount: 40, hasMealData: true });
        expect(parseQuantityMetrics('100 packets')).toMatchObject({ itemCount: 100, hasMealData: false, hasWeightData: false });
        expect(parseQuantityMetrics('unknown format')).toMatchObject({ foodWeightKg: 0, mealsCount: 0, itemCount: 0 });
    });
    it('calculates average minutes safely', () => {
        expect(averageMinutes([])).toBeNull();
        expect(averageMinutes([10, 20, 30])).toBe(20);
    });
    it('maps addresses to zones', () => {
        expect(inferZone('North Block')).toBe('North');
        expect(inferZone('East market')).toBe('East');
        expect(inferZone('Unknown place')).toBe('Central');
    });
    it('summarizes donations and analytics metrics', () => {
        const donations = [
            makeDonation({
                id: 'd-1',
                category: 'red',
                quantity: '5 kg',
                status: 'accepted',
                acceptedAt: '2026-04-09T10:00:00.000Z',
                pickedUpAt: '2026-04-09T10:30:00.000Z',
            }),
            makeDonation({
                id: 'd-2',
                category: 'green',
                quantity: '20 servings',
                status: 'delivered',
                acceptedAt: '2026-04-09T09:00:00.000Z',
                pickedUpAt: '2026-04-09T09:20:00.000Z',
                deliveredAt: '2026-04-09T10:00:00.000Z',
            }),
        ];
        const ngos = [
            { id: 'ngo-1', name: 'Hope', location: 'North Zone', lat: 28.1, lng: 77.1 },
            { id: 'ngo-2', name: 'Serve', location: 'Central Zone', lat: 28.2, lng: 77.2 },
        ];
        const summary = summarizeDonations(donations, ngos);
        expect(summary.totalDonations).toBe(2);
        expect(summary.deliveredDonations).toBe(1);
        expect(summary.openDonations).toBe(1);
        expect(summary.foodWeightKg).toBe(5);
        expect(summary.mealsCount).toBe(20);
        expect(summary.averagePickupTime).toBe(25);
        expect(summary.averageDeliveryTime).toBe(40);
        expect(summary.totalPartnerNGOs).toBe(2);
        expect(summary.activeNGOsByZone).toEqual(expect.arrayContaining([
            expect.objectContaining({ zone: 'North', count: 1 }),
            expect.objectContaining({ zone: 'Central', count: 1 }),
        ]));
    });
});
