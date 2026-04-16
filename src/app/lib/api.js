const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export class ApiError extends Error {
  constructor(message, status, extras = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = extras.code || null;
    this.details = extras.details || null;
    this.retryable = Boolean(extras.retryable);
    this.timestamp = extras.timestamp || null;
  }
}

async function request(path, init = {}, token, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError('Cannot reach the NourishNet API. Start `npm run server` and try again.', 0);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const normalizedError = data?.error || {};
    throw new ApiError(
      normalizedError.message || data.message || 'Request failed',
      response.status,
      {
        code: normalizedError.code,
        details: normalizedError.details,
        retryable: normalizedError.retryable,
        timestamp: normalizedError.timestamp,
      },
    );
  }

  return data;
}

export function login(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function signup(payload) {
  return request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function logout(token) {
  return request('/auth/logout', { method: 'POST' }, token);
}

export function changePassword(token, currentPassword, newPassword) {
  return request('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  }, token);
}

export function getBootstrap(token) {
  return request('/bootstrap', {}, token);
}

export function saveProfile(token, profile) {
  return request('/me', {
    method: 'PATCH',
    body: JSON.stringify(profile),
  }, token);
}

export function createDonation(token, donation) {
  return request('/donations', {
    method: 'POST',
    body: JSON.stringify(donation),
  }, token);
}

export function acceptDonation(token, donationId, idempotencyKey) {
  return request(
    `/donations/${donationId}/accept`,
    {
      method: 'POST',
    },
    token,
    { idempotencyKey },
  );
}

export function updateDonationStatus(token, donationId, status, idempotencyKey) {
  return request(
    `/donations/${donationId}/status`,
    {
      method: 'POST',
      body: JSON.stringify({ status }),
    },
    token,
    { idempotencyKey },
  );
}
