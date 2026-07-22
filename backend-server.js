// ═══════════════════════════════════════════════════════════
// ORBITAL GUARDIAN – Express.js Backend (Firestore)
// Firebase Admin SDK + JWT Auth + Full CRUD Endpoints
// Run: node backend-server.js  OR  npm run dev (nodemon)
// ═══════════════════════════════════════════════════════════

const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'orbital_guardian_secret_key_2025';

// ── CORS ────────────────────────────────────────────────────────────────────
// Allow both localhost and file:// origins (for opening the HTML directly)
app.use(cors({
  origin: (origin, cb) => cb(null, true),
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ── STATE ────────────────────────────────────────────────────────────────────
let db = null;
let dbConnected = false;

// In-memory fallback store (used when Firestore is not configured)
const MEM = {
  users: {
    admin:   { username: 'admin',   password_hash: bcrypt.hashSync('admin123',  8), role: 'admin',   email: 'admin@orbital.io' },
    analyst: { username: 'analyst', password_hash: bcrypt.hashSync('analyst456', 8), role: 'analyst', email: 'analyst@orbital.io' },
  },
  satellites: {},
  space_debris: {},
  collision_predictions: {},
  alerts: {},
  organizations: {
    org_nasa:   { name: 'NASA',   country: 'USA' },
    org_spacex: { name: 'SpaceX', country: 'USA' },
    org_esa:    { name: 'ESA',    country: 'Europe' },
  },
  missions: {},
  launch_vehicles: {},
  launch_events: {},
  maneuvers: {},
  data_logs: {},
  communication_links: {},
  maintenance_records: {},
  tracking_stations: {},
  ai_models: {
    model_1: { name: 'OrbitalNet v2.1',     type: 'Collision Prediction',    accuracy: 94.7, status: 'Active' },
    model_2: { name: 'DebrisTracker Pro',   type: 'Debris Classification',   accuracy: 89.2, status: 'Active' },
    model_3: { name: 'ProximityGuard AI',   type: 'Satellite-to-Satellite',  accuracy: 91.5, status: 'Active' },
    model_4: { name: 'SolarDrag Estimator', type: 'Atmospheric Drag',        accuracy: 88.4, status: 'Active' },
    model_5: { name: 'LaunchTrajectory AI', type: 'Launch Conjunction',      accuracy: 96.1, status: 'Active' },
  },
  simulations: {},
};

// ════════════════════════════════════════════════════════════
// FIREBASE ADMIN INIT
// ════════════════════════════════════════════════════════════
async function initializeDB() {
  try {
    let initialized = false;

    if (process.env.FIREBASE_SERVICE_ACCOUNT && process.env.FIREBASE_SERVICE_ACCOUNT.trim().length > 10) {
      try {
        const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({ credential: admin.credential.cert(sa) });
        console.log('✓ Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT env var');
        initialized = true;
      } catch (parseErr) {
        console.error('✗ Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', parseErr.message);
        console.warn('  Make sure the JSON is on a single line and fully quoted.');
      }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp();
      console.log('✓ Firebase Admin initialized from GOOGLE_APPLICATION_CREDENTIALS file');
      initialized = true;
    }

    if (initialized && admin.apps.length > 0) {
      db = admin.firestore();

      // Seed basic demo data if users collection is empty
      const usersSnap = await db.collection('users').limit(1).get();
      if (usersSnap.empty) {
        console.log('⟳ Seeding demo data into Firestore...');
        const batch = db.batch();

        // Organizations
        const orgs = [
          { id: 'org_nasa',   name: 'NASA',   country: 'USA' },
          { id: 'org_spacex', name: 'SpaceX', country: 'USA' },
          { id: 'org_esa',    name: 'ESA',    country: 'Europe' },
          { id: 'org_noaa',   name: 'NOAA',   country: 'USA' },
          { id: 'org_usaf',   name: 'USAF',   country: 'USA' },
          { id: 'org_isro',   name: 'ISRO',   country: 'India' },
          { id: 'org_jaxa',   name: 'JAXA',   country: 'Japan' },
        ];
        orgs.forEach(o => {
          batch.set(db.collection('organizations').doc(o.id), {
            name: o.name, country: o.country,
            created_at: admin.firestore.FieldValue.serverTimestamp()
          });
        });

        // Users
        const hashAdmin   = await bcrypt.hash('admin123',   10);
        const hashAnalyst = await bcrypt.hash('analyst456', 10);
        batch.set(db.collection('users').doc('admin'), {
          username: 'admin', email: 'admin@orbital.io',
          password_hash: hashAdmin, role: 'admin',
          created_at: admin.firestore.FieldValue.serverTimestamp()
        });
        batch.set(db.collection('users').doc('analyst'), {
          username: 'analyst', email: 'analyst@orbital.io',
          password_hash: hashAnalyst, role: 'analyst',
          created_at: admin.firestore.FieldValue.serverTimestamp()
        });

        // Example satellites
        const sats = [
          { name: 'ISS',          norad_id: '25544', orbit_type: 'LEO', altitude_km: 408,   inclination: 51.6, status: 'Active',   organization_id: 'org_nasa'   },
          { name: 'Hubble',       norad_id: '20580', orbit_type: 'LEO', altitude_km: 547,   inclination: 28.5, status: 'Active',   organization_id: 'org_nasa'   },
          { name: 'GOES-16',      norad_id: '41866', orbit_type: 'GEO', altitude_km: 35786, inclination: 0,    status: 'Active',   organization_id: 'org_noaa'   },
          { name: 'Starlink-1001',norad_id: '44713', orbit_type: 'LEO', altitude_km: 550,   inclination: 53,   status: 'Active',   organization_id: 'org_spacex' },
          { name: 'GPS IIF-1',    norad_id: '37753', orbit_type: 'MEO', altitude_km: 20200, inclination: 55,   status: 'Active',   organization_id: 'org_usaf'   },
          { name: 'Sentinel-2A',  norad_id: '40697', orbit_type: 'SSO', altitude_km: 786,   inclination: 98.6, status: 'Active',   organization_id: 'org_esa'    },
          { name: 'Iridium-155',  norad_id: '43922', orbit_type: 'LEO', altitude_km: 780,   inclination: 86.4, status: 'Inactive', organization_id: null         },
          { name: 'Tiangong',     norad_id: '48274', orbit_type: 'LEO', altitude_km: 389,   inclination: 41.5, status: 'Active',   organization_id: null         },
        ];
        sats.forEach((s, idx) => {
          batch.set(db.collection('satellites').doc(`sat_${idx + 1}`), {
            ...s, created_at: admin.firestore.FieldValue.serverTimestamp()
          });
        });

        // Debris
        batch.set(db.collection('space_debris').doc('deb_1'), {
          name: 'COSMOS 2251 Frag', size_m: 0.12, risk_level: 'High',
          altitude_km: 793, velocity_km_s: 7.4,
          created_at: admin.firestore.FieldValue.serverTimestamp()
        });
        batch.set(db.collection('space_debris').doc('deb_2'), {
          name: 'Fengyun-1C Frag', size_m: 0.08, risk_level: 'Medium',
          altitude_km: 851, velocity_km_s: 7.5,
          created_at: admin.firestore.FieldValue.serverTimestamp()
        });
        batch.set(db.collection('space_debris').doc('deb_3'), {
          name: 'SL-8 Debris', size_m: 2.1, risk_level: 'High',
          altitude_km: 980, velocity_km_s: 7.3,
          created_at: admin.firestore.FieldValue.serverTimestamp()
        });

        // Alerts
        batch.set(db.collection('alerts').doc('alert_1'), {
          severity: 'H',
          message: 'ISS collision probability at 92% — critical threshold exceeded',
          resolved: false,
          created_at: admin.firestore.FieldValue.serverTimestamp()
        });
        batch.set(db.collection('alerts').doc('alert_2'), {
          severity: 'M',
          message: 'Fengyun fragment trajectory updated — monitoring',
          resolved: false,
          created_at: admin.firestore.FieldValue.serverTimestamp()
        });

        // AI Models
        const aiModels = [
          { name: 'OrbitalNet v2.1',     type: 'Collision Prediction',    accuracy: 94.7, status: 'Active' },
          { name: 'DebrisTracker Pro',   type: 'Debris Classification',   accuracy: 89.2, status: 'Active' },
          { name: 'ProximityGuard AI',   type: 'Satellite-to-Satellite',  accuracy: 91.5, status: 'Active' },
          { name: 'SolarDrag Estimator', type: 'Atmospheric Drag',        accuracy: 88.4, status: 'Active' },
          { name: 'LaunchTrajectory AI', type: 'Launch Conjunction',      accuracy: 96.1, status: 'Active' },
        ];
        aiModels.forEach((m, i) => {
          batch.set(db.collection('ai_models').doc(`model_${i + 1}`), {
            ...m, created_at: admin.firestore.FieldValue.serverTimestamp()
          });
        });

        // Tracking Stations
        const stations = [
          { name: 'Maui Space Surveillance',  latitude:  20.7084,  longitude: -156.2570, status: 'Online'      },
          { name: 'Fylingdales',              latitude:  54.3617,  longitude:   -0.6697, status: 'Online'      },
          { name: 'Cape Cod',                 latitude:  41.7546,  longitude:  -70.5392, status: 'Online'      },
          { name: 'Diego Garcia',             latitude:  -7.3195,  longitude:   72.4229, status: 'Online'      },
          { name: 'Kwajalein',                latitude:   8.7167,  longitude:  167.7333, status: 'Maintenance' },
        ];
        stations.forEach((s, i) => {
          batch.set(db.collection('tracking_stations').doc(`station_${i + 1}`), {
            ...s, created_at: admin.firestore.FieldValue.serverTimestamp()
          });
        });

        await batch.commit();
        console.log('✓ Demo data seeded into Firestore');
      }

      dbConnected = true;
      console.log('✓ Firestore connected and ready');
    } else {
      console.warn('⚠ No Firebase credentials provided — running in in-memory demo mode.');
      console.warn('  Set FIREBASE_SERVICE_ACCOUNT in .env to enable Firestore persistence.');
      db = null;
      dbConnected = false;
    }

    return true;
  } catch (err) {
    console.error('✗ Firestore init error:', err.message);
    db = null;
    dbConnected = false;
    return false;
  }
}

// ════════════════════════════════════════════════════════════
// FIRESTORE HELPERS
// ════════════════════════════════════════════════════════════
async function fetchCollection(name, { limit = 100, orderBy = 'created_at' } = {}) {
  if (!db) {
    // Return in-memory data
    const col = MEM[name] || {};
    return Object.entries(col).map(([id, d]) => ({ id, ...d })).slice(0, limit);
  }
  try {
    let q = db.collection(name);
    try { q = q.orderBy(orderBy, 'desc'); } catch (_) { /* no created_at field */ }
    q = q.limit(limit);
    const snap = await q.get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error(`fetchCollection(${name}) error:`, err.message);
    return [];
  }
}

async function getDoc(name, id) {
  if (!db) {
    const col = MEM[name] || {};
    const d = col[String(id)];
    return d ? { id: String(id), ...d } : null;
  }
  const doc = await db.collection(name).doc(String(id)).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function addDoc(name, data) {
  if (!db) {
    const id = `mem_${Date.now()}`;
    if (!MEM[name]) MEM[name] = {};
    MEM[name][id] = { ...data, created_at: new Date().toISOString() };
    return { id, ...MEM[name][id] };
  }
  const ref = await db.collection(name).add({
    ...data, created_at: admin.firestore.FieldValue.serverTimestamp()
  });
  const doc = await ref.get();
  return { id: ref.id, ...doc.data() };
}

async function updateDoc(name, id, data) {
  if (!db) {
    if (!MEM[name]) MEM[name] = {};
    if (MEM[name][String(id)]) Object.assign(MEM[name][String(id)], data);
    return { id: String(id), ...MEM[name][String(id)] };
  }
  await db.collection(name).doc(String(id)).update({ ...data });
  const doc = await db.collection(name).doc(String(id)).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function deleteDoc(name, id) {
  if (!db) {
    if (MEM[name]) delete MEM[name][String(id)];
    return true;
  }
  await db.collection(name).doc(String(id)).delete();
  return true;
}

// ════════════════════════════════════════════════════════════
// HEALTH CHECK
// ════════════════════════════════════════════════════════════
app.get('/health', (req, res) => {
  res.json({
    status: dbConnected ? 'connected' : 'offline',
    mode: dbConnected ? 'Firestore' : 'In-Memory Demo',
    timestamp: new Date().toISOString(),
  });
});

// ════════════════════════════════════════════════════════════
// AUTHENTICATION ENDPOINTS
// ════════════════════════════════════════════════════════════
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

  try {
    let user = null;

    if (db) {
      // Try Firestore
      const q = await db.collection('users').where('username', '==', username).limit(1).get();
      if (!q.empty) {
        const doc = q.docs[0];
        user = { id: doc.id, ...doc.data() };
      }
    } else {
      // Try in-memory
      const mem = MEM.users[username];
      if (mem) user = { id: username, ...mem };
    }

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const validPass = await bcrypt.compare(password, user.password_hash || '');
    if (!validPass) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password, role = 'analyst' } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  if (password.length < 6) return res.status(400).json({ error: 'Password too short (min 6 characters)' });

  try {
    const hashedPass = await bcrypt.hash(password, 10);

    if (db) {
      // Check if username already exists in Firestore
      const q = await db.collection('users').where('username', '==', username).limit(1).get();
      if (!q.empty) return res.status(400).json({ error: 'Username already exists' });

      const ref = await db.collection('users').add({
        username, email, password_hash: hashedPass, role,
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });
      const userDoc = await ref.get();
      const user = { id: ref.id, ...userDoc.data() };

      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
      return res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
    } else {
      // In-memory
      if (MEM.users[username]) return res.status(400).json({ error: 'Username already exists' });
      MEM.users[username] = { username, email, password_hash: hashedPass, role };
      const token = jwt.sign({ id: username, username, role }, JWT_SECRET, { expiresIn: '24h' });
      return res.json({ token, user: { id: username, username, email, role } });
    }
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// JWT Middleware
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ════════════════════════════════════════════════════════════
// SATELLITES
// ════════════════════════════════════════════════════════════
app.get('/api/satellites', verifyToken, async (req, res) => {
  try {
    const sats = await fetchCollection('satellites', { limit: 200 });
    const orgIds = [...new Set(sats.map(s => s.organization_id).filter(Boolean))];
    const orgs = {};
    if (db && orgIds.length) {
      const snaps = await Promise.all(orgIds.map(id => db.collection('organizations').doc(String(id)).get()));
      snaps.forEach(d => { if (d.exists) orgs[d.id] = d.data().name; });
    } else {
      Object.entries(MEM.organizations || {}).forEach(([id, o]) => { orgs[id] = o.name; });
    }
    const out = sats.map(s => ({ ...s, organization: s.organization_id ? orgs[s.organization_id] || null : null }));
    res.json(out);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

app.post('/api/satellites', verifyToken, async (req, res) => {
  const { name, norad_id, orbit_type, altitude_km = 550, inclination = 53, status = 'Active', organization_id } = req.body;
  if (!name || !orbit_type) return res.status(400).json({ error: 'Missing required fields (name, orbit_type)' });
  try {
    const doc = await addDoc('satellites', { name, norad_id: norad_id || null, orbit_type, altitude_km: +altitude_km, inclination: +inclination, status, organization_id: organization_id || null });
    res.json({ id: doc.id, name: doc.name, orbit_type: doc.orbit_type });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

app.put('/api/satellites/:id', verifyToken, async (req, res) => {
  try {
    const doc = await updateDoc('satellites', req.params.id, req.body);
    res.json(doc || { success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

app.delete('/api/satellites/:id', verifyToken, async (req, res) => {
  try {
    await deleteDoc('satellites', req.params.id);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

// ════════════════════════════════════════════════════════════
// DEBRIS
// ════════════════════════════════════════════════════════════
app.get('/api/debris', verifyToken, async (req, res) => {
  try { res.json(await fetchCollection('space_debris') || []); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

app.post('/api/debris', verifyToken, async (req, res) => {
  const { name, size_m = 0.1, risk_level = 'Medium', altitude_km = 780, velocity_km_s = 7.4 } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  try {
    const doc = await addDoc('space_debris', { name, size_m: +size_m, risk_level, altitude_km: +altitude_km, velocity_km_s: +velocity_km_s });
    res.json({ id: doc.id, name: doc.name });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

// ════════════════════════════════════════════════════════════
// PREDICTIONS
// ════════════════════════════════════════════════════════════
app.get('/api/predictions', verifyToken, async (req, res) => {
  try {
    const preds = await fetchCollection('collision_predictions');
    const satIds = [...new Set(preds.map(p => p.satellite_id).filter(Boolean))];
    const debIds = [...new Set(preds.map(p => p.debris_id).filter(Boolean))];
    const satMap = {}, debMap = {};
    await Promise.all(satIds.map(async id => { const d = await getDoc('satellites', id); if (d) satMap[id] = d.name; }));
    await Promise.all(debIds.map(async id => { const d = await getDoc('space_debris', id); if (d) debMap[id] = d.name; }));
    const out = preds.map(p => ({ ...p, satellite_name: satMap[p.satellite_id] || p.satellite_name || null, debris_name: debMap[p.debris_id] || p.debris_name || null }));
    res.json(out);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

app.post('/api/predictions', verifyToken, async (req, res) => {
  const { satellite_id, debris_id, probability = 0.5, miss_distance_km = 0, time_of_closest_approach = null, status = 'Monitor', satellite_name, debris_name } = req.body;
  if (!satellite_id || !debris_id) return res.status(400).json({ error: 'Missing satellite_id or debris_id' });
  try {
    const doc = await addDoc('collision_predictions', { satellite_id, debris_id, satellite_name, debris_name, probability, miss_distance_km, time_of_closest_approach, status });
    res.json({ id: doc.id });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

// ════════════════════════════════════════════════════════════
// ALERTS
// ════════════════════════════════════════════════════════════
app.get('/api/alerts', verifyToken, async (req, res) => {
  try { res.json(await fetchCollection('alerts') || []); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

app.post('/api/alerts', verifyToken, async (req, res) => {
  const { severity = 'M', message, resolved = false } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });
  try {
    const doc = await addDoc('alerts', { severity, message, resolved });
    res.json({ id: doc.id });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

app.patch('/api/alerts/:id/resolve', verifyToken, async (req, res) => {
  try {
    const data = { resolved: true, resolved_at: db ? admin.firestore.FieldValue.serverTimestamp() : new Date().toISOString() };
    if (req.user?.id) data.resolved_by = req.user.id;
    await updateDoc('alerts', req.params.id, data);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

// ════════════════════════════════════════════════════════════
// TRACKING STATIONS
// ════════════════════════════════════════════════════════════
app.get('/api/stations', verifyToken, async (req, res) => {
  try { res.json(await fetchCollection('tracking_stations', { limit: 50 }) || []); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

// ════════════════════════════════════════════════════════════
// AI MODELS
// ════════════════════════════════════════════════════════════
app.get('/api/ai-models', verifyToken, async (req, res) => {
  try {
    if (db) {
      const q = await db.collection('ai_models').where('status', '==', 'Active').limit(20).get();
      return res.json(q.docs.map(d => ({ id: d.id, ...d.data() })));
    }
    res.json(Object.entries(MEM.ai_models).map(([id, m]) => ({ id, ...m })));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

// ════════════════════════════════════════════════════════════
// SIMULATIONS
// ════════════════════════════════════════════════════════════
app.post('/api/simulations/run', verifyToken, async (req, res) => {
  const { model_id } = req.body;
  if (!model_id) return res.status(400).json({ error: 'Model ID required' });
  try {
    const sim = await addDoc('simulations', { model_id, status: 'Running', ran_by: req.user?.id || 'unknown' });
    setTimeout(async () => {
      try {
        const result = {
          conjunctions_detected: Math.floor(Math.random() * 5),
          critical_events: Math.floor(Math.random() * 2),
          new_debris_tracked: Math.floor(Math.random() * 20),
          confidence: (0.75 + Math.random() * 0.2).toFixed(2),
        };
        await updateDoc('simulations', sim.id, { status: 'Completed', result: JSON.stringify(result), duration_s: (Math.random() * 60 + 10).toFixed(2) });
      } catch (e) { console.error('Sim update error:', e); }
    }, 2000);
    res.json({ id: sim.id, status: 'Running' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

// ════════════════════════════════════════════════════════════
// ORGANIZATIONS
// ════════════════════════════════════════════════════════════
app.get('/api/organizations', verifyToken, async (req, res) => {
  try {
    if (db) {
      const q = await db.collection('organizations').limit(100).get();
      return res.json(q.docs.map(d => ({ id: d.id, ...d.data() })));
    }
    res.json(Object.entries(MEM.organizations || {}).map(([id, o]) => ({ id, ...o })));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

app.post('/api/organizations', verifyToken, async (req, res) => {
  const { name, country } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  try {
    const doc = await addDoc('organizations', { name, country: country || '' });
    res.json({ id: doc.id, name: doc.name, country: doc.country });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

// ════════════════════════════════════════════════════════════
// MISSIONS
// ════════════════════════════════════════════════════════════
app.get('/api/missions', verifyToken, async (req, res) => {
  try {
    const missions = await fetchCollection('missions', { limit: 50 });
    res.json(missions);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

app.post('/api/missions', verifyToken, async (req, res) => {
  const { name, objective, organization, status = 'Active', start_date } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  try {
    const doc = await addDoc('missions', { name, objective: objective || '', organization: organization || '', status, start_date: start_date || new Date().toISOString() });
    res.json({ id: doc.id, name: doc.name });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

// ════════════════════════════════════════════════════════════
// LAUNCH VEHICLES
// ════════════════════════════════════════════════════════════
app.get('/api/launch-vehicles', verifyToken, async (req, res) => {
  try { res.json(await fetchCollection('launch_vehicles', { limit: 50 }) || []); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

app.post('/api/launch-vehicles', verifyToken, async (req, res) => {
  const { name, manufacturer, payload_capacity_kg, status = 'Active' } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  try {
    const doc = await addDoc('launch_vehicles', { name, manufacturer: manufacturer || '', payload_capacity_kg: payload_capacity_kg ? +payload_capacity_kg : null, status });
    res.json({ id: doc.id, name: doc.name });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

// ════════════════════════════════════════════════════════════
// LAUNCH EVENTS
// ════════════════════════════════════════════════════════════
app.get('/api/launch-events', verifyToken, async (req, res) => {
  try { res.json(await fetchCollection('launch_events', { limit: 50 }) || []); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

// ════════════════════════════════════════════════════════════
// MANEUVERS
// ════════════════════════════════════════════════════════════
app.get('/api/maneuvers', verifyToken, async (req, res) => {
  try { res.json(await fetchCollection('maneuvers', { limit: 50 }) || []); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

app.post('/api/maneuvers', verifyToken, async (req, res) => {
  const { satellite_name, satellite_id, type, delta_v = 1.5, status = 'Scheduled', planned_time } = req.body;
  if (!type) return res.status(400).json({ error: 'Type required' });
  try {
    const doc = await addDoc('maneuvers', { satellite_name: satellite_name || null, satellite_id: satellite_id || null, type, delta_v: +delta_v, status, planned_time: planned_time || new Date(Date.now() + 86400000).toISOString() });
    res.json({ id: doc.id });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

// ════════════════════════════════════════════════════════════
// DATA LOGS
// ════════════════════════════════════════════════════════════
app.get('/api/data-logs', verifyToken, async (req, res) => {
  try { res.json(await fetchCollection('data_logs', { limit: 50 }) || []); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

// ════════════════════════════════════════════════════════════
// COMMUNICATION LINKS
// ════════════════════════════════════════════════════════════
app.get('/api/comm-links', verifyToken, async (req, res) => {
  try { res.json(await fetchCollection('communication_links', { limit: 50 }) || []); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

// ════════════════════════════════════════════════════════════
// MAINTENANCE
// ════════════════════════════════════════════════════════════
app.get('/api/maintenance', verifyToken, async (req, res) => {
  try { res.json(await fetchCollection('maintenance_records', { limit: 50 }) || []); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Database error' }); }
});

// ════════════════════════════════════════════════════════════
// GLOBAL ERROR HANDLER
// ════════════════════════════════════════════════════════════
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: `Endpoint not found: ${req.method} ${req.path}` });
});

// ════════════════════════════════════════════════════════════
// SERVER START
// ════════════════════════════════════════════════════════════
async function startServer() {
  console.log('');
  console.log('⬡  ORBITAL GUARDIAN – Backend Server');
  console.log('═════════════════════════════════════════════');

  await initializeDB();

  app.listen(PORT, () => {
    console.log('');
    console.log(`✓ Server running  →  http://localhost:${PORT}`);
    console.log(`✓ API available   →  http://localhost:${PORT}/api`);
    console.log(`✓ Health check    →  http://localhost:${PORT}/health`);
    if (!dbConnected) {
      console.log('');
      console.log('⚠ Running in IN-MEMORY mode (no Firestore).');
      console.log('  To connect Firestore, add FIREBASE_SERVICE_ACCOUNT to .env');
      console.log('  See .env.example for format instructions.');
    }
    console.log('');
  });
}

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⊘ Shutting down gracefully...');
  try {
    if (admin.apps.length > 0) await Promise.all(admin.apps.map(a => a.delete()));
  } catch { /* ignore */ }
  process.exit(0);
});
