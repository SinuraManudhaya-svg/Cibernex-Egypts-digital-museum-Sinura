/**
 * seed.js
 * One-time / repeatable migration: imports json/artifacts.json into the
 * MongoDB Atlas "artifacts" collection.
 *
 * Safe to run more than once — each artifact is upserted by its
 * numeric "id" field, so re-running this will UPDATE existing
 * documents instead of creating duplicates.
 *
 * Usage:
 *   cd server
 *   npm run seed
 */

'use strict';

require('dotenv').config();
const dns = require('dns');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// Force Node to use Google/Cloudflare DNS for this process, regardless
// of the OS/router's configured DNS. This works around networks where
// the mongodb+srv:// lookup fails with "querySrv ESERVFAIL".
dns.setServers(['8.8.8.8', '1.1.1.1']);

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'egyptMuseum';
const COLLECTION_NAME = process.env.COLLECTION_NAME || 'artifacts';

// json/artifacts.json lives one level up from server/
const DATA_PATH = path.join(__dirname, '..', 'json', 'artifacts.json');

if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI. Check server/.env.');
    process.exit(1);
}

async function seed() {
    if (!fs.existsSync(DATA_PATH)) {
        console.error(`Could not find ${DATA_PATH}`);
        process.exit(1);
    }

    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    let artifacts;
    try {
        artifacts = JSON.parse(raw);
    } catch (err) {
        console.error('json/artifacts.json is not valid JSON:', err.message);
        process.exit(1);
    }

    if (!Array.isArray(artifacts) || artifacts.length === 0) {
        console.error('json/artifacts.json is empty or not an array — nothing to seed.');
        process.exit(1);
    }

    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);

        // Make "id" unique so future writes (manual or via API) can't
        // accidentally create duplicate artifacts either.
        await collection.createIndex({ id: 1 }, { unique: true });

        let inserted = 0;
        let updated = 0;

        for (const artifact of artifacts) {
            if (typeof artifact.id === 'undefined') {
                console.warn(`Skipping artifact with no "id":`, artifact.name || '(unnamed)');
                continue;
            }

            const result = await collection.updateOne(
                { id: artifact.id },
                { $set: artifact },
                { upsert: true }
            );

            if (result.upsertedCount > 0) inserted++;
            else if (result.modifiedCount > 0) updated++;
        }

        const total = await collection.countDocuments();

        console.log('Seed complete.');
        console.log(`  Inserted: ${inserted}`);
        console.log(`  Updated:  ${updated}`);
        console.log(`  Unchanged: ${artifacts.length - inserted - updated}`);
        console.log(`  Total documents now in "${DB_NAME}.${COLLECTION_NAME}": ${total}`);
    } catch (err) {
        console.error('Seed failed:', err.message);
        process.exitCode = 1;
    } finally {
        await client.close();
    }
}

seed();