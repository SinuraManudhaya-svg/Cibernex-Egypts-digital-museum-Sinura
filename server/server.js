/**
 * server.js — Egypt Digital Museum API
 */

'use strict';

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const path       = require('path');

require('dns').setServers(['8.8.8.8', '1.1.1.1']);

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '512kb' }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin "${origin}" is not permitted.`));
  },
  methods:        ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-admin-token', 'x-admin-password'],
};


app.use(cors(corsOptions));

const publicReadCors = cors({ origin: '*', methods: ['GET'] });
const RATE_WINDOW_MS      = 60_000; 
const RATE_MAX_ATTEMPTS   = 10; 
const RATE_PRUNE_THRESHOLD = 2000;  

const rateLimitMap = new Map();

function adminRateLimiter(req, res, next) {
  const ip  = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();

  let record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + RATE_WINDOW_MS };
  }

  record.count++;
  rateLimitMap.set(ip, record);

  if (rateLimitMap.size > RATE_PRUNE_THRESHOLD) {
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }

  if (record.count > RATE_MAX_ATTEMPTS) {
    const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
    res.set('Retry-After', String(retryAfterSec));
    return res.status(429).json({
      error: `Too many login attempts. Try again in ${retryAfterSec} seconds.`
    });
  }

  next();
}

/* ══════════════════════════════════════════════════════════════
   ADMIN AUTHENTICATION MIDDLEWARE
══════════════════════════════════════════════════════════════ */
const ADMIN_TOKEN    = process.env.ADMIN_TOKEN;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function requireAdmin(req, res, next) {
  const token    = req.headers['x-admin-token']    || '';
  const password = req.headers['x-admin-password'] || '';

  if (
    !ADMIN_TOKEN || !ADMIN_PASSWORD ||
    token !== ADMIN_TOKEN ||
    password !== ADMIN_PASSWORD
  ) {
    return res.status(401).json({ error: 'Missing or incorrect admin token/password.' });
  }

  next();
}

/* ══════════════════════════════════════════════════════════════
   STATIC FILE SERVING
══════════════════════════════════════════════════════════════ */
app.use(express.static(path.join(__dirname, '..')));

/* ══════════════════════════════════════════════════════════════
   MONGODB
══════════════════════════════════════════════════════════════ */
const MONGODB_URI = process.env.MONGODB_URI;

let artifactsCollection;
let exhibitionsCollection;
let announcementsCollection;

function requireDb(req, res, next) {
  if (!artifactsCollection || !exhibitionsCollection || !announcementsCollection) {
    return res.status(503).json({ error: 'Database not ready yet. Please retry shortly.' });
  }
  next();
}

/* ── ID helper ── */
async function nextNumericId(collection) {
  const last = await collection
    .find({}, { projection: { id: 1, _id: 0 } })
    .sort({ id: -1 })
    .limit(1)
    .toArray();
  return last.length ? last[0].id + 1 : 1;
}

/* ══════════════════════════════════════════════════════════════
   ROUTES
══════════════════════════════════════════════════════════════ */

/* ── Admin verify ──────────────────────────────────────────── */
app.get('/api/admin/verify', adminRateLimiter, requireAdmin, (req, res) => {
  res.json({ ok: true });
});

/* ── Artifacts ────────────────────────────────────────────── */
app.get('/api/artifacts', publicReadCors, requireDb, async (req, res) => {
  try {
    const docs = await artifactsCollection
      .find({}, { projection: { _id: 0 } })
      .sort({ sortYear: 1 })
      .toArray();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/artifacts/:id', publicReadCors, requireDb, async (req, res) => {
  try {
    const id  = Number(req.params.id);
    const doc = await artifactsCollection.findOne({ id }, { projection: { _id: 0 } });
    if (!doc) return res.status(404).json({ error: 'Artifact not found.' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/artifacts', requireAdmin, requireDb, async (req, res) => {
  try {
    if (!req.body.name) {
      return res.status(400).json({ error: 'An artifact needs at least a name.' });
    }
    const id       = await nextNumericId(artifactsCollection);
    const artifact = { ...req.body, id };
    delete artifact._id;
    await artifactsCollection.insertOne(artifact);
    const { _id, ...safe } = artifact;
    res.status(201).json(safe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/artifacts/:id', requireAdmin, requireDb, async (req, res) => {
  try {
    const id     = Number(req.params.id);
    const update = { ...req.body };
    delete update._id;
    delete update.id;

    const result = await artifactsCollection.findOneAndUpdate(
      { id },
      { $set: update },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
    if (!result) return res.status(404).json({ error: 'Artifact not found.' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/artifacts/:id', requireAdmin, requireDb, async (req, res) => {
  try {
    const id     = Number(req.params.id);
    const result = await artifactsCollection.deleteOne({ id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Artifact not found.' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Exhibitions ──────────────────────────────────────────── */
app.get('/api/exhibitions', publicReadCors, requireDb, async (req, res) => {
  try {
    const docs = await exhibitionsCollection
      .find({}, { projection: { _id: 0 } })
      .toArray();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/exhibitions/:slug', publicReadCors, requireDb, async (req, res) => {
  try {
    const slug = req.params.slug;
    const doc  = await exhibitionsCollection.findOne({ slug }, { projection: { _id: 0 } });
    if (!doc) return res.status(404).json({ error: 'Exhibition not found.' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/exhibitions', requireAdmin, requireDb, async (req, res) => {
  try {
    if (!req.body.slug || !req.body.title) {
      return res.status(400).json({ error: 'Exhibition needs a slug and title.' });
    }
    const exhibition = { ...req.body };
    delete exhibition._id;
    await exhibitionsCollection.insertOne(exhibition);
    const { _id, ...safe } = exhibition;
    res.status(201).json(safe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/exhibitions/:slug', requireAdmin, requireDb, async (req, res) => {
  try {
    const slug   = req.params.slug;
    const update = { ...req.body };
    delete update._id;

    const result = await exhibitionsCollection.findOneAndUpdate(
      { slug },
      { $set: update },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
    if (!result) return res.status(404).json({ error: 'Exhibition not found.' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/exhibitions/:slug', requireAdmin, requireDb, async (req, res) => {
  try {
    const slug   = req.params.slug;
    const result = await exhibitionsCollection.deleteOne({ slug });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Exhibition not found.' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Announcements ────────────────────────────────────────── */
app.get('/api/announcements', publicReadCors, requireDb, async (req, res) => {
  try {
    const docs = await announcementsCollection
      .find({}, { projection: { _id: 0 } })
      .sort({ date: -1 })
      .toArray();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/announcements', requireAdmin, requireDb, async (req, res) => {
  try {
    if (!req.body.title) {
      return res.status(400).json({ error: 'Announcement needs a title.' });
    }
    const id           = await nextNumericId(announcementsCollection);
    const announcement = { ...req.body, id, date: new Date().toISOString() };
    delete announcement._id;
    await announcementsCollection.insertOne(announcement);
    const { _id, ...safe } = announcement;
    res.status(201).json(safe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/announcements/:id', requireAdmin, requireDb, async (req, res) => {
  try {
    const id     = Number(req.params.id);
    const update = { ...req.body };
    delete update._id;
    delete update.id;
    delete update.date; 
    const result = await announcementsCollection.findOneAndUpdate(
      { id },
      { $set: update },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
    if (!result) return res.status(404).json({ error: 'Announcement not found.' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/announcements/:id', requireAdmin, requireDb, async (req, res) => {
  try {
    const id     = Number(req.params.id);
    const result = await announcementsCollection.deleteOne({ id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Announcement not found.' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════
   STARTUP
══════════════════════════════════════════════════════════════ */
async function start() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI is not set. Add it to .env');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('Connected to MongoDB Atlas.');

  const db = client.db('egypt_museum');
  artifactsCollection    = db.collection('artifacts');
  exhibitionsCollection  = db.collection('exhibitions');
  announcementsCollection = db.collection('announcements');

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (!ADMIN_TOKEN || !ADMIN_PASSWORD) {
      console.warn('WARNING: ADMIN_TOKEN or ADMIN_PASSWORD is not set in .env');
    }
  });
}

start().catch(err => {
  console.error('Could not start server:', err.message);
  process.exit(1);
});
