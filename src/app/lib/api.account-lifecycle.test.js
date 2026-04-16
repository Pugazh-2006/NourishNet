import { ApiError, changePassword, signup } from './api';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('account lifecycle API client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('submits signup payload to backend', async () => {
    const fetchSpy = vi.fn(async (input, init) => {
      expect(typeof input).toBe('string');
      expect(input.endsWith('/api/auth/signup')).toBe(true);
      expect(init?.method).toBe('POST');

      const payload = JSON.parse(String(init?.body ?? '{}'));
      expect(payload).toMatchObject({
        role: 'donor',
        email: 'new@nourishnet.local',
        firstName: 'New',
        lastName: 'Donor',
      });

      return jsonResponse({ token: 'signup-token', user: { id: 'user-1', role: 'donor' } }, 201);
    });

    global.fetch = fetchSpy;

    const response = await signup({
      role: 'donor',
      firstName: 'New',
      lastName: 'Donor',
      email: 'new@nourishnet.local',
      password: 'password123',
      phone: '+91 90000 00001',
      address: 'Central',
      organization: 'Fresh Foods',
    });

    expect(response.token).toBe('signup-token');
  });

  it('normalizes backend validation errors from signup', async () => {
    global.fetch = vi.fn(async () => jsonResponse({
      ok: false,
      error: {
        code: 'validation_incomplete_profile',
        message: 'Profile is incomplete for the selected role',
        details: { role: 'ngo', missing: ['organization'] },
        retryable: false,
      },
    }, 400));

    await expect(signup({ role: 'ngo' })).rejects.toEqual(expect.objectContaining({
      name: 'ApiError',
      status: 400,
      code: 'validation_incomplete_profile',
    }));
  });

  it('sends bearer token on password change and surfaces auth failures', async () => {
    global.fetch = vi.fn(async (_input, init) => {
      expect(init?.headers?.Authorization).toBe('Bearer token-123');
      return jsonResponse({
        ok: false,
        error: {
          code: 'auth_invalid_current_password',
          message: 'Current password is incorrect',
          retryable: false,
        },
      }, 401);
    });

    try {
      await changePassword('token-123', 'bad-old', 'newpass123');
      throw new Error('expected ApiError');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error.status).toBe(401);
      expect(error.code).toBe('auth_invalid_current_password');
    }
  });
});
