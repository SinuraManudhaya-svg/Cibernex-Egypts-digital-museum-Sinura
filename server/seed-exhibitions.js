/**
 * seed-exhibitions.js
 * One-time / repeatable migration: imports json/exhibitions.json into
 * the MongoDB Atlas "exhibitions" collection. Mirrors seed.js exactly,
 * just for exhibitions instead of artifacts.
 *
 * Safe to run more than once — each exhibition is upserted by its
 * "id" slug (e.g. "pharaohs"), so re-running this will UPDATE
 * existing documents instead of creating duplicates.
 *
 * Usage:
 *   cd server
 *   npm run seed:exhibitions
 */

'use strict';

require('dotenv').config();
const dns = require('dns');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

dns.setServers(['8.8.8.8', '1.1.1.1']);

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'egyptMuseum';
const COLLECTION_NAME = 'exhibitions';

// json/exhibitions.json lives one level up from server/
const DATA_PATH = path.join(__dirname, '..', 'json', 'exhibitions.json');

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
    let exhibitions;
    try {
        exhibitions = JSON.parse(raw);
    } catch (err) {
        console.error('json/exhibitions.json is not valid JSON:', err.message);
        process.exit(1);
    }

    if (!Array.isArray(exhibitions) || exhibitions.length === 0) {
        console.error('json/exhibitions.json is empty or not an array — nothing to seed.');
        process.exit(1);
    }

    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);

        await collection.createIndex({ id: 1 }, { unique: true });

        let inserted = 0;
        let updated = 0;

        for (const exhibition of exhibitions) {
            if (typeof exhibition.id === 'undefined') {
                console.warn(`Skipping exhibition with no "id":`, exhibition.title || '(untitled)');
                continue;
            }

            const result = await collection.updateOne(
                { id: exhibition.id },
                { $set: exhibition },
                { upsert: true }
            );

            if (result.upsertedCount > 0) inserted++;
            else if (result.modifiedCount > 0) updated++;
        }

        const total = await collection.countDocuments();

        console.log('Seed complete.');
        console.log(`  Inserted: ${inserted}`);
        console.log(`  Updated:  ${updated}`);
        console.log(`  Unchanged: ${exhibitions.length - inserted - updated}`);
        console.log(`  Total documents now in "${DB_NAME}.${COLLECTION_NAME}": ${total}`);
    } catch (err) {
        console.error('Seed failed:', err.message);
        process.exitCode = 1;
    } finally {
        await client.close();
    }
}

seed();