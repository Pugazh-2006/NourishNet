export function inferZone(address) {
    const value = address.toLowerCase();
    if (value.includes('north'))
        return 'North';
    if (value.includes('south'))
        return 'South';
    if (value.includes('east'))
        return 'East';
    if (value.includes('west'))
        return 'West';
    return 'Central';
}
export function parseQuantityMetrics(quantity) {
    const raw = quantity.trim().toLowerCase();
    const numericMatch = raw.match(/(\d+(?:\.\d+)?)/);
    if (!numericMatch) {
        return { foodWeightKg: 0, mealsCount: 0, itemCount: 0, hasWeightData: false, hasMealData: false };
    }
    const value = Number(numericMatch[1]);
    if (!Number.isFinite(value)) {
        return { foodWeightKg: 0, mealsCount: 0, itemCount: 0, hasWeightData: false, hasMealData: false };
    }
    if (/(^|\s)(kg|kgs|kilogram|kilograms)(\s|$)/.test(raw)) {
        return { foodWeightKg: value, mealsCount: 0, itemCount: 0, hasWeightData: true, hasMealData: false };
    }
    if (/(^|\s)(g|gm|gram|grams)(\s|$)/.test(raw)) {
        return { foodWeightKg: Number((value / 1000).toFixed(3)), mealsCount: 0, itemCount: 0, hasWeightData: true, hasMealData: false };
    }
    if (/(serving|servings|meal|meals|plate|plates)/.test(raw)) {
        return { foodWeightKg: 0, mealsCount: value, itemCount: 0, hasWeightData: false, hasMealData: true };
    }
    if (/(packet|packets|piece|pieces|box|boxes|container|containers|tray|trays)/.test(raw)) {
        return { foodWeightKg: 0, mealsCount: 0, itemCount: value, hasWeightData: false, hasMealData: false };
    }
    return { foodWeightKg: 0, mealsCount: 0, itemCount: 0, hasWeightData: false, hasMealData: false };
}
export function averageMinutes(values) {
    if (values.length === 0) {
        return null;
    }
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
export function summarizeDonations(donations, ngos) {
    const categoryCounts = {
        red: donations.filter((donation) => donation.category === 'red').length,
        yellow: donations.filter((donation) => donation.category === 'yellow').length,
        green: donations.filter((donation) => donation.category === 'green').length,
    };
    const totalDonations = donations.length;
    const totalForPercent = Math.max(totalDonations, 1);
    const zoneCounts = ngos.reduce((acc, ngo) => {
        const zone = inferZone(ngo.location);
        acc[zone] = (acc[zone] ?? 0) + 1;
        return acc;
    }, {});
    const quantityMetrics = donations.map((donation) => parseQuantityMetrics(donation.quantity));
    const pickupDurations = donations
        .filter((donation) => donation.acceptedAt && donation.pickedUpAt)
        .map((donation) => {
        return Math.round((new Date(donation.pickedUpAt).getTime() - new Date(donation.acceptedAt).getTime()) / 60000);
    });
    const deliveryDurations = donations
        .filter((donation) => donation.pickedUpAt && donation.deliveredAt)
        .map((donation) => {
        return Math.round((new Date(donation.deliveredAt).getTime() - new Date(donation.pickedUpAt).getTime()) / 60000);
    });
    return {
        totalDonations,
        openDonations: donations.filter((donation) => donation.status !== 'delivered').length,
        deliveredDonations: donations.filter((donation) => donation.status === 'delivered').length,
        foodWeightKg: Number(quantityMetrics.reduce((sum, item) => sum + item.foodWeightKg, 0).toFixed(2)),
        mealsCount: quantityMetrics.reduce((sum, item) => sum + item.mealsCount, 0),
        itemCount: quantityMetrics.reduce((sum, item) => sum + item.itemCount, 0),
        averagePickupTime: averageMinutes(pickupDurations),
        averageDeliveryTime: averageMinutes(deliveryDurations),
        totalPartnerNGOs: ngos.length,
        trackedWeightDonations: quantityMetrics.filter((item) => item.hasWeightData).length,
        trackedMealDonations: quantityMetrics.filter((item) => item.hasMealData).length,
        categoryDistribution: [
            { name: 'High Priority', value: Math.round((categoryCounts.red / totalForPercent) * 100), count: categoryCounts.red, fill: '#ef4444' },
            { name: 'Medium Priority', value: Math.round((categoryCounts.yellow / totalForPercent) * 100), count: categoryCounts.yellow, fill: '#eab308' },
            { name: 'Low Priority', value: Math.round((categoryCounts.green / totalForPercent) * 100), count: categoryCounts.green, fill: '#22c55e' },
        ],
        activeNGOsByZone: Object.entries(zoneCounts).map(([zone, count]) => ({ zone, count })),
    };
}
