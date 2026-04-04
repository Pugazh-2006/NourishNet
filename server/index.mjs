import express from 'express';
import cors from 'cors';
import { randomUUID, createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'nourishnet.db');
const db = new DatabaseSync(dbPath);
const app = express();
const PORT = Number(process.env.PORT || 4000);
const NOMINATIM_URL = process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org/search';
const GEOCODER_APP_NAME = process.env.GEOCODER_APP_NAME || 'NourishNetLocalDev/1.0';
const GEOCODER_REFERER = process.env.GEOCODER_REFERER || 'http://localhost:5173';
let lastGeocodeRequestAt = 0;

app.use(cors());
app.use(express.json());

function nowIso() {
  return new Date().toISOString();
}

function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex');
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

function fallbackCoordinates(location) {
  const knownLocations = {
    'Downtown Restaurant': { lat: 28.6128, lng: 77.2182 },
    'Event Center': { lat: 28.6209, lng: 77.2051 },
    'Wedding Hall': { lat: 28.6053, lng: 77.2274 },
    'Corporate Office': { lat: 28.6184, lng: 77.2302 },
  };

  if (knownLocations[location]) {
    return knownLocations[location];
  }

  const baseLat = 28.6139;
  const baseLng = 77.209;
  const hash = Array.from(location).reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
  return {
    lat: Number((baseLat + ((hash % 20) - 10) * 0.004).toFixed(6)),
    lng: Number((baseLng + ((Math.floor(hash / 20) % 20) - 10) * 0.004).toFixed(6)),
  };
}

async function geocodeAddress(location) {
  const cached = get('SELECT lat, lng FROM geocode_cache WHERE location = @location', { location });
  if (cached) {
    return { lat: cached.lat, lng: cached.lng, source: 'cache' };
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

  const response = await fetch(url, {
    headers: {
      'User-Agent': GEOCODER_APP_NAME,
      Referer: GEOCODER_REFERER,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Geocoding failed with status ${response.status}`);
  }

  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error('Address could not be geocoded');
  }

  const first = results[0];
  const coords = {
    lat: Number(first.lat),
    lng: Number(first.lon),
    source: 'nominatim',
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
    return await geocodeAddress(location);
  } catch {
    const fallback = fallbackCoordinates(location);
    return { ...fallback, source: 'fallback' };
  }
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
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS geocode_cache (
      location TEXT PRIMARY KEY,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      provider TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);

  ensureColumn('donations', 'pickupLat', 'REAL');
  ensureColumn('donations', 'pickupLng', 'REAL');

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
      address: 'Connaught Place, New Delhi',
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
      address: 'Central District, New Delhi',
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
      address: 'South District, New Delhi',
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
    { id: 'ngo-1', name: 'Hope Foundation', location: 'Central District', lat: 28.6139, lng: 77.209 },
    { id: 'ngo-2', name: 'Serve India', location: 'East Zone', lat: 28.6229, lng: 77.219 },
    { id: 'ngo-3', name: 'Food Angels', location: 'West Block', lat: 28.6039, lng: 77.199 },
    { id: 'ngo-4', name: 'Care & Share', location: 'North Area', lat: 28.6339, lng: 77.229 },
    { id: 'ngo-5', name: 'Helping Hands', location: 'South District', lat: 28.5939, lng: 77.189 },
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
      cookedTime: '2026-04-04T07:00:00.000Z', safeUntil: '2026-04-04T11:00:00.000Z', location: 'Downtown Restaurant', distance: 2.3,
      status: 'pending', donorUserId: donorId, acceptedByUserId: null, volunteerId: null, acceptedAt: null, pickedUpAt: null, deliveredAt: null,
      history: [{ status: 'posted', at: '2026-04-04T07:00:00.000Z', note: 'Donation posted by donor' }],
    },
    {
      id: 'donation-2', foodName: 'Packaged Snacks', isVeg: 1, quantity: '100 packets', category: 'green',
      cookedTime: '2026-04-03T22:00:00.000Z', safeUntil: '2026-04-05T14:00:00.000Z', location: 'Event Center', distance: 5.8,
      status: 'accepted', donorUserId: donorId, acceptedByUserId: ngoId, volunteerId, acceptedAt: '2026-04-04T01:00:00.000Z', pickedUpAt: null, deliveredAt: null,
      history: [
        { status: 'posted', at: '2026-04-03T22:00:00.000Z', note: 'Donation posted by donor' },
        { status: 'accepted', at: '2026-04-04T01:00:00.000Z', note: 'Accepted by Hope Foundation and assigned to Rohan Verma' },
      ],
    },
    {
      id: 'donation-3', foodName: 'Mixed Vegetables Curry', isVeg: 1, quantity: '30 servings', category: 'yellow',
      cookedTime: '2026-04-03T23:30:00.000Z', safeUntil: '2026-04-04T12:30:00.000Z', location: 'Wedding Hall', distance: 4.1,
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
    run(
      `INSERT INTO donations (
        id, foodName, isVeg, quantity, category, cookedTime, safeUntil, location, pickupLat, pickupLng, distance, status,
        donorUserId, acceptedByUserId, volunteerId, acceptedAt, pickedUpAt, deliveredAt, createdAt, updatedAt
      ) VALUES (
        @id, @foodName, @isVeg, @quantity, @category, @cookedTime, @safeUntil, @location, @pickupLat, @pickupLng, @distance, @status,
        @donorUserId, @acceptedByUserId, @volunteerId, @acceptedAt, @pickedUpAt, @deliveredAt, @createdAt, @updatedAt
      )`,
      { ...Object.fromEntries(Object.entries(donation).filter(([key]) => key !== 'history')), pickupLat: coords.lat, pickupLng: coords.lng, createdAt, updatedAt: createdAt },
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

function serializeDonation(row) {
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
    distance: row.distance,
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
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const token = authHeader.slice('Bearer '.length);
  const session = findSession(token);
  if (!session) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const user = findUserById(session.userId);
  if (!user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  req.user = user;
  req.token = token;
  next();
}

function listDonationsForUser(user) {
  if (user.role === 'ngo') return getDonationRows().map(serializeDonation);
  if (user.role === 'donor') return getDonationRows('WHERE d.donorUserId = @userId', { userId: user.id }).map(serializeDonation);
  return getDonationRows('WHERE d.volunteerId = @userId', { userId: user.id }).map(serializeDonation);
}
app.post('/api/auth/login', (req, res) => {
  const email = String(req.body.email || '').trim();
  const password = String(req.body.password || '');
  if (!email || !password) {
    res.status(400).json({ message: 'Missing email or password' });
    return;
  }

  const user = findUserByEmail(email);
  if (!user || user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ message: 'Invalid email or password' });
    return;
  }

  run('DELETE FROM sessions WHERE userId = @userId', { userId: user.id });
  const token = randomUUID();
  run('INSERT INTO sessions (token, userId, createdAt) VALUES (@token, @userId, @createdAt)', { token, userId: user.id, createdAt: nowIso() });
  res.json({ token, user: sanitizeUser(user) });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  run('DELETE FROM sessions WHERE token = @token', { token: req.token });
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json(sanitizeUser(req.user));
});

app.patch('/api/me', requireAuth, (req, res) => {
  const updatedAt = nowIso();
  run(
    `UPDATE users SET firstName = @firstName, lastName = @lastName, phone = @phone, address = @address, organization = @organization, updatedAt = @updatedAt WHERE id = @id`,
    {
      id: req.user.id,
      firstName: String(req.body.firstName ?? req.user.firstName).trim(),
      lastName: String(req.body.lastName ?? req.user.lastName).trim(),
      phone: String(req.body.phone ?? req.user.phone).trim(),
      address: String(req.body.address ?? req.user.address).trim(),
      organization: String(req.body.organization ?? req.user.organization).trim(),
      updatedAt,
    },
  );
  res.json(sanitizeUser(findUserById(req.user.id)));
});

app.get('/api/bootstrap', requireAuth, (req, res) => {
  const ngos = listNgos();
  const visibleDonations = listDonationsForUser(req.user);
  const platformDonations = getDonationRows().map(serializeDonation);

  res.json({
    user: sanitizeUser(req.user),
    donations: visibleDonations,
    ngos,
    platformAnalytics: buildAnalyticsSummary(platformDonations, ngos),
  });
});

app.get('/api/donations', requireAuth, (req, res) => {
  res.json(listDonationsForUser(req.user));
});

app.get('/api/donations/:id', requireAuth, (req, res) => {
  const row = getDonationRows('WHERE d.id = @id', { id: req.params.id })[0];
  if (!row) {
    res.status(404).json({ message: 'Donation not found' });
    return;
  }

  const donation = serializeDonation(row);
  if (!donationVisibleToUser(donation, req.user)) {
    res.status(404).json({ message: 'Donation not found' });
    return;
  }

  res.json(donation);
});

app.post('/api/donations', requireAuth, async (req, res) => {
  if (req.user.role !== 'donor') {
    res.status(403).json({ message: 'Only donors can create donations' });
    return;
  }

  const required = ['foodName', 'quantity', 'category', 'cookedTime', 'safeUntil', 'location'];
  const missing = required.filter((field) => !req.body[field]);
  if (missing.length) {
    res.status(400).json({ message: `Missing required fields: ${missing.join(', ')}` });
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
    res.status(400).json({ message: 'Food name and pickup location are required' });
    return;
  }

  if (!quantityDetails) {
    res.status(400).json({ message: 'Quantity must use a number and supported unit like "50 servings", "12 kg", or "100 packets"' });
    return;
  }

  if (!['red', 'yellow', 'green'].includes(category)) {
    res.status(400).json({ message: 'Invalid food category' });
    return;
  }

  if (Number.isNaN(cookedTime.getTime()) || Number.isNaN(safeUntil.getTime())) {
    res.status(400).json({ message: 'Cooked time and safe-until time must be valid dates' });
    return;
  }

  if (cookedTime > now) {
    res.status(400).json({ message: 'Cooked time cannot be in the future' });
    return;
  }

  if (safeUntil <= cookedTime) {
    res.status(400).json({ message: 'Safe-until time must be later than cooked time' });
    return;
  }

  if (safeUntil <= now) {
    res.status(400).json({ message: 'This donation is already expired. Please choose a future safe-until time.' });
    return;
  }

  const id = randomUUID();
  const createdAt = nowIso();
  const coords = await resolveCoordinates(location);
  run(
    `INSERT INTO donations (
      id, foodName, isVeg, quantity, category, cookedTime, safeUntil, location, pickupLat, pickupLng, distance, status,
      donorUserId, acceptedByUserId, volunteerId, acceptedAt, pickedUpAt, deliveredAt, createdAt, updatedAt
    ) VALUES (
      @id, @foodName, @isVeg, @quantity, @category, @cookedTime, @safeUntil, @location, @pickupLat, @pickupLng, @distance, @status,
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
      distance: Number((Math.random() * 8 + 1).toFixed(1)),
      status: 'pending',
      donorUserId: req.user.id,
      createdAt,
      updatedAt: createdAt,
    },
  );

  run('INSERT INTO donation_history (id, donationId, status, at, note) VALUES (@id, @donationId, @status, @at, @note)', {
    id: randomUUID(), donationId: id, status: 'posted', at: createdAt, note: coords.source === 'nominatim' ? 'Donation posted and geocoded automatically' : 'Donation posted by donor',
  });

  res.status(201).json(serializeDonation(getDonationRows('WHERE d.id = @id', { id })[0]));
});

app.post('/api/donations/:id/accept', requireAuth, (req, res) => {
  if (req.user.role !== 'ngo') {
    res.status(403).json({ message: 'Only NGOs can accept donations' });
    return;
  }

  const row = getDonationRows('WHERE d.id = @id', { id: req.params.id })[0];
  if (!row) {
    res.status(404).json({ message: 'Donation not found' });
    return;
  }
  if (row.status !== 'pending') {
    res.status(400).json({ message: 'Only pending donations can be accepted' });
    return;
  }

  if (new Date(row.safeUntil).getTime() <= Date.now()) {
    res.status(400).json({ message: 'This donation has expired and can no longer be accepted' });
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
  res.json(serializeDonation(getDonationRows('WHERE d.id = @id', { id: req.params.id })[0]));
});

app.post('/api/donations/:id/status', requireAuth, (req, res) => {
  if (req.user.role !== 'volunteer') {
    res.status(403).json({ message: 'Only volunteers can update delivery status' });
    return;
  }

  const row = getDonationRows('WHERE d.id = @id', { id: req.params.id })[0];
  if (!row || row.volunteerId !== req.user.id) {
    res.status(404).json({ message: 'Assigned donation not found' });
    return;
  }

  const nextStatus = String(req.body.status || '');
  const validTransition = (row.status === 'accepted' && nextStatus === 'pickedup') || (row.status === 'pickedup' && nextStatus === 'delivered');
  if (!validTransition) {
    res.status(400).json({ message: 'Invalid status transition' });
    return;
  }

  if (nextStatus === 'pickedup' && new Date(row.safeUntil).getTime() <= Date.now()) {
    res.status(400).json({ message: 'This donation has expired before pickup and cannot continue in the workflow' });
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
  res.json(serializeDonation(getDonationRows('WHERE d.id = @id', { id: req.params.id })[0]));
});

initDb();

app.listen(PORT, () => {
  console.log(`NourishNet API running on http://localhost:${PORT}`);
  console.log(`SQLite database ready at ${dbPath}`);
});











