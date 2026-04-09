import { acceptDonation, createDonation, getBootstrap, login, updateDonationStatus } from './api';
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
describe('donation lifecycle happy path', () => {
    it('completes donor -> NGO -> volunteer workflow end-to-end via API client', async () => {
        const users = {
            donor: {
                id: 'user-donor',
                role: 'donor',
                email: 'donor@nourishnet.local',
                firstName: 'Donor',
                lastName: 'User',
                phone: '999',
                address: 'North',
                organization: 'Donor Org',
                password: 'password123',
            },
            ngo: {
                id: 'user-ngo',
                role: 'ngo',
                email: 'ngo@nourishnet.local',
                firstName: 'Ngo',
                lastName: 'User',
                phone: '888',
                address: 'Central',
                organization: 'NGO Org',
                password: 'password123',
            },
            volunteer: {
                id: 'user-volunteer',
                role: 'volunteer',
                email: 'volunteer@nourishnet.local',
                firstName: 'Volunteer',
                lastName: 'User',
                phone: '777',
                address: 'South',
                organization: 'Volunteer Org',
                password: 'password123',
            },
        };
        const sessions = new Map();
        const donations = [];
        global.fetch = vi.fn(async (input, init) => {
            const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : String(input);
            const path = url.replace(/^https?:\/\/[^/]+/, '');
            const method = (init?.method ?? 'GET').toUpperCase();
            const auth = init?.headers?.Authorization;
            const token = auth?.replace('Bearer ', '');
            const currentUserId = token ? sessions.get(token) : undefined;
            const currentUser = currentUserId ? Object.values(users).find((user) => user.id === currentUserId) : undefined;
            if (path === '/api/auth/login' && method === 'POST') {
                const body = JSON.parse(String(init?.body ?? '{}'));
                const user = Object.values(users).find((candidate) => candidate.email === body.email && candidate.password === body.password);
                if (!user)
                    return jsonResponse({ message: 'Invalid email or password' }, 401);
                const newToken = `token-${user.role}`;
                sessions.set(newToken, user.id);
                const { password, ...safeUser } = user;
                return jsonResponse({ token: newToken, user: safeUser });
            }
            if (!currentUser) {
                return jsonResponse({ message: 'Authentication required' }, 401);
            }
            if (path === '/api/bootstrap' && method === 'GET') {
                const visible = donations.filter((donation) => {
                    if (currentUser.role === 'ngo')
                        return true;
                    if (currentUser.role === 'donor')
                        return donation.donorUserId === currentUser.id;
                    return donation.volunteerId === currentUser.id;
                });
                return jsonResponse({
                    user: currentUser,
                    donations: visible,
                    ngos: [{ id: 'ngo-1', name: 'NGO Org', location: 'Central', lat: 28.61, lng: 77.2 }],
                    platformAnalytics: {
                        totalDonations: donations.length,
                        openDonations: donations.filter((donation) => donation.status !== 'delivered').length,
                        deliveredDonations: donations.filter((donation) => donation.status === 'delivered').length,
                        foodWeightKg: 0,
                        mealsCount: 0,
                        itemCount: 0,
                        averagePickupTime: null,
                        averageDeliveryTime: null,
                        totalPartnerNGOs: 1,
                        trackedWeightDonations: 0,
                        trackedMealDonations: 0,
                        categoryDistribution: [],
                        activeNGOsByZone: [],
                    },
                });
            }
            if (path === '/api/donations' && method === 'POST') {
                if (currentUser.role !== 'donor')
                    return jsonResponse({ message: 'Only donors can create donations' }, 403);
                const body = JSON.parse(String(init?.body ?? '{}'));
                const donation = {
                    id: `donation-${donations.length + 1}`,
                    status: 'pending',
                    donorUserId: currentUser.id,
                    donorName: currentUser.organization,
                    pickupLat: 28.61,
                    pickupLng: 77.2,
                    history: [],
                    ...body,
                };
                donations.push(donation);
                return jsonResponse(donation, 201);
            }
            if (path.match(/^\/api\/donations\/[^/]+\/accept$/) && method === 'POST') {
                if (currentUser.role !== 'ngo')
                    return jsonResponse({ message: 'Only NGOs can accept donations' }, 403);
                const donationId = path.split('/')[3];
                const donation = donations.find((item) => item.id === donationId);
                if (!donation)
                    return jsonResponse({ message: 'Donation not found' }, 404);
                donation.status = 'accepted';
                donation.acceptedByUserId = currentUser.id;
                donation.acceptedBy = currentUser.organization;
                donation.volunteerId = users.volunteer.id;
                donation.volunteerName = `${users.volunteer.firstName} ${users.volunteer.lastName}`;
                donation.acceptedAt = '2026-04-09T10:00:00.000Z';
                return jsonResponse(donation);
            }
            if (path.match(/^\/api\/donations\/[^/]+\/status$/) && method === 'POST') {
                if (currentUser.role !== 'volunteer')
                    return jsonResponse({ message: 'Only volunteers can update delivery status' }, 403);
                const donationId = path.split('/')[3];
                const donation = donations.find((item) => item.id === donationId);
                if (!donation)
                    return jsonResponse({ message: 'Assigned donation not found' }, 404);
                const body = JSON.parse(String(init?.body ?? '{}'));
                donation.status = body.status;
                if (body.status === 'pickedup')
                    donation.pickedUpAt = '2026-04-09T10:30:00.000Z';
                if (body.status === 'delivered')
                    donation.deliveredAt = '2026-04-09T11:00:00.000Z';
                return jsonResponse(donation);
            }
            return jsonResponse({ message: `Unhandled ${method} ${path}` }, 404);
        });
        const donorLogin = await login(users.donor.email, users.donor.password);
        const ngoLogin = await login(users.ngo.email, users.ngo.password);
        const volunteerLogin = await login(users.volunteer.email, users.volunteer.password);
        const createdDonation = await createDonation(donorLogin.token, {
            foodName: 'Veg Meals',
            isVeg: true,
            quantity: '25 servings',
            category: 'green',
            cookedTime: '2026-04-09T09:00:00.000Z',
            safeUntil: '2026-04-09T15:00:00.000Z',
            location: 'North Block',
        });
        const acceptedDonation = await acceptDonation(ngoLogin.token, createdDonation.id);
        const pickedUpDonation = await updateDonationStatus(volunteerLogin.token, acceptedDonation.id, 'pickedup');
        const deliveredDonation = await updateDonationStatus(volunteerLogin.token, acceptedDonation.id, 'delivered');
        const donorBootstrap = await getBootstrap(donorLogin.token);
        expect(createdDonation.status).toBe('pending');
        expect(acceptedDonation.status).toBe('accepted');
        expect(pickedUpDonation.status).toBe('pickedup');
        expect(deliveredDonation.status).toBe('delivered');
        expect(donorBootstrap.donations).toHaveLength(1);
        expect(donorBootstrap.donations[0].status).toBe('delivered');
    });
});
