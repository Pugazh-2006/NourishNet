const relativeDate = (hoursFromNow) => {
    const date = new Date();
    date.setHours(date.getHours() + hoursFromNow);
    return date.toISOString().slice(0, 16);
};
export const initialFoodPosts = [
    {
        id: '1',
        foodName: 'Fresh Biryani',
        isVeg: false,
        quantity: '50 servings',
        category: 'red',
        cookedTime: relativeDate(-1),
        safeUntil: relativeDate(2),
        location: 'Downtown Restaurant',
        donorName: 'Taj Restaurant',
        distance: 2.3,
        status: 'pending',
    },
    {
        id: '2',
        foodName: 'Packaged Snacks',
        isVeg: true,
        quantity: '100 packets',
        category: 'green',
        cookedTime: relativeDate(-6),
        safeUntil: relativeDate(36),
        location: 'Event Center',
        donorName: 'Tech Conference',
        distance: 5.8,
        status: 'accepted',
        acceptedBy: 'Hope Foundation',
    },
    {
        id: '3',
        foodName: 'Mixed Vegetables Curry',
        isVeg: true,
        quantity: '30 servings',
        category: 'yellow',
        cookedTime: relativeDate(-4),
        safeUntil: relativeDate(5),
        location: 'Wedding Hall',
        donorName: 'Grand Banquet',
        distance: 4.1,
        status: 'pickedup',
        acceptedBy: 'Serve India',
        volunteerId: 'V001',
    },
    {
        id: '4',
        foodName: 'Sandwiches & Wraps',
        isVeg: true,
        quantity: '40 pieces',
        category: 'red',
        cookedTime: relativeDate(-2),
        safeUntil: relativeDate(1),
        location: 'Corporate Office',
        donorName: 'Tech Corp',
        distance: 1.5,
        status: 'pending',
    },
];
export const initialNGOs = [
    { id: 'n1', name: 'Hope Foundation', location: 'Central Chennai', lat: 13.0827, lng: 80.2707 },
    { id: 'n2', name: 'Serve India', location: 'East Chennai', lat: 13.0569, lng: 80.2962 },
    { id: 'n3', name: 'Food Angels', location: 'West Chennai', lat: 13.0784, lng: 80.2137 },
    { id: 'n4', name: 'Care & Share', location: 'North Chennai', lat: 13.1411, lng: 80.2918 },
    { id: 'n5', name: 'Helping Hands', location: 'South Chennai', lat: 12.9716, lng: 80.2214 },
];
export const defaultProfile = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@email.com',
    phone: '+91 98765 43210',
    address: 'Chennai, Tamil Nadu, India',
    organization: 'FoodDonor Community',
};
