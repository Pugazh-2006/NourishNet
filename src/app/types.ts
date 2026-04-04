export type UserRole = 'donor' | 'ngo' | 'volunteer';

export interface DonationHistoryItem {
  status: 'posted' | 'accepted' | 'pickedup' | 'delivered';
  at: string;
  note: string;
}

export interface FoodPost {
  id: string;
  foodName: string;
  isVeg: boolean;
  quantity: string;
  category: 'red' | 'yellow' | 'green';
  cookedTime: string;
  safeUntil: string;
  location: string;
  pickupLat: number;
  pickupLng: number;
  donorUserId: string;
  donorName: string;
  distance?: number;
  status: 'pending' | 'accepted' | 'pickedup' | 'delivered';
  acceptedByUserId?: string;
  acceptedBy?: string;
  volunteerId?: string;
  volunteerName?: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  history: DonationHistoryItem[];
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  organization: string;
}

export interface AppUser extends UserProfile {
  id: string;
  role: UserRole;
}

export interface NGO {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
}

export interface CategoryDistributionItem {
  name: string;
  value: number;
  count: number;
  fill: string;
}

export interface ZoneCountItem {
  zone: string;
  count: number;
}

export interface AnalyticsSummary {
  totalDonations: number;
  openDonations: number;
  deliveredDonations: number;
  foodWeightKg: number;
  mealsCount: number;
  itemCount: number;
  averagePickupTime: number | null;
  averageDeliveryTime: number | null;
  totalPartnerNGOs: number;
  trackedWeightDonations: number;
  trackedMealDonations: number;
  categoryDistribution: CategoryDistributionItem[];
  activeNGOsByZone: ZoneCountItem[];
}
