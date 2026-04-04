import type { AnalyticsSummary, AppUser, FoodPost, NGO, UserProfile } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError('Cannot reach the NourishNet API. Start `npm run server` and try again.', 0);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.message || 'Request failed', response.status);
  }

  return data as T;
}

export interface LoginResponse {
  token: string;
  user: AppUser;
}

export interface BootstrapResponse {
  user: AppUser;
  donations: FoodPost[];
  ngos: NGO[];
  platformAnalytics: AnalyticsSummary;
}

export function login(email: string, password: string) {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function logout(token: string) {
  return request<{ ok: boolean }>('/auth/logout', { method: 'POST' }, token);
}

export function getBootstrap(token: string) {
  return request<BootstrapResponse>('/bootstrap', {}, token);
}

export function saveProfile(token: string, profile: UserProfile) {
  return request<AppUser>('/me', {
    method: 'PATCH',
    body: JSON.stringify(profile),
  }, token);
}

export function createDonation(
  token: string,
  donation: Omit<FoodPost, 'id' | 'donorUserId' | 'donorName' | 'status' | 'distance' | 'history' | 'pickupLat' | 'pickupLng'>,
) {
  return request<FoodPost>('/donations', {
    method: 'POST',
    body: JSON.stringify(donation),
  }, token);
}

export function acceptDonation(token: string, donationId: string) {
  return request<FoodPost>(`/donations/${donationId}/accept`, {
    method: 'POST',
  }, token);
}

export function updateDonationStatus(token: string, donationId: string, status: FoodPost['status']) {
  return request<FoodPost>(`/donations/${donationId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  }, token);
}
