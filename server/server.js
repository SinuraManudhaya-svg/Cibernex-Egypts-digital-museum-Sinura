/**
 * server.js
 * A small local API server that sits between the static site and
 * MongoDB Atlas. Run this alongside your Live Server / static file
 * server while developing locally.
 *
 * Public (read) endpoints:
 *   GET /api/artifacts           -> all artifacts (array)
 *   GET /api/artifacts/:id       -> a single artifact by its "id" field
 *   GET /api/exhibitions         -> all exhibitions (array)
 *   GET /api/exhibitions/:id     -> a single exhibition by its "id" slug
 *   GET /api/announcements       -> all announcements (array)
 *   GET /api/health              -> quick check that Mongo is connected
 */

'use strict';

require('dotenv').config();
const dns = require('dns');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

// Force Node to use Google/Cloudflare DNS for this process, regardless
// of the OS/router's configured DNS. This works around networks where
// the mongodb+srv:// lookup fails with "querySrv ESERVFAIL".
dns.setServers(['8.8.8.8', '1.1.1.1']);

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'egyptMuseum';
const COLLECTION_NAME = process.env.COLLECTION_NAME || 'artifacts';
const EXHIBITIONS_COLLECTION_NAME = 'exhibitions';
const ANNOUNCEMENTS_COLLECTION_NAME = 'announcements';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI. Copy .env.example to .env and fill in your Atlas connection string.');
    process.exit(1);
}

if (!ADMIN_TOKEN || !ADMIN_PASSWORD) {
    console.warn('Warning: ADMIN_TOKEN and/or ADMIN_PASSWORD is not set in .env — admin.html login will fail with 401 until BOTH are set.');
}

const app = express();

// Allow the static site (served from a different port, e.g. Live
// Server on 5500) to call this API during local development.
app.use(cors());
app.use(express.json());

// Serve the website's own HTML/CSS/JS/images from this SAME server,
// so you only need to run one process on one port. The project root
// is one level up from server/. This means artifact.html, artifacts.js,
// css/main.css etc. are all reachable directly at http://localhost:PORT/...
app.use(express.static(path.join(__dirname, '..')));

// Guards every write (POST/PUT/DELETE) route below, and the login
// check itself (GET /api/admin/verify). BOTH the token AND the
// password must match — reads (GET on artifacts/exhibitions/
// announcements) stay public either way.
function requireAdmin(req, res, next) {
    const token = req.get('x-admin-token');
    const password = req.get('x-admin-password');
    if (!ADMIN_TOKEN || !ADMIN_PASSWORD || token !== ADMIN_TOKEN || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Missing or incorrect admin token/password.' });
    }
    next();
}

const client = new MongoClient(MONGODB_URI);
let artifactsCollection;
let exhibitionsCollection;
let announcementsCollection;

async function start() {
    await client.connect();
    const db = client.db(DB_NAME);
    artifactsCollection = db.collection(COLLECTION_NAME);
    exhibitionsCollection = db.collection(EXHIBITIONS_COLLECTION_NAME);
    announcementsCollection = db.collection(ANNOUNCEMENTS_COLLECTION_NAME);
    console.log(`Connected to MongoDB Atlas — database "${DB_NAME}", collections "${COLLECTION_NAME}" + "${EXHIBITIONS_COLLECTION_NAME}" + "${ANNOUNCEMENTS_COLLECTION_NAME}"`);

    app.listen(PORT, () => {
        console.log(`API server running at http://localhost:${PORT}`);
        console.log(`  GET  http://localhost:${PORT}/api/artifacts`);
        console.log(`  GET  http://localhost:${PORT}/api/exhibitions`);
        console.log(`  GET  http://localhost:${PORT}/api/announcements`);
        console.log(`  Admin dashboard: http://localhost:${PORT}/admin.html`);
    });
}

app.get('/api/health', async (req, res) => {
    try {
        await client.db('admin').command({ ping: 1 });
        res.json({ status: 'ok', db: DB_NAME, collections: [COLLECTION_NAME, EXHIBITIONS_COLLECTION_NAME, ANNOUNCEMENTS_COLLECTION_NAME] });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// GET /api/admin/verify — used only by admin.html's login screen to
// confirm the token + password pair is correct before showing the
// dashboard. No data, no side effects.
app.get('/api/admin/verify', requireAdmin, (req, res) => {
    res.json({ ok: true });
});

// Small helper: find the next free numeric "id" for a collection that
// uses auto-incrementing integer ids (artifacts, announcements).
async function nextNumericId(collection) {
    const top = await collection.find().sort({ id: -1 }).limit(1).toArray();
    return (top[0]?.id || 0) + 1;
}

// ================= ARTIFACTS =================

// GET /api/artifacts — mirrors the shape of json/artifacts.json
// exactly (same fields, no Mongo-only _id) so the existing frontend
// code doesn't need to change how it reads each artifact.
app.get('/api/artifacts', async (req, res) => {
    try {
        const artifacts = await artifactsCollection
            .find({}, { projection: { _id: 0 } })
            .toArray();
        res.json(artifacts);
    } catch (err) {
        console.error('Failed to fetch artifacts:', err);
        res.status(500).json({ error: 'Failed to load artifacts from the database.' });
    }
});

// GET /api/artifacts/:id — single artifact lookup by the "id" field
// used throughout the site (not Mongo's internal _id).
app.get('/api/artifacts/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const artifact = await artifactsCollection.findOne(
            { id },
            { projection: { _id: 0 } }
        );
        if (!artifact) {
            return res.status(404).json({ error: 'Artifact not found.' });
        }
        res.json(artifact);
    } catch (err) {
        console.error('Failed to fetch artifact:', err);
        res.status(500).json({ error: 'Failed to load this artifact from the database.' });
    }
});

// POST /api/artifacts — create a new artifact. Assigns the next free
// numeric id automatically so admin.html never has to guess one.
app.post('/api/artifacts', requireAdmin, async (req, res) => {
    try {
        if (!req.body.name) {
            return res.status(400).json({ error: 'An artifact needs at least a name.' });
        }
        const id = await nextNumericId(artifactsCollection);
        const artifact = { ...req.body, id };
        delete artifact._id;
        await artifactsCollection.insertOne(artifact);
        res.status(201).json(artifact);
    } catch (err) {
        console.error('Failed to create artifact:', err);
        res.status(500).json({ error: 'Failed to save this artifact.' });
    }
});

// PUT /api/artifacts/:id — update an existing artifact by its "id" field.
app.put('/api/artifacts/:id', requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const update = { ...req.body };
        delete update._id;
        delete update.id; // id in the URL is the source of truth
        const result = await artifactsCollection.findOneAndUpdate(
            { id },
            { $set: update },
            { returnDocument: 'after', projection: { _id: 0 } }
        );
        if (!result) {
            return res.status(404).json({ error: 'Artifact not found.' });
        }
        res.json(result);
    } catch (err) {
        console.error('Failed to update artifact:', err);
        res.status(500).json({ error: 'Failed to update this artifact.' });
    }
});

// DELETE /api/artifacts/:id
app.delete('/api/artifacts/:id', requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const result = await artifactsCollection.deleteOne({ id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Artifact not found.' });
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Failed to delete artifact:', err);
        res.status(500).json({ error: 'Failed to delete this artifact.' });
    }
});

// ================= EXHIBITIONS =================

// GET /api/exhibitions — mirrors json/exhibitions.json exactly, same
// as /api/artifacts mirrors json/artifacts.json.
app.get('/api/exhibitions', async (req, res) => {
    try {
        const exhibitions = await exhibitionsCollection
            .find({}, { projection: { _id: 0 } })
            .toArray();
        res.json(exhibitions);
    } catch (err) {
        console.error('Failed to fetch exhibitions:', err);
        res.status(500).json({ error: 'Failed to load exhibitions from the database.' });
    }
});

// GET /api/exhibitions/:id — single exhibition lookup by its "id" slug
// (e.g. "pharaohs"), not Mongo's internal _id.
app.get('/api/exhibitions/:id', async (req, res) => {
    try {
        const exhibition = await exhibitionsCollection.findOne(
            { id: req.params.id },
            { projection: { _id: 0 } }
        );
        if (!exhibition) {
            return res.status(404).json({ error: 'Exhibition not found.' });
        }
        res.json(exhibition);
    } catch (err) {
        console.error('Failed to fetch exhibition:', err);
        res.status(500).json({ error: 'Failed to load this exhibition from the database.' });
    }
});

// POST /api/exhibitions — create a new exhibition. Exhibitions use a
// human-chosen slug (e.g. "pharaohs") as their id, not an auto-number,
// so the admin form must supply one and it must be unique.
app.post('/api/exhibitions', requireAdmin, async (req, res) => {
    try {
        const id = (req.body.id || '').trim();
        if (!id || !req.body.title) {
            return res.status(400).json({ error: 'An exhibition needs an id (slug) and a title.' });
        }
        const existing = await exhibitionsCollection.findOne({ id });
        if (existing) {
            return res.status(409).json({ error: `An exhibition with id "${id}" already exists.` });
        }
        const exhibition = { ...req.body, id };
        delete exhibition._id;
        await exhibitionsCollection.insertOne(exhibition);
        res.status(201).json(exhibition);
    } catch (err) {
        console.error('Failed to create exhibition:', err);
        res.status(500).json({ error: 'Failed to save this exhibition.' });
    }
});

// PUT /api/exhibitions/:id
app.put('/api/exhibitions/:id', requireAdmin, async (req, res) => {
    try {
        const update = { ...req.body };
        delete update._id;
        delete update.id; // id in the URL is the source of truth
        const result = await exhibitionsCollection.findOneAndUpdate(
            { id: req.params.id },
            { $set: update },
            { returnDocument: 'after', projection: { _id: 0 } }
        );
        if (!result) {
            return res.status(404).json({ error: 'Exhibition not found.' });
        }
        res.json(result);
    } catch (err) {
        console.error('Failed to update exhibition:', err);
        res.status(500).json({ error: 'Failed to update this exhibition.' });
    }
});

// DELETE /api/exhibitions/:id
app.delete('/api/exhibitions/:id', requireAdmin, async (req, res) => {
    try {
        const result = await exhibitionsCollection.deleteOne({ id: req.params.id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Exhibition not found.' });
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Failed to delete exhibition:', err);
        res.status(500).json({ error: 'Failed to delete this exhibition.' });
    }
});

// ================= ANNOUNCEMENTS =================
// Displayed at the bottom of the homepage (index.html) via
// js/announcements.js, which calls GET /api/announcements directly.

app.get('/api/announcements', async (req, res) => {
    try {
        const announcements = await announcementsCollection
            .find({}, { projection: { _id: 0 } })
            .sort({ id: -1 })
            .toArray();
        res.json(announcements);
    } catch (err) {
        console.error('Failed to fetch announcements:', err);
        res.status(500).json({ error: 'Failed to load announcements from the database.' });
    }
});

app.post('/api/announcements', requireAdmin, async (req, res) => {
    try {
        if (!req.body.title) {
            return res.status(400).json({ error: 'An announcement needs at least a title.' });
        }
        const id = await nextNumericId(announcementsCollection);
        const announcement = {
            active: true,
            date: new Date().toISOString(),
            ...req.body,
            id,
        };
        delete announcement._id;
        await announcementsCollection.insertOne(announcement);
        res.status(201).json(announcement);
    } catch (err) {
        console.error('Failed to create announcement:', err);
        res.status(500).json({ error: 'Failed to save this announcement.' });
    }
});

app.put('/api/announcements/:id', requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const update = { ...req.body };
        delete update._id;
        delete update.id;
        const result = await announcementsCollection.findOneAndUpdate(
            { id },
            { $set: update },
            { returnDocument: 'after', projection: { _id: 0 } }
        );
        if (!result) {
            return res.status(404).json({ error: 'Announcement not found.' });
        }
        res.json(result);
    } catch (err) {
        console.error('Failed to update announcement:', err);
        res.status(500).json({ error: 'Failed to update this announcement.' });
    }
});

app.delete('/api/announcements/:id', requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const result = await announcementsCollection.deleteOne({ id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Announcement not found.' });
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Failed to delete announcement:', err);
        res.status(500).json({ error: 'Failed to delete this announcement.' });
    }
});

start().catch(err => {
    console.error('Could not connect to MongoDB Atlas:', err.message);
    console.error('Check MONGODB_URI in .env, and that your IP is allowed in Atlas → Network Access.');
    process.exit(1);
});