import express from 'express';
import cors from 'cors';
import { randomBytes, randomUUID, createHash, scryptSync, timingSafeEqual } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : path.join(__dirname, 'nourishnet.db');
const db = new DatabaseSync(dbPath);
const app = express();
const PORT = Number(process.env.PORT || 4000);
const NOMINATIM_URL = process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org/search';
const GEOCODER_APP_NAME = process.env.GEOCODER_APP_NAME || 'NourishNetLocalDev/1.0';
const GEOCODER_REFERER = process.env.GEOCODER_REFERER || 'http://localhost:5173';
const GEOCODER_TIMEOUT_MS = Number(process.env.GEOCODER_TIMEOUT_MS || 8000);
const ROUTING_API_URL = process.env.ROUTING_API_URL || '';
const ROUTING_TIMEOUT_MS = Number(process.env.ROUTING_TIMEOUT_MS || 7000);
const FALLBACK_SPEED_KMH = Number(process.env.FALLBACK_SPEED_KMH || 28);
const PASSWORD_SCRYPT_N = Number(process.env.PASSWORD_SCRYPT_N || 16384);
const PASSWORD_SCRYPT_R = Number(process.env.PASSWORD_SCRYPT_R || 8);
const PASSWORD_SCRYPT_P = Number(process.env.PASSWORD_SCRYPT_P || 1);
const PASSWORD_SCRYPT_KEYLEN = Number(process.env.PASSWORD_SCRYPT_KEYLEN || 64);
const SESSION_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || 12);
const SESSION_MAX_LIFETIME_HOURS = Number(process.env.SESSION_MAX_LIFETIME_HOURS || 72);
const SESSION_IDLE_EXTENSION_MINUTES = Number(process.env.SESSION_IDLE_EXTENSION_MINUTES || 30);
const LOGIN_MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS || 6);
const LOGIN_WINDOW_MINUTES = Number(process.env.LOGIN_WINDOW_MINUTES || 15);
const LOGIN_LOCK_MINUTES = Number(process.env.LOGIN_LOCK_MINUTES || 20);
const ALLOWED_USER_ROLES = ['donor', 'ngo', 'volunteer'];
const SIGNUP_MIN_PASSWORD_LENGTH = Number(process.env.SIGNUP_MIN_PASSWORD_LENGTH || 8);
let lastGeocodeRequestAt = 0;

app.use(cors());
app.use(express.json());

function nowIso() {
  return new Date().toISOString();
}

function hashPasswordLegacy(password) {
  return createHash('sha256').update(password).digest('hex');
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, PASSWORD_SCRYPT_KEYLEN, {
    N: PASSWORD_SCRYPT_N,
    r: PASSWORD_SCRYPT_R,
    p: PASSWORD_SCRYPT_P,
  });

  return [
    'scrypt',
    PASSWORD_SCRYPT_N,
    PASSWORD_SCRYPT_R,
    PASSWORD_SCRYPT_P,
    salt.toString('base64'),
    derived.toString('base64'),
  ].join('$');
}

function verifyPassword(password, storedHash) {
  if (!storedHash) {
    return { ok: false, needsRehash: false };
  }

  if (!storedHash.startsWith('scrypt$')) {
    return { ok: hashPasswordLegacy(password) === storedHash, needsRehash: true };
  }

  const [, nRaw, rRaw, pRaw, saltBase64, hashBase64] = storedHash.split('$');
  const n = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  const salt = Buffer.from(saltBase64, 'base64');
  const expected = Buffer.from(hashBase64, 'base64');

  const derived = scryptSync(password, salt, expected.length, { N: n, r, p });
  const ok = timingSafeEqual(derived, expected);

  const needsRehash =
    ok && (n !== PASSWORD_SCRYPT_N || r !== PASSWORD_SCRYPT_R || p !== PASSWORD_SCRYPT_P || expected.length !== PASSWORD_SCRYPT_KEYLEN);

  return { ok, needsRehash };
}

function sanitizeUser(user) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

function getUserLabel(user) {
  return user.organization || `${user.firstName} ${user.lastName}`.trim();
}

function inferZone(address) {
  const value = String(address || '').toLowerCase();
  if (value.includes('north')) return 'North';
  if (value.includes('south')) return 'South';
  if (value.includes('east')) return 'East';
  if (value.includes('west')) return 'West';
  return 'Central';
}

function run(statement, params = {}) {
  return db.prepare(statement).run(params);
}

function get(statement, params = {}) {
  return db.prepare(statement).get(params);
}

function all(statement, params = {}) {
  return db.prepare(statement).all(params);
}

function hasColumn(tableName, columnName) {
  const columns = all(`PRAGMA table_info(${tableName})`);
  return columns.some((column) => column.name === columnName);
}

function ensureColumn(tableName, columnName, definition) {
  if (!hasColumn(tableName, columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sendError(res, {
  status,
  code,
  message,
  details = null,
  retryable = false,
}) {
  res.status(status).json({
    ok: false,
    error: {
      code,
      message,
      details,
      retryable,
      timestamp: nowIso(),
    },
  });
}

function getIdempotencyKey(req) {
  const value = String(req.headers['idempotency-key'] || '').trim();
  return value || null;
}

function requireRole(req, res, allowedRoles, actionDescription) {
  if (allowedRoles.includes(req.user.role)) {
    return true;
  }

  sendError(res, {
    status: 403,
    code: 'forbidden_role',
    message: actionDescription,
    details: { allowedRoles, currentRole: req.user.role },
  });
  return false;
}

function loginThrottleKey(req, email) {
  const ip = String(req.ip || req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  return `${ip}::${String(email || '').toLowerCase()}`;
}

function getAuthRateLimit(key) {
  return get('SELECT * FROM auth_rate_limits WHERE key = @key', { key });
}

function clearAuthRateLimit(key) {
  run('DELETE FROM auth_rate_limits WHERE key = @key', { key });
}

function registerFailedLogin(key) {
  const now = new Date();
  const nowValue = nowIso();
  const row = getAuthRateLimit(key);
  const windowStart = addMinutes(now, -LOGIN_WINDOW_MINUTES);

  if (!row || new Date(row.firstFailedAt) < windowStart) {
    run(
      `INSERT INTO auth_rate_limits (key, failedCount, firstFailedAt, lockUntil, updatedAt)
       VALUES (@key, 1, @firstFailedAt, NULL, @updatedAt)
       ON CONFLICT(key)
       DO UPDATE SET failedCount = 1, firstFailedAt = excluded.firstFailedAt, lockUntil = NULL, updatedAt = excluded.updatedAt`,
      { key, firstFailedAt: nowValue, updatedAt: nowValue },
    );
    return;
  }

  const nextFailedCount = row.failedCount + 1;
  const lockUntil = nextFailedCount >= LOGIN_MAX_ATTEMPTS ? addMinutes(now, LOGIN_LOCK_MINUTES).toISOString() : null;
  run(
    `UPDATE auth_rate_limits
     SET failedCount = @failedCount, lockUntil = @lockUntil, updatedAt = @updatedAt
     WHERE key = @key`,
    { key, failedCount: nextFailedCount, lockUntil, updatedAt: nowValue },
  );
}

function getAuthLockState(key) {
  const row = getAuthRateLimit(key);
  if (!row) {
    return { locked: false, retryAfterSeconds: 0 };
  }

  if (row.lockUntil && new Date(row.lockUntil) > new Date()) {
    const retryAfterSeconds = Math.max(1, Math.ceil((new Date(row.lockUntil).getTime() - Date.now()) / 1000));
    return { locked: true, retryAfterSeconds };
  }

  return { locked: false, retryAfterSeconds: 0 };
}

function readIdempotencyEntry(key, userId, path) {
  return get(
    `SELECT statusCode, responseBody
     FROM idempotency_requests
     WHERE requestKey = @requestKey AND userId = @userId AND path = @path`,
    { requestKey: key, userId, path },
  );
}

function saveIdempotencyEntry(key, userId, path, statusCode, payload) {
  run(
    `INSERT INTO idempotency_requests (requestKey, userId, path, statusCode, responseBody, createdAt)
     VALUES (@requestKey, @userId, @path, @statusCode, @responseBody, @createdAt)
     ON CONFLICT(requestKey, userId, path)
     DO UPDATE SET statusCode = excluded.statusCode, responseBody = excluded.responseBody, createdAt = excluded.createdAt`,
    {
      requestKey: key,
      userId,
      path,
      statusCode,
      responseBody: JSON.stringify(payload),
      createdAt: nowIso(),
    },
  );
}

function replayIdempotencyIfAvailable(req, res) {
  const key = getIdempotencyKey(req);
  if (!key || !req.user?.id) {
    return null;
  }

  const existing = readIdempotencyEntry(key, req.user.id, req.path);
  if (!existing) {
    return null;
  }

  const payload = JSON.parse(existing.responseBody || '{}');
  res.setHeader('X-Idempotent-Replay', 'true');
  res.status(existing.statusCode).json(payload);
  return { replayed: true, key };
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRad(lat2 - lat1);
  const deltaLon = toRad(lon2 - lon1);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function normalizeDistanceKm(value) {
  return Number(value.toFixed(2));
}

function estimateEtaMinutesFromDistance(distanceKm) {
  const speed = Math.max(5, FALLBACK_SPEED_KMH);
  const base = (distanceKm / speed) * 60;
  return Math.max(5, Math.round(base + 6));
}

function classifyGeocodeError(error) {
  if (error?.name === 'AbortError') {
    return { code: 'timeout', message: 'Geocoding timed out. A fallback location was used.' };
  }

  if (error?.status === 429) {
    return { code: 'rate_limited', message: 'Geocoding provider is rate-limited right now. A fallback location was used.' };
  }

  if (error?.status && error.status >= 500) {
    return { code: 'provider_unavailable', message: 'Geocoding provider is temporarily unavailable. A fallback location was used.' };
  }

  if (error?.code === 'no_result') {
    return { code: 'no_result', message: 'Address could not be resolved precisely. A fallback location was used.' };
  }

  return { code: 'unknown', message: 'Geocoding failed unexpectedly. A fallback location was used.' };
}

function recordGeocodeEvent(event) {
  run(
    `INSERT INTO geocode_events (id, location, source, reason, at)
     VALUES (@id, @location, @source, @reason, @at)`,
    {
      id: randomUUID(),
      location: event.location,
      source: event.source,
      reason: event.reason || null,
      at: nowIso(),
    },
  );
}

function findNearestNgoDistanceKm(lat, lng) {
  const ngos = listNgos();
  if (ngos.length === 0) {
    return 0;
  }

  const nearest = ngos.reduce((best, ngo) => {
    const distanceKm = haversineKm(lat, lng, ngo.lat, ngo.lng);
    if (!best || distanceKm < best) {
      return distanceKm;
    }
    return best;
  }, null);

  return normalizeDistanceKm(nearest ?? 0);
}

async function getRouteEstimate(fromLat, fromLng, toLat, toLng) {
  const fallbackDistanceKm = normalizeDistanceKm(haversineKm(fromLat, fromLng, toLat, toLng));
  const fallbackEtaMinutes = estimateEtaMinutesFromDistance(fallbackDistanceKm);

  if (!ROUTING_API_URL) {
    return {
      distanceKm: fallbackDistanceKm,
      etaMinutes: fallbackEtaMinutes,
      mode: 'straight-line',
      issue: null,
    };
  }

  const url = new URL(ROUTING_API_URL);
  url.searchParams.set('fromLat', String(fromLat));
  url.searchParams.set('fromLng', String(fromLng));
  url.searchParams.set('toLat', String(toLat));
  url.searchParams.set('toLng', String(toLng));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ROUTING_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      return {
        distanceKm: fallbackDistanceKm,
        etaMinutes: fallbackEtaMinutes,
        mode: 'straight-line',
        issue: `routing_status_${response.status}`,
      };
    }

    const data = await response.json();
    if (typeof data.distanceKm === 'number' && typeof data.etaMinutes === 'number') {
      return {
        distanceKm: normalizeDistanceKm(data.distanceKm),
        etaMinutes: Math.max(1, Math.round(data.etaMinutes)),
        mode: 'provider',
        issue: null,
      };
    }
  } catch {
    return {
      distanceKm: fallbackDistanceKm,
      etaMinutes: fallbackEtaMinutes,
      mode: 'straight-line',
      issue: 'routing_unavailable',
    };
  } finally {
    clearTimeout(timer);
  }

  return {
    distanceKm: fallbackDistanceKm,
    etaMinutes: fallbackEtaMinutes,
    mode: 'straight-line',
    issue: 'routing_invalid_response',
  };
}

function fallbackCoordinates(location) {
  const knownLocations = {
    'Downtown Restaurant': { lat: 13.0449, lng: 80.2338 },
    'Event Center': { lat: 13.0674, lng: 80.2376 },
    'Wedding Hall': { lat: 13.0822, lng: 80.2755 },
    'Corporate Office': { lat: 13.0577, lng: 80.2496 },
  };

  if (knownLocations[location]) {
    return knownLocations[location];
  }

  const baseLat = 13.0827;
  const baseLng = 80.2707;
  const hash = Array.from(location).reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
  return {
    lat: Number((baseLat + ((hash % 20) - 10) * 0.004).toFixed(6)),
    lng: Number((baseLng + ((Math.floor(hash / 20) % 20) - 10) * 0.004).toFixed(6)),
  };
}

async function geocodeAddress(location) {
  const cached = get('SELECT lat, lng FROM geocode_cache WHERE location = @location', { location });
  if (cached) {
    return { lat: cached.lat, lng: cached.lng, source: 'cache', reason: null, warning: null };
  }

  const now = Date.now();
  const elapsed = now - lastGeocodeRequestAt;
  if (elapsed < 1000) {
    await sleep(1000 - elapsed);
  }

  lastGeocodeRequestAt = Date.now();

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set('q', location);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEOCODER_TIMEOUT_MS);
  let response;

  try {
    response = await fetch(url, {
      headers: {
        'User-Agent': GEOCODER_APP_NAME,
        Referer: GEOCODER_REFERER,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const error = new Error(`Geocoding failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) {
    const error = new Error('Address could not be geocoded');
    error.code = 'no_result';
    throw error;
  }

  const first = results[0];
  const coords = {
    lat: Number(first.lat),
    lng: Number(first.lon),
    source: 'nominatim',
    reason: null,
    warning: null,
  };

  run(
    `INSERT INTO geocode_cache (location, lat, lng, provider, createdAt)
     VALUES (@location, @lat, @lng, @provider, @createdAt)
     ON CONFLICT(location) DO UPDATE SET lat = excluded.lat, lng = excluded.lng, provider = excluded.provider, createdAt = excluded.createdAt`,
    {
      location,
      lat: coords.lat,
      lng: coords.lng,
      provider: 'nominatim',
      createdAt: nowIso(),
    },
  );

  return coords;
}

async function resolveCoordinates(location) {
  try {
    const resolved = await geocodeAddress(location);
    recordGeocodeEvent({ location, source: resolved.source, reason: resolved.reason });
    return resolved;
  } catch (error) {
    const classified = classifyGeocodeError(error);
    const fallback = fallbackCoordinates(location);
    recordGeocodeEvent({ location, source: 'fallback', reason: classified.code });
    return { ...fallback, source: 'fallback', reason: classified.code, warning: classified.message };
  }
}

function getGeocodeHealthSummary() {
  const totals = all(
    `SELECT source, COUNT(*) AS count
     FROM geocode_events
     GROUP BY source`,
  );
  const byReason = all(
    `SELECT reason, COUNT(*) AS count
     FROM geocode_events
     WHERE source = 'fallback'
     GROUP BY reason
     ORDER BY count DESC`,
  );

  const totalRequests = totals.reduce((sum, row) => sum + row.count, 0);
  const fallbackCount = totals.find((row) => row.source === 'fallback')?.count ?? 0;
  const cacheCount = totals.find((row) => row.source === 'cache')?.count ?? 0;
  const nominatimCount = totals.find((row) => row.source === 'nominatim')?.count ?? 0;
  const fallbackRate = totalRequests > 0 ? Number(((fallbackCount / totalRequests) * 100).toFixed(2)) : 0;

  return {
    totalRequests,
    fallbackCount,
    cacheCount,
    nominatimCount,
    fallbackRate,
    fallbackReasons: byReason.map((row) => ({ reason: row.reason || 'unknown', count: row.count })),
  };
}

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      organization TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ngos (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS donations (
      id TEXT PRIMARY KEY,
      foodName TEXT NOT NULL,
      isVeg INTEGER NOT NULL,
      quantity TEXT NOT NULL,
      category TEXT NOT NULL,
      cookedTime TEXT NOT NULL,
      safeUntil TEXT NOT NULL,
      location TEXT NOT NULL,
      pickupLat REAL,
      pickupLng REAL,
      distance REAL,
      status TEXT NOT NULL,
      donorUserId TEXT NOT NULL,
      acceptedByUserId TEXT,
      volunteerId TEXT,
      acceptedAt TEXT,
      pickedUpAt TEXT,
      deliveredAt TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (donorUserId) REFERENCES users(id),
      FOREIGN KEY (acceptedByUserId) REFERENCES users(id),
      FOREIGN KEY (volunteerId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS donation_history (
      id TEXT PRIMARY KEY,
      donationId TEXT NOT NULL,
      status TEXT NOT NULL,
      at TEXT NOT NULL,
      note TEXT NOT NULL,
      FOREIGN KEY (donationId) REFERENCES donations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      lastUsedAt TEXT,
      expiresAt TEXT,
      rotatedFrom TEXT,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS geocode_cache (
      location TEXT PRIMARY KEY,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      provider TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS geocode_events (
      id TEXT PRIMARY KEY,
      location TEXT NOT NULL,
      source TEXT NOT NULL,
      reason TEXT,
      at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS idempotency_requests (
      requestKey TEXT NOT NULL,
      userId TEXT NOT NULL,
      path TEXT NOT NULL,
      statusCode INTEGER NOT NULL,
      responseBody TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      PRIMARY KEY (requestKey, userId, path)
    );

    CREATE TABLE IF NOT EXISTS auth_rate_limits (
      key TEXT PRIMARY KEY,
      failedCount INTEGER NOT NULL,
      firstFailedAt TEXT NOT NULL,
      lockUntil TEXT,
      updatedAt TEXT NOT NULL
    );
  `);

  ensureColumn('donations', 'pickupLat', 'REAL');
  ensureColumn('donations', 'pickupLng', 'REAL');
  ensureColumn('donations', 'distance', 'REAL');
  ensureColumn('donations', 'geocodeSource', "TEXT DEFAULT 'unknown'");
  ensureColumn('donations', 'geocodeReason', 'TEXT');
  ensureColumn('sessions', 'lastUsedAt', 'TEXT');
  ensureColumn('sessions', 'expiresAt', 'TEXT');
  ensureColumn('sessions', 'rotatedFrom', 'TEXT');

  const existingUsers = get('SELECT COUNT(*) AS count FROM users');
  if (existingUsers.count === 0) {
    seedDb();
  }

  const rowsWithoutCoords = all('SELECT id, location FROM donations WHERE pickupLat IS NULL OR pickupLng IS NULL');
  rowsWithoutCoords.forEach((row) => {
    const coords = fallbackCoordinates(row.location);
    run('UPDATE donations SET pickupLat = @pickupLat, pickupLng = @pickupLng WHERE id = @id', {
      id: row.id,
      pickupLat: coords.lat,
      pickupLng: coords.lng,
    });
  });

  const rowsWithoutDistance = all('SELECT id, pickupLat, pickupLng FROM donations WHERE distance IS NULL');
  rowsWithoutDistance.forEach((row) => {
    run('UPDATE donations SET distance = @distance WHERE id = @id', {
      id: row.id,
      distance: findNearestNgoDistanceKm(row.pickupLat, row.pickupLng),
    });
  });
}

function seedDb() {
  const createdAt = nowIso();
  const donorId = 'user-donor-1';
  const ngoId = 'user-ngo-1';
  const volunteerId = 'user-volunteer-1';

  [
    {
      id: donorId,
      role: 'donor',
      email: 'donor@nourishnet.local',
      passwordHash: hashPassword('password123'),
      firstName: 'Aarav',
      lastName: 'Sharma',
      phone: '+91 98765 43210',
      address: 'T Nagar, Chennai, Tamil Nadu',
      organization: 'Taj Restaurant',
    },
    {
      id: ngoId,
      role: 'ngo',
      email: 'ngo@nourishnet.local',
      passwordHash: hashPassword('password123'),
      firstName: 'Meera',
      lastName: 'Kapoor',
      phone: '+91 91234 56780',
      address: 'Anna Nagar, Chennai, Tamil Nadu',
      organization: 'Hope Foundation',
    },
    {
      id: volunteerId,
      role: 'volunteer',
      email: 'volunteer@nourishnet.local',
      passwordHash: hashPassword('password123'),
      firstName: 'Rohan',
      lastName: 'Verma',
      phone: '+91 99887 76655',
      address: 'Velachery, Chennai, Tamil Nadu',
      organization: 'City Volunteers',
    },
  ].forEach((user) => {
    run(
      `INSERT INTO users (id, role, email, passwordHash, firstName, lastName, phone, address, organization, createdAt, updatedAt)
       VALUES (@id, @role, @email, @passwordHash, @firstName, @lastName, @phone, @address, @organization, @createdAt, @updatedAt)`,
      { ...user, createdAt, updatedAt: createdAt },
    );
  });
  [
    { id: 'ngo-1', name: 'Hope Foundation', location: 'Central Chennai', lat: 13.0827, lng: 80.2707 },
    { id: 'ngo-2', name: 'Serve India', location: 'East Chennai', lat: 13.0569, lng: 80.2962 },
    { id: 'ngo-3', name: 'Food Angels', location: 'West Chennai', lat: 13.0784, lng: 80.2137 },
    { id: 'ngo-4', name: 'Care & Share', location: 'North Chennai', lat: 13.1411, lng: 80.2918 },
    { id: 'ngo-5', name: 'Helping Hands', location: 'South Chennai', lat: 12.9716, lng: 80.2214 },
  ].forEach((ngo) => {
    run(
      `INSERT INTO ngos (id, name, location, lat, lng, createdAt, updatedAt)
       VALUES (@id, @name, @location, @lat, @lng, @createdAt, @updatedAt)`,
      { ...ngo, createdAt, updatedAt: createdAt },
    );
  });

  const donations = [
    {
      id: 'donation-1', foodName: 'Fresh Biryani', isVeg: 0, quantity: '50 servings', category: 'red',
      cookedTime: '2026-04-04T07:00:00.000Z', safeUntil: '2026-04-04T11:00:00.000Z', location: 'Downtown Restaurant',
      status: 'pending', donorUserId: donorId, acceptedByUserId: null, volunteerId: null, acceptedAt: null, pickedUpAt: null, deliveredAt: null,
      history: [{ status: 'posted', at: '2026-04-04T07:00:00.000Z', note: 'Donation posted by donor' }],
    },
    {
      id: 'donation-2', foodName: 'Packaged Snacks', isVeg: 1, quantity: '100 packets', category: 'green',
      cookedTime: '2026-04-03T22:00:00.000Z', safeUntil: '2026-04-05T14:00:00.000Z', location: 'Event Center',
      status: 'accepted', donorUserId: donorId, acceptedByUserId: ngoId, volunteerId, acceptedAt: '2026-04-04T01:00:00.000Z', pickedUpAt: null, deliveredAt: null,
      history: [
        { status: 'posted', at: '2026-04-03T22:00:00.000Z', note: 'Donation posted by donor' },
        { status: 'accepted', at: '2026-04-04T01:00:00.000Z', note: 'Accepted by Hope Foundation and assigned to Rohan Verma' },
      ],
    },
    {
      id: 'donation-3', foodName: 'Mixed Vegetables Curry', isVeg: 1, quantity: '30 servings', category: 'yellow',
      cookedTime: '2026-04-03T23:30:00.000Z', safeUntil: '2026-04-04T12:30:00.000Z', location: 'Wedding Hall',
      status: 'pickedup', donorUserId: donorId, acceptedByUserId: ngoId, volunteerId, acceptedAt: '2026-04-04T01:30:00.000Z', pickedUpAt: '2026-04-04T03:00:00.000Z', deliveredAt: null,
      history: [
        { status: 'posted', at: '2026-04-03T23:30:00.000Z', note: 'Donation posted by donor' },
        { status: 'accepted', at: '2026-04-04T01:30:00.000Z', note: 'Accepted by Hope Foundation and assigned to Rohan Verma' },
        { status: 'pickedup', at: '2026-04-04T03:00:00.000Z', note: 'Pickup confirmed by volunteer' },
      ],
    },
  ];

  donations.forEach((donation) => {
    const coords = fallbackCoordinates(donation.location);
    const distance = findNearestNgoDistanceKm(coords.lat, coords.lng);
    run(
      `INSERT INTO donations (
        id, foodName, isVeg, quantity, category, cookedTime, safeUntil, location, pickupLat, pickupLng, distance, geocodeSource, geocodeReason, status,
        donorUserId, acceptedByUserId, volunteerId, acceptedAt, pickedUpAt, deliveredAt, createdAt, updatedAt
      ) VALUES (
        @id, @foodName, @isVeg, @quantity, @category, @cookedTime, @safeUntil, @location, @pickupLat, @pickupLng, @distance, @geocodeSource, @geocodeReason, @status,
        @donorUserId, @acceptedByUserId, @volunteerId, @acceptedAt, @pickedUpAt, @deliveredAt, @createdAt, @updatedAt
      )`,
      {
        ...Object.fromEntries(Object.entries(donation).filter(([key]) => key !== 'history')),
        pickupLat: coords.lat,
        pickupLng: coords.lng,
        distance,
        geocodeSource: 'seeded-fallback',
        geocodeReason: 'seed_data',
        createdAt,
        updatedAt: createdAt,
      },
    );

    donation.history.forEach((historyItem) => {
      run(
        `INSERT INTO donation_history (id, donationId, status, at, note)
         VALUES (@id, @donationId, @status, @at, @note)`,
        { id: randomUUID(), donationId: donation.id, status: historyItem.status, at: historyItem.at, note: historyItem.note },
      );
    });
  });
}

function findUserByEmail(email) {
  return get('SELECT * FROM users WHERE lower(email) = lower(@email)', { email });
}

function findUserById(id) {
  return get('SELECT * FROM users WHERE id = @id', { id });
}

function findSession(token) {
  return get('SELECT * FROM sessions WHERE token = @token', { token });
}

function deleteExpiredSessions() {
  run(
    `DELETE FROM sessions
     WHERE expiresAt IS NOT NULL AND expiresAt <= @now`,
    { now: nowIso() },
  );
}

function listNgos() {
  return all('SELECT * FROM ngos ORDER BY name ASC');
}

function getDonationRows(whereClause = '', params = {}) {
  return all(
    `SELECT
      d.*,
      donor.firstName AS donorFirstName,
      donor.lastName AS donorLastName,
      donor.organization AS donorOrganization,
      accepted.firstName AS acceptedFirstName,
      accepted.lastName AS acceptedLastName,
      accepted.organization AS acceptedOrganization,
      volunteer.firstName AS volunteerFirstName,
      volunteer.lastName AS volunteerLastName,
      volunteer.organization AS volunteerOrganization
    FROM donations d
    JOIN users donor ON donor.id = d.donorUserId
    LEFT JOIN users accepted ON accepted.id = d.acceptedByUserId
    LEFT JOIN users volunteer ON volunteer.id = d.volunteerId
    ${whereClause}
    ORDER BY d.createdAt DESC`,
    params,
  );
}

function getDonationHistory(donationId) {
  return all('SELECT status, at, note FROM donation_history WHERE donationId = @donationId ORDER BY at ASC', { donationId });
}

async function serializeDonation(row) {
  let routeEstimate = {
    distanceKm: Number(row.distance ?? 0),
    etaMinutes: estimateEtaMinutesFromDistance(Number(row.distance ?? 0)),
    mode: 'straight-line',
    issue: null,
  };

  if (row.acceptedByUserId) {
    const targetNgo = get('SELECT lat, lng FROM ngos WHERE lower(name) = lower(@name) LIMIT 1', {
      name: row.acceptedOrganization || '',
    });

    if (targetNgo && row.pickupLat !== null && row.pickupLng !== null) {
      routeEstimate = await getRouteEstimate(row.pickupLat, row.pickupLng, targetNgo.lat, targetNgo.lng);
    }
  }

  return {
    id: row.id,
    foodName: row.foodName,
    isVeg: Boolean(row.isVeg),
    quantity: row.quantity,
    category: row.category,
    cookedTime: row.cookedTime,
    safeUntil: row.safeUntil,
    location: row.location,
    pickupLat: row.pickupLat,
    pickupLng: row.pickupLng,
    donorUserId: row.donorUserId,
    donorName: row.donorOrganization || `${row.donorFirstName} ${row.donorLastName}`.trim(),
    distance: routeEstimate.distanceKm,
    etaMinutes: routeEstimate.etaMinutes,
    routeMode: routeEstimate.mode,
    routeIssue: routeEstimate.issue ?? undefined,
    geocodeSource: row.geocodeSource ?? 'unknown',
    geocodeReason: row.geocodeReason ?? undefined,
    status: row.status,
    acceptedByUserId: row.acceptedByUserId ?? undefined,
    acceptedBy: row.acceptedOrganization || (row.acceptedFirstName ? `${row.acceptedFirstName} ${row.acceptedLastName}`.trim() : undefined),
    volunteerId: row.volunteerId ?? undefined,
    volunteerName: row.volunteerFirstName ? `${row.volunteerFirstName} ${row.volunteerLastName}`.trim() : undefined,
    acceptedAt: row.acceptedAt ?? undefined,
    pickedUpAt: row.pickedUpAt ?? undefined,
    deliveredAt: row.deliveredAt ?? undefined,
    history: getDonationHistory(row.id),
  };
}

function parseQuantityMetrics(quantity) {
  const raw = String(quantity || '').trim().toLowerCase();
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

function averageMinutes(values) {
  if (values.length === 0) {
    return null;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function parseStructuredQuantity(quantity) {
  const raw = String(quantity || '').trim().toLowerCase();
  const match = raw.match(/^(\d+(?:\.\d+)?)\s*(servings?|meals?|plates?|packets?|pieces?|boxes?|containers?|trays?|kgs?|kilograms?|g|gm|grams?)$/);
  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return {
    value,
    unit: match[2],
    raw,
  };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function roleRequiredProfileFields(role) {
  if (role === 'volunteer') {
    return ['firstName', 'lastName', 'phone', 'address'];
  }

  return ['firstName', 'lastName', 'phone', 'address', 'organization'];
}

function normalizeProfilePayload(source = {}, fallback = {}) {
  return {
    firstName: String(source.firstName ?? fallback.firstName ?? '').trim(),
    lastName: String(source.lastName ?? fallback.lastName ?? '').trim(),
    phone: String(source.phone ?? fallback.phone ?? '').trim(),
    address: String(source.address ?? fallback.address ?? '').trim(),
    organization: String(source.organization ?? fallback.organization ?? '').trim(),
  };
}

function validateProfileCompleteness(role, profile) {
  const required = roleRequiredProfileFields(role);
  const missing = required.filter((field) => !String(profile[field] || '').trim());
  if (!missing.length) {
    return { ok: true, missing: [] };
  }

  return { ok: false, missing };
}

function buildAnalyticsSummary(donations, ngos) {
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
    .map((donation) => Math.round((new Date(donation.pickedUpAt).getTime() - new Date(donation.acceptedAt).getTime()) / 60000));
  const deliveryDurations = donations
    .filter((donation) => donation.pickedUpAt && donation.deliveredAt)
    .map((donation) => Math.round((new Date(donation.deliveredAt).getTime() - new Date(donation.pickedUpAt).getTime()) / 60000));

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

function donationVisibleToUser(donation, user) {
  if (user.role === 'ngo') return true;
  if (user.role === 'donor') return donation.donorUserId === user.id;
  return donation.volunteerId === user.id;
}

async function requireAuth(req, res, next) {
  deleteExpiredSessions();
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    sendError(res, {
      status: 401,
      code: 'auth_required',
      message: 'Authentication required',
      retryable: false,
    });
    return;
  }

  const token = authHeader.slice('Bearer '.length);
  const session = findSession(token);
  if (!session) {
    sendError(res, {
      status: 401,
      code: 'auth_required',
      message: 'Authentication required',
      retryable: false,
    });
    return;
  }

  const now = new Date();
  if (session.expiresAt && new Date(session.expiresAt) <= now) {
    run('DELETE FROM sessions WHERE token = @token', { token });
    sendError(res, {
      status: 401,
      code: 'session_expired',
      message: 'Session expired. Please sign in again.',
      retryable: false,
    });
    return;
  }

  const user = findUserById(session.userId);
  if (!user) {
    sendError(res, {
      status: 401,
      code: 'auth_required',
      message: 'Authentication required',
      retryable: false,
    });
    return;
  }

  const createdAt = new Date(session.createdAt);
  const maxLifetimeEndsAt = addHours(createdAt, SESSION_MAX_LIFETIME_HOURS);
  const extendedExpiry = addHours(now, SESSION_TTL_HOURS);
  const nextExpiresAt = extendedExpiry < maxLifetimeEndsAt ? extendedExpiry : maxLifetimeEndsAt;
  const shouldExtend = !session.expiresAt || new Date(session.expiresAt).getTime() - now.getTime() < SESSION_IDLE_EXTENSION_MINUTES * 60 * 1000;
  if (shouldExtend) {
    run(
      `UPDATE sessions
       SET lastUsedAt = @lastUsedAt, expiresAt = @expiresAt
       WHERE token = @token`,
      { token, lastUsedAt: now.toISOString(), expiresAt: nextExpiresAt.toISOString() },
    );
  } else {
    run('UPDATE sessions SET lastUsedAt = @lastUsedAt WHERE token = @token', {
      token,
      lastUsedAt: now.toISOString(),
    });
  }

  req.user = user;
  req.token = token;
  next();
}

function listDonationsForUser(user) {
  if (user.role === 'ngo') return Promise.all(getDonationRows().map(serializeDonation));
  if (user.role === 'donor') return Promise.all(getDonationRows('WHERE d.donorUserId = @userId', { userId: user.id }).map(serializeDonation));
  return Promise.all(getDonationRows('WHERE d.volunteerId = @userId', { userId: user.id }).map(serializeDonation));
}

// Mutating endpoint audit:
// - POST /api/auth/signup: unauthenticated, role/profile/password validation + duplicate guard
// - POST /api/auth/login: unauthenticated, credential + rate-limit checks
// - POST /api/auth/change-password: authenticated + current password verification
// - POST /api/auth/logout: authenticated session only
// - PATCH /api/me: authenticated user can mutate only own profile
// - POST /api/donations: donor only
// - POST /api/donations/:id/accept: ngo only
// - POST /api/donations/:id/status: volunteer only + assignment ownership
app.post('/api/auth/signup', (req, res) => {
  const role = String(req.body.role || '').trim().toLowerCase();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const profile = normalizeProfilePayload(req.body);

  if (!ALLOWED_USER_ROLES.includes(role)) {
    sendError(res, {
      status: 400,
      code: 'validation_invalid_role',
      message: 'Role must be donor, ngo, or volunteer',
      details: { role },
    });
    return;
  }

  if (!isValidEmail(email)) {
    sendError(res, {
      status: 400,
      code: 'validation_invalid_email',
      message: 'Email is invalid',
    });
    return;
  }

  if (password.length < SIGNUP_MIN_PASSWORD_LENGTH) {
    sendError(res, {
      status: 400,
      code: 'validation_weak_password',
      message: `Password must be at least ${SIGNUP_MIN_PASSWORD_LENGTH} characters`,
      details: { minLength: SIGNUP_MIN_PASSWORD_LENGTH },
    });
    return;
  }

  const profileValidation = validateProfileCompleteness(role, profile);
  if (!profileValidation.ok) {
    sendError(res, {
      status: 400,
      code: 'validation_incomplete_profile',
      message: 'Profile is incomplete for the selected role',
      details: { role, missing: profileValidation.missing },
    });
    return;
  }

  const existingUser = findUserByEmail(email);
  if (existingUser) {
    sendError(res, {
      status: 409,
      code: 'auth_email_taken',
      message: 'An account with this email already exists',
      retryable: false,
    });
    return;
  }

  const userId = randomUUID();
  const createdAt = new Date();
  try {
    run(
      `INSERT INTO users (id, role, email, passwordHash, firstName, lastName, phone, address, organization, createdAt, updatedAt)
       VALUES (@id, @role, @email, @passwordHash, @firstName, @lastName, @phone, @address, @organization, @createdAt, @updatedAt)`,
      {
        id: userId,
        role,
        email,
        passwordHash: hashPassword(password),
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        address: profile.address,
        organization: profile.organization,
        createdAt: createdAt.toISOString(),
        updatedAt: createdAt.toISOString(),
      },
    );
  } catch (error) {
    if (String(error?.message || '').toLowerCase().includes('unique')) {
      sendError(res, {
        status: 409,
        code: 'auth_email_taken',
        message: 'An account with this email already exists',
        retryable: false,
      });
      return;
    }
    throw error;
  }

  run('DELETE FROM sessions WHERE userId = @userId', { userId });
  const token = randomUUID();
  const expiresAt = addHours(createdAt, SESSION_TTL_HOURS);
  run(
    `INSERT INTO sessions (token, userId, createdAt, lastUsedAt, expiresAt, rotatedFrom)
     VALUES (@token, @userId, @createdAt, @lastUsedAt, @expiresAt, NULL)`,
    {
      token,
      userId,
      createdAt: createdAt.toISOString(),
      lastUsedAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    },
  );

  res.status(201).json({
    token,
    user: sanitizeUser(findUserById(userId)),
    session: {
      expiresAt: expiresAt.toISOString(),
      maxLifetimeHours: SESSION_MAX_LIFETIME_HOURS,
    },
  });
});

app.post('/api/auth/login', (req, res) => {
  deleteExpiredSessions();
  const email = String(req.body.email || '').trim();
  const password = String(req.body.password || '');
  const rateKey = loginThrottleKey(req, email);
  if (!email || !password) {
    sendError(res, {
      status: 400,
      code: 'validation_missing_credentials',
      message: 'Missing email or password',
    });
    return;
  }

  const lockState = getAuthLockState(rateKey);
  if (lockState.locked) {
    res.setHeader('Retry-After', String(lockState.retryAfterSeconds));
    sendError(res, {
      status: 429,
      code: 'auth_rate_limited',
      message: 'Too many failed login attempts. Try again later.',
      details: { retryAfterSeconds: lockState.retryAfterSeconds },
      retryable: true,
    });
    return;
  }

  const user = findUserByEmail(email);
  const verified = verifyPassword(password, user?.passwordHash || '');
  if (!user || !verified.ok) {
    registerFailedLogin(rateKey);
    sendError(res, {
      status: 401,
      code: 'auth_invalid_credentials',
      message: 'Invalid email or password',
      retryable: false,
    });
    return;
  }

  if (verified.needsRehash) {
    run(
      `UPDATE users
       SET passwordHash = @passwordHash, updatedAt = @updatedAt
       WHERE id = @id`,
      { id: user.id, passwordHash: hashPassword(password), updatedAt: nowIso() },
    );
  }

  clearAuthRateLimit(rateKey);

  const previousSessions = all('SELECT token FROM sessions WHERE userId = @userId', { userId: user.id });
  run('DELETE FROM sessions WHERE userId = @userId', { userId: user.id });
  const token = randomUUID();
  const createdAt = new Date();
  const expiresAt = addHours(createdAt, SESSION_TTL_HOURS);
  run(
    `INSERT INTO sessions (token, userId, createdAt, lastUsedAt, expiresAt, rotatedFrom)
     VALUES (@token, @userId, @createdAt, @lastUsedAt, @expiresAt, @rotatedFrom)`,
    {
      token,
      userId: user.id,
      createdAt: createdAt.toISOString(),
      lastUsedAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      rotatedFrom: previousSessions[0]?.token || null,
    },
  );
  res.json({
    token,
    user: sanitizeUser(findUserById(user.id)),
    session: {
      expiresAt: expiresAt.toISOString(),
      maxLifetimeHours: SESSION_MAX_LIFETIME_HOURS,
    },
  });
});

app.post('/api/auth/change-password', requireAuth, (req, res) => {
  const currentPassword = String(req.body.currentPassword || '');
  const nextPassword = String(req.body.newPassword || '');

  if (!currentPassword || !nextPassword) {
    sendError(res, {
      status: 400,
      code: 'validation_missing_password_fields',
      message: 'Current password and new password are required',
    });
    return;
  }

  if (nextPassword.length < SIGNUP_MIN_PASSWORD_LENGTH) {
    sendError(res, {
      status: 400,
      code: 'validation_weak_password',
      message: `Password must be at least ${SIGNUP_MIN_PASSWORD_LENGTH} characters`,
      details: { minLength: SIGNUP_MIN_PASSWORD_LENGTH },
    });
    return;
  }

  if (currentPassword === nextPassword) {
    sendError(res, {
      status: 400,
      code: 'validation_password_reuse',
      message: 'New password must be different from current password',
    });
    return;
  }

  const verification = verifyPassword(currentPassword, req.user.passwordHash);
  if (!verification.ok) {
    sendError(res, {
      status: 401,
      code: 'auth_invalid_current_password',
      message: 'Current password is incorrect',
      retryable: false,
    });
    return;
  }

  run(
    `UPDATE users
     SET passwordHash = @passwordHash, updatedAt = @updatedAt
     WHERE id = @id`,
    { id: req.user.id, passwordHash: hashPassword(nextPassword), updatedAt: nowIso() },
  );
  run('DELETE FROM sessions WHERE userId = @userId', { userId: req.user.id });

  res.status(200).json({ ok: true, message: 'Password updated. Please sign in again.' });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  run('DELETE FROM sessions WHERE token = @token', { token: req.token });
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json(sanitizeUser(req.user));
});

app.patch('/api/me', requireAuth, (req, res) => {
  const normalized = normalizeProfilePayload(req.body, req.user);
  const profileValidation = validateProfileCompleteness(req.user.role, normalized);
  if (!profileValidation.ok) {
    sendError(res, {
      status: 400,
      code: 'validation_incomplete_profile',
      message: 'Profile is incomplete for your role',
      details: { role: req.user.role, missing: profileValidation.missing },
    });
    return;
  }

  const updatedAt = nowIso();
  run(
    `UPDATE users SET firstName = @firstName, lastName = @lastName, phone = @phone, address = @address, organization = @organization, updatedAt = @updatedAt WHERE id = @id`,
    {
      id: req.user.id,
      firstName: normalized.firstName,
      lastName: normalized.lastName,
      phone: normalized.phone,
      address: normalized.address,
      organization: normalized.organization,
      updatedAt,
    },
  );
  res.json(sanitizeUser(findUserById(req.user.id)));
});

app.get('/api/bootstrap', requireAuth, async (req, res) => {
  const ngos = listNgos();
  const visibleDonations = await listDonationsForUser(req.user);
  const platformDonations = await Promise.all(getDonationRows().map(serializeDonation));

  res.json({
    user: sanitizeUser(req.user),
    donations: visibleDonations,
    ngos,
    platformAnalytics: buildAnalyticsSummary(platformDonations, ngos),
    geocodeHealth: getGeocodeHealthSummary(),
  });
});

app.get('/api/donations', requireAuth, async (req, res) => {
  res.json(await listDonationsForUser(req.user));
});

app.get('/api/donations/:id', requireAuth, async (req, res) => {
  const row = getDonationRows('WHERE d.id = @id', { id: req.params.id })[0];
  if (!row) {
    sendError(res, {
      status: 404,
      code: 'donation_not_found',
      message: 'Donation not found',
      details: { donationId: req.params.id },
    });
    return;
  }

  const donation = await serializeDonation(row);
  if (!donationVisibleToUser(donation, req.user)) {
    sendError(res, {
      status: 404,
      code: 'donation_not_found',
      message: 'Donation not found',
      details: { donationId: req.params.id },
    });
    return;
  }

  res.json(donation);
});

app.get('/api/system/geocode-health', requireAuth, (_req, res) => {
  res.json(getGeocodeHealthSummary());
});

app.post('/api/donations', requireAuth, async (req, res) => {
  if (!requireRole(req, res, ['donor'], 'Only donors can create donations')) {
    return;
  }

  const required = ['foodName', 'quantity', 'category', 'cookedTime', 'safeUntil', 'location'];
  const missing = required.filter((field) => !req.body[field]);
  if (missing.length) {
    sendError(res, {
      status: 400,
      code: 'validation_missing_fields',
      message: `Missing required fields: ${missing.join(', ')}`,
      details: { missing },
    });
    return;
  }

  const foodName = String(req.body.foodName || '').trim();
  const quantity = String(req.body.quantity || '').trim();
  const category = String(req.body.category || '').trim();
  const location = String(req.body.location || '').trim();
  const quantityDetails = parseStructuredQuantity(quantity);
  const cookedTime = new Date(String(req.body.cookedTime));
  const safeUntil = new Date(String(req.body.safeUntil));
  const now = new Date();

  if (!foodName || !location) {
    sendError(res, {
      status: 400,
      code: 'validation_required_fields',
      message: 'Food name and pickup location are required',
    });
    return;
  }

  if (!quantityDetails) {
    sendError(res, {
      status: 400,
      code: 'validation_quantity_format',
      message: 'Quantity must use a number and supported unit like "50 servings", "12 kg", or "100 packets"',
    });
    return;
  }

  if (!['red', 'yellow', 'green'].includes(category)) {
    sendError(res, {
      status: 400,
      code: 'validation_invalid_category',
      message: 'Invalid food category',
    });
    return;
  }

  if (Number.isNaN(cookedTime.getTime()) || Number.isNaN(safeUntil.getTime())) {
    sendError(res, {
      status: 400,
      code: 'validation_invalid_datetime',
      message: 'Cooked time and safe-until time must be valid dates',
    });
    return;
  }

  if (cookedTime > now) {
    sendError(res, {
      status: 400,
      code: 'validation_cooked_time_future',
      message: 'Cooked time cannot be in the future',
    });
    return;
  }

  if (safeUntil <= cookedTime) {
    sendError(res, {
      status: 400,
      code: 'validation_safe_until_before_cooked',
      message: 'Safe-until time must be later than cooked time',
    });
    return;
  }

  if (safeUntil <= now) {
    sendError(res, {
      status: 400,
      code: 'validation_already_expired',
      message: 'This donation is already expired. Please choose a future safe-until time.',
    });
    return;
  }

  const id = randomUUID();
  const createdAt = nowIso();
  const coords = await resolveCoordinates(location);
  const deterministicDistance = findNearestNgoDistanceKm(coords.lat, coords.lng);
  run(
    `INSERT INTO donations (
      id, foodName, isVeg, quantity, category, cookedTime, safeUntil, location, pickupLat, pickupLng, distance, geocodeSource, geocodeReason, status,
      donorUserId, acceptedByUserId, volunteerId, acceptedAt, pickedUpAt, deliveredAt, createdAt, updatedAt
    ) VALUES (
      @id, @foodName, @isVeg, @quantity, @category, @cookedTime, @safeUntil, @location, @pickupLat, @pickupLng, @distance, @geocodeSource, @geocodeReason, @status,
      @donorUserId, NULL, NULL, NULL, NULL, NULL, @createdAt, @updatedAt
    )`,
    {
      id,
      foodName,
      isVeg: req.body.isVeg ? 1 : 0,
      quantity,
      category,
      cookedTime: cookedTime.toISOString(),
      safeUntil: safeUntil.toISOString(),
      location,
      pickupLat: coords.lat,
      pickupLng: coords.lng,
      distance: deterministicDistance,
      geocodeSource: coords.source,
      geocodeReason: coords.reason ?? null,
      status: 'pending',
      donorUserId: req.user.id,
      createdAt,
      updatedAt: createdAt,
    },
  );

  run('INSERT INTO donation_history (id, donationId, status, at, note) VALUES (@id, @donationId, @status, @at, @note)', {
    id: randomUUID(),
    donationId: id,
    status: 'posted',
    at: createdAt,
    note: coords.source === 'nominatim' || coords.source === 'cache'
      ? 'Donation posted and geocoded automatically'
      : `Donation posted using fallback location (${coords.reason || 'unknown'})`,
  });

  const created = await serializeDonation(getDonationRows('WHERE d.id = @id', { id })[0]);
  res.status(201).json({
    ...created,
    geocodeWarning: coords.warning || null,
  });
});

app.post('/api/donations/:id/accept', requireAuth, async (req, res) => {
  const replay = replayIdempotencyIfAvailable(req, res);
  if (replay?.replayed) {
    return;
  }

  if (!requireRole(req, res, ['ngo'], 'Only NGOs can accept donations')) {
    return;
  }

  const row = getDonationRows('WHERE d.id = @id', { id: req.params.id })[0];
  if (!row) {
    const payload = {
      ok: false,
      error: {
        code: 'donation_not_found',
        message: 'Donation not found',
        details: { donationId: req.params.id },
        retryable: false,
        timestamp: nowIso(),
      },
    };
    const key = getIdempotencyKey(req);
    if (key) {
      saveIdempotencyEntry(key, req.user.id, req.path, 404, payload);
    }
    res.status(404).json(payload);
    return;
  }

  if (row.status !== 'pending') {
    const payload = {
      ok: false,
      error: {
        code: 'stale_state',
        message: 'Donation state changed before acceptance.',
        details: { expected: 'pending', actual: row.status, donationId: row.id },
        retryable: true,
        timestamp: nowIso(),
      },
    };
    const key = getIdempotencyKey(req);
    if (key) {
      saveIdempotencyEntry(key, req.user.id, req.path, 409, payload);
    }
    res.status(409).json(payload);
    return;
  }

  if (new Date(row.safeUntil).getTime() <= Date.now()) {
    const payload = {
      ok: false,
      error: {
        code: 'donation_expired',
        message: 'This donation has expired and can no longer be accepted',
        details: { donationId: row.id, safeUntil: row.safeUntil },
        retryable: false,
        timestamp: nowIso(),
      },
    };
    const key = getIdempotencyKey(req);
    if (key) {
      saveIdempotencyEntry(key, req.user.id, req.path, 400, payload);
    }
    res.status(400).json(payload);
    return;
  }

  const volunteer = get('SELECT * FROM users WHERE role = @role ORDER BY createdAt ASC LIMIT 1', { role: 'volunteer' });
  const acceptedAt = nowIso();
  run(
    `UPDATE donations SET status = @status, acceptedByUserId = @acceptedByUserId, volunteerId = @volunteerId, acceptedAt = @acceptedAt, updatedAt = @updatedAt WHERE id = @id`,
    { id: req.params.id, status: 'accepted', acceptedByUserId: req.user.id, volunteerId: volunteer?.id ?? null, acceptedAt, updatedAt: acceptedAt },
  );
  run('INSERT INTO donation_history (id, donationId, status, at, note) VALUES (@id, @donationId, @status, @at, @note)', {
    id: randomUUID(), donationId: req.params.id, status: 'accepted', at: acceptedAt, note: volunteer ? `Accepted by ${getUserLabel(req.user)} and assigned to ${volunteer.firstName} ${volunteer.lastName}` : `Accepted by ${getUserLabel(req.user)}`,
  });
  const responsePayload = await serializeDonation(getDonationRows('WHERE d.id = @id', { id: req.params.id })[0]);
  const key = getIdempotencyKey(req);
  if (key) {
    saveIdempotencyEntry(key, req.user.id, req.path, 200, responsePayload);
  }
  res.json(responsePayload);
});

app.post('/api/donations/:id/status', requireAuth, async (req, res) => {
  const replay = replayIdempotencyIfAvailable(req, res);
  if (replay?.replayed) {
    return;
  }

  if (!requireRole(req, res, ['volunteer'], 'Only volunteers can update delivery status')) {
    return;
  }

  const row = getDonationRows('WHERE d.id = @id', { id: req.params.id })[0];
  if (!row || row.volunteerId !== req.user.id) {
    const payload = {
      ok: false,
      error: {
        code: 'assigned_donation_not_found',
        message: 'Assigned donation not found',
        details: { donationId: req.params.id },
        retryable: false,
        timestamp: nowIso(),
      },
    };
    const key = getIdempotencyKey(req);
    if (key) {
      saveIdempotencyEntry(key, req.user.id, req.path, 404, payload);
    }
    res.status(404).json(payload);
    return;
  }

  const nextStatus = String(req.body.status || '');
  if (!['pickedup', 'delivered'].includes(nextStatus)) {
    const payload = {
      ok: false,
      error: {
        code: 'validation_invalid_status',
        message: 'Status must be pickedup or delivered',
        details: { status: nextStatus },
        retryable: false,
        timestamp: nowIso(),
      },
    };
    const key = getIdempotencyKey(req);
    if (key) {
      saveIdempotencyEntry(key, req.user.id, req.path, 400, payload);
    }
    res.status(400).json(payload);
    return;
  }

  if (row.status === nextStatus) {
    const sameStatePayload = await serializeDonation(row);
    const key = getIdempotencyKey(req);
    if (key) {
      saveIdempotencyEntry(key, req.user.id, req.path, 200, sameStatePayload);
    }
    res.json(sameStatePayload);
    return;
  }

  const validTransition = (row.status === 'accepted' && nextStatus === 'pickedup') || (row.status === 'pickedup' && nextStatus === 'delivered');
  if (!validTransition) {
    const payload = {
      ok: false,
      error: {
        code: 'stale_state',
        message: 'Donation state changed before this status update could be applied.',
        details: { expected: nextStatus === 'pickedup' ? 'accepted' : 'pickedup', actual: row.status, requested: nextStatus },
        retryable: true,
        timestamp: nowIso(),
      },
    };
    const key = getIdempotencyKey(req);
    if (key) {
      saveIdempotencyEntry(key, req.user.id, req.path, 409, payload);
    }
    res.status(409).json(payload);
    return;
  }

  if (nextStatus === 'pickedup' && new Date(row.safeUntil).getTime() <= Date.now()) {
    const payload = {
      ok: false,
      error: {
        code: 'donation_expired',
        message: 'This donation has expired before pickup and cannot continue in the workflow',
        details: { donationId: row.id, safeUntil: row.safeUntil },
        retryable: false,
        timestamp: nowIso(),
      },
    };
    const key = getIdempotencyKey(req);
    if (key) {
      saveIdempotencyEntry(key, req.user.id, req.path, 400, payload);
    }
    res.status(400).json(payload);
    return;
  }

  const eventTime = nowIso();
  run(
    `UPDATE donations SET status = @status, pickedUpAt = CASE WHEN @status = 'pickedup' THEN @eventTime ELSE pickedUpAt END, deliveredAt = CASE WHEN @status = 'delivered' THEN @eventTime ELSE deliveredAt END, updatedAt = @eventTime WHERE id = @id`,
    { id: req.params.id, status: nextStatus, eventTime },
  );
  run('INSERT INTO donation_history (id, donationId, status, at, note) VALUES (@id, @donationId, @status, @at, @note)', {
    id: randomUUID(), donationId: req.params.id, status: nextStatus, at: eventTime, note: nextStatus === 'pickedup' ? 'Pickup confirmed by volunteer' : 'Delivery completed by volunteer',
  });
  const responsePayload = await serializeDonation(getDonationRows('WHERE d.id = @id', { id: req.params.id })[0]);
  const key = getIdempotencyKey(req);
  if (key) {
    saveIdempotencyEntry(key, req.user.id, req.path, 200, responsePayload);
  }
  res.json(responsePayload);
});

initDb();

app.listen(PORT, () => {
  console.log(`NourishNet API running on http://localhost:${PORT}`);
  console.log(`SQLite database ready at ${dbPath}`);
});
