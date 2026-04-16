// @vitest-environment node

import { randomUUID } from 'node:crypto';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJson(baseUrl, route, init = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

describe('account lifecycle backend endpoints', () => {
  const port = 4500 + Math.floor(Math.random() * 400);
  const baseUrl = `http://127.0.0.1:${port}/api`;
  const tempRoot = path.join(tmpdir(), `nourishnet-test-${randomUUID()}`);
  const dbPath = path.join(tempRoot, 'test.db');
  let serverProcess;

  beforeAll(async () => {
    mkdirSync(tempRoot, { recursive: true });

    serverProcess = spawn(process.execPath, ['--no-warnings=ExperimentalWarning', 'server/index.mjs'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(port),
        DB_PATH: dbPath,
      },
      stdio: 'pipe',
    });

    for (let attempt = 0; attempt < 40; attempt += 1) {
      try {
        const response = await fetch(`${baseUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'probe@nourishnet.local', password: 'x' }),
        });
        if (response.status === 401 || response.status === 400 || response.status === 429) {
          return;
        }
      } catch {
        // keep retrying while server boots
      }
      await wait(150);
    }

    throw new Error('Server did not become ready in time');
  }, 15000);

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      await wait(200);
      if (!serverProcess.killed) {
        serverProcess.kill('SIGKILL');
      }
    }
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it('allows new user signup and blocks duplicate accounts', async () => {
    const payload = {
      role: 'donor',
      firstName: 'New',
      lastName: 'Donor',
      email: 'new-donor@nourishnet.local',
      password: 'password123',
      phone: '+91 90000 00001',
      address: 'Central District',
      organization: 'Fresh Foods',
    };

    const first = await requestJson(baseUrl, '/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    expect(first.response.status).toBe(201);
    expect(first.data.user.role).toBe('donor');
    expect(first.data.token).toBeTruthy();

    const duplicate = await requestJson(baseUrl, '/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    expect(duplicate.response.status).toBe(409);
    expect(duplicate.data.error.code).toBe('auth_email_taken');
  });

  it('enforces role-specific profile completeness rules', async () => {
    const ngoMissingOrg = await requestJson(baseUrl, '/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        role: 'ngo',
        firstName: 'Nila',
        lastName: 'Trust',
        email: 'ngo-incomplete@nourishnet.local',
        password: 'password123',
        phone: '+91 90000 00002',
        address: 'East Zone',
        organization: '',
      }),
    });

    expect(ngoMissingOrg.response.status).toBe(400);
    expect(ngoMissingOrg.data.error.code).toBe('validation_incomplete_profile');
    expect(ngoMissingOrg.data.error.details.missing).toContain('organization');

    const volunteerNoOrg = await requestJson(baseUrl, '/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        role: 'volunteer',
        firstName: 'Vik',
        lastName: 'Helper',
        email: 'volunteer-no-org@nourishnet.local',
        password: 'password123',
        phone: '+91 90000 00003',
        address: 'West Zone',
        organization: '',
      }),
    });

    expect(volunteerNoOrg.response.status).toBe(201);
    expect(volunteerNoOrg.data.user.role).toBe('volunteer');
  });

  it('rotates auth on password change and invalidates current session', async () => {
    const signup = await requestJson(baseUrl, '/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        role: 'donor',
        firstName: 'Rotate',
        lastName: 'Me',
        email: 'rotate@nourishnet.local',
        password: 'password123',
        phone: '+91 90000 00004',
        address: 'North Zone',
        organization: 'Rotate Org',
      }),
    });

    expect(signup.response.status).toBe(201);
    const token = signup.data.token;

    const wrongCurrent = await requestJson(baseUrl, '/auth/change-password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPassword: 'wrong', newPassword: 'newpassword123' }),
    });

    expect(wrongCurrent.response.status).toBe(401);
    expect(wrongCurrent.data.error.code).toBe('auth_invalid_current_password');

    const changed = await requestJson(baseUrl, '/auth/change-password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPassword: 'password123', newPassword: 'newpassword123' }),
    });

    expect(changed.response.status).toBe(200);

    const meAfterChange = await requestJson(baseUrl, '/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(meAfterChange.response.status).toBe(401);
    expect(meAfterChange.data.error.code).toBe('auth_required');

    const loginWithNewPassword = await requestJson(baseUrl, '/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'rotate@nourishnet.local', password: 'newpassword123' }),
    });

    expect(loginWithNewPassword.response.status).toBe(200);
    expect(loginWithNewPassword.data.token).toBeTruthy();
  });

  it('rejects profile updates that break role completeness', async () => {
    const signup = await requestJson(baseUrl, '/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        role: 'donor',
        firstName: 'Profile',
        lastName: 'Rule',
        email: 'profile-rule@nourishnet.local',
        password: 'password123',
        phone: '+91 90000 00005',
        address: 'South Zone',
        organization: 'Rule Org',
      }),
    });

    const token = signup.data.token;
    const invalidPatch = await requestJson(baseUrl, '/me', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ organization: '' }),
    });

    expect(invalidPatch.response.status).toBe(400);
    expect(invalidPatch.data.error.code).toBe('validation_incomplete_profile');
  });
});
