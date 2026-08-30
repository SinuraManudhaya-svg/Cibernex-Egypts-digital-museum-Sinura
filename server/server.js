/**
 * Egypt Digital Museum API
 * Express + MongoDB Atlas
 *
 * Designed for:
 * - Local development
 * - Vercel deployment
 *
 * API endpoints:
 * GET    /api/health
 *
 * GET    /api/artifacts
 * GET    /api/artifacts/:id
 * POST   /api/artifacts
 * PUT    /api/artifacts/:id
 * DELETE /api/artifacts/:id
 *
 * GET    /api/exhibitions
 * GET    /api/exhibitions/:id
 * POST   /api/exhibitions
 * PUT    /api/exhibitions/:id
 * DELETE /api/exhibitions/:id
 *
 * GET    /api/announcements
 * POST   /api/announcements
 * PUT    /api/announcements/:id
 * DELETE /api/announcements/:id
 *
 * GET    /api/admin/verify
 */

'use strict';

require('dotenv').config();

const dns = require('dns');
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

/*
 * Use public DNS resolvers.
 * This helps with mongodb+srv DNS resolution on some networks.
 */
dns.setServers(['8.8.8.8', '1.1.1.1']);

// --------------------------------------------------
// Environment variables
// --------------------------------------------------

const MONGODB_URI = process.env.MONGODB_URI;

const DB_NAME = process.env.DB_NAME || 'egyptMuseum';

const COLLECTION_NAME =
    process.env.COLLECTION_NAME || 'artifacts';

const EXHIBITIONS_COLLECTION_NAME = 'exhibitions';

const ANNOUNCEMENTS_COLLECTION_NAME = 'announcements';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// --------------------------------------------------
// Express application
// --------------------------------------------------

const app = express();

app.use(cors());

app.use(express.json({ limit: '2mb' }));

// --------------------------------------------------
// Admin authentication
// --------------------------------------------------

function requireAdmin(req, res, next) {
    const token = req.get('x-admin-token');
    const password = req.get('x-admin-password');

    if (
        !ADMIN_TOKEN ||
        !ADMIN_PASSWORD ||
        token !== ADMIN_TOKEN ||
        password !== ADMIN_PASSWORD
    ) {
        return res.status(401).json({
            error: 'Missing or incorrect admin token/password.'
        });
    }

    next();
}

// --------------------------------------------------
// MongoDB
// --------------------------------------------------

let client;
let dbPromise = null;

let artifactsCollection;
let exhibitionsCollection;
let announcementsCollection;

async function connectDB() {
    /*
     * Reuse the same connection when Vercel keeps the
     * serverless function warm.
     */
    if (dbPromise) {
        return dbPromise;
    }

    if (!MONGODB_URI) {
        throw new Error(
            'MONGODB_URI environment variable is not configured.'
        );
    }

    if (!client) {
        client = new MongoClient(MONGODB_URI);
    }

    dbPromise = client
        .connect()
        .then(() => {
            const db = client.db(DB_NAME);

            artifactsCollection =
                db.collection(COLLECTION_NAME);

            exhibitionsCollection =
                db.collection(EXHIBITIONS_COLLECTION_NAME);

            announcementsCollection =
                db.collection(ANNOUNCEMENTS_COLLECTION_NAME);

            console.log(
                `Connected to MongoDB Atlas — database "${DB_NAME}"`
            );

            return db;
        })
        .catch((error) => {
            dbPromise = null;
            throw error;
        });

    return dbPromise;
}

/*
 * Every API request makes sure MongoDB is available
 * before continuing to the route.
 */
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error(
            'MongoDB connection failed:',
            error.message
        );

        res.status(500).json({
            error: 'Database connection failed.'
        });
    }
});

// --------------------------------------------------
// HEALTH
// --------------------------------------------------

app.get('/api/health', async (req, res) => {
    try {
        await client.db(DB_NAME).command({ ping: 1 });

        res.json({
            status: 'ok',
            database: DB_NAME,
            collections: [
                COLLECTION_NAME,
                EXHIBITIONS_COLLECTION_NAME,
                ANNOUNCEMENTS_COLLECTION_NAME
            ]
        });
    } catch (error) {
        console.error(
            'Health check failed:',
            error.message
        );

        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// --------------------------------------------------
// ADMIN VERIFY
// --------------------------------------------------

app.get(
    '/api/admin/verify',
    requireAdmin,
    (req, res) => {
        res.json({
            ok: true
        });
    }
);

// --------------------------------------------------
// Helper: next numeric ID
// --------------------------------------------------

async function nextNumericId(collection) {
    const top = await collection
        .find()
        .sort({ id: -1 })
        .limit(1)
        .toArray();

    return (top[0]?.id || 0) + 1;
}

// ==================================================
// ARTIFACTS
// ==================================================

// GET ALL ARTIFACTS

app.get('/api/artifacts', async (req, res) => {
    try {
        const artifacts =
            await artifactsCollection
                .find(
                    {},
                    {
                        projection: {
                            _id: 0
                        }
                    }
                )
                .toArray();

        res.json(artifacts);

    } catch (error) {
        console.error(
            'Failed to fetch artifacts:',
            error
        );

        res.status(500).json({
            error:
                'Failed to load artifacts from the database.'
        });
    }
});

// GET SINGLE ARTIFACT

app.get('/api/artifacts/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);

        const artifact =
            await artifactsCollection.findOne(
                { id },
                {
                    projection: {
                        _id: 0
                    }
                }
            );

        if (!artifact) {
            return res.status(404).json({
                error: 'Artifact not found.'
            });
        }

        res.json(artifact);

    } catch (error) {
        console.error(
            'Failed to fetch artifact:',
            error
        );

        res.status(500).json({
            error:
                'Failed to load this artifact from the database.'
        });
    }
});

// CREATE ARTIFACT

app.post(
    '/api/artifacts',
    requireAdmin,
    async (req, res) => {
        try {
            if (!req.body.name) {
                return res.status(400).json({
                    error:
                        'An artifact needs at least a name.'
                });
            }

            const id =
                await nextNumericId(
                    artifactsCollection
                );

            const artifact = {
                ...req.body,
                id
            };

            delete artifact._id;

            await artifactsCollection.insertOne(
                artifact
            );

            res.status(201).json(artifact);

        } catch (error) {
            console.error(
                'Failed to create artifact:',
                error
            );

            res.status(500).json({
                error:
                    'Failed to save this artifact.'
            });
        }
    }
);

// UPDATE ARTIFACT

app.put(
    '/api/artifacts/:id',
    requireAdmin,
    async (req, res) => {
        try {
            const id =
                Number(req.params.id);

            const update = {
                ...req.body
            };

            delete update._id;
            delete update.id;

            const result =
                await artifactsCollection.findOneAndUpdate(
                    { id },
                    { $set: update },
                    {
                        returnDocument: 'after',
                        projection: {
                            _id: 0
                        }
                    }
                );

            if (!result) {
                return res.status(404).json({
                    error:
                        'Artifact not found.'
                });
            }

            res.json(result);

        } catch (error) {
            console.error(
                'Failed to update artifact:',
                error
            );

            res.status(500).json({
                error:
                    'Failed to update this artifact.'
            });
        }
    }
);

// DELETE ARTIFACT

app.delete(
    '/api/artifacts/:id',
    requireAdmin,
    async (req, res) => {
        try {
            const id =
                Number(req.params.id);

            const result =
                await artifactsCollection.deleteOne({
                    id
                });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    error:
                        'Artifact not found.'
                });
            }

            res.json({
                success: true
            });

        } catch (error) {
            console.error(
                'Failed to delete artifact:',
                error
            );

            res.status(500).json({
                error:
                    'Failed to delete this artifact.'
            });
        }
    }
);

// ==================================================
// EXHIBITIONS
// ==================================================

// GET ALL EXHIBITIONS

app.get(
    '/api/exhibitions',
    async (req, res) => {
        try {
            const exhibitions =
                await exhibitionsCollection
                    .find(
                        {},
                        {
                            projection: {
                                _id: 0
                            }
                        }
                    )
                    .toArray();

            res.json(exhibitions);

        } catch (error) {
            console.error(
                'Failed to fetch exhibitions:',
                error
            );

            res.status(500).json({
                error:
                    'Failed to load exhibitions from the database.'
            });
        }
    }
);

// GET SINGLE EXHIBITION

app.get(
    '/api/exhibitions/:id',
    async (req, res) => {
        try {
            const exhibition =
                await exhibitionsCollection.findOne(
                    {
                        id: req.params.id
                    },
                    {
                        projection: {
                            _id: 0
                        }
                    }
                );

            if (!exhibition) {
                return res.status(404).json({
                    error:
                        'Exhibition not found.'
                });
            }

            res.json(exhibition);

        } catch (error) {
            console.error(
                'Failed to fetch exhibition:',
                error
            );

            res.status(500).json({
                error:
                    'Failed to load this exhibition from the database.'
            });
        }
    }
);

// CREATE EXHIBITION

app.post(
    '/api/exhibitions',
    requireAdmin,
    async (req, res) => {
        try {
            const id =
                (req.body.id || '').trim();

            if (!id || !req.body.title) {
                return res.status(400).json({
                    error:
                        'An exhibition needs an id (slug) and a title.'
                });
            }

            const existing =
                await exhibitionsCollection.findOne({
                    id
                });

            if (existing) {
                return res.status(409).json({
                    error:
                        `An exhibition with id "${id}" already exists.`
                });
            }

            const exhibition = {
                ...req.body,
                id
            };

            delete exhibition._id;

            await exhibitionsCollection.insertOne(
                exhibition
            );

            res.status(201).json(
                exhibition
            );

        } catch (error) {
            console.error(
                'Failed to create exhibition:',
                error
            );

            res.status(500).json({
                error:
                    'Failed to save this exhibition.'
            });
        }
    }
);

// UPDATE EXHIBITION

app.put(
    '/api/exhibitions/:id',
    requireAdmin,
    async (req, res) => {
        try {
            const update = {
                ...req.body
            };

            delete update._id;
            delete update.id;

            const result =
                await exhibitionsCollection.findOneAndUpdate(
                    {
                        id: req.params.id
                    },
                    {
                        $set: update
                    },
                    {
                        returnDocument: 'after',
                        projection: {
                            _id: 0
                        }
                    }
                );

            if (!result) {
                return res.status(404).json({
                    error:
                        'Exhibition not found.'
                });
            }

            res.json(result);

        } catch (error) {
            console.error(
                'Failed to update exhibition:',
                error
            );

            res.status(500).json({
                error:
                    'Failed to update this exhibition.'
            });
        }
    }
);

// DELETE EXHIBITION

app.delete(
    '/api/exhibitions/:id',
    requireAdmin,
    async (req, res) => {
        try {
            const result =
                await exhibitionsCollection.deleteOne({
                    id: req.params.id
                });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    error:
                        'Exhibition not found.'
                });
            }

            res.json({
                success: true
            });

        } catch (error) {
            console.error(
                'Failed to delete exhibition:',
                error
            );

            res.status(500).json({
                error:
                    'Failed to delete this exhibition.'
            });
        }
    }
);

// ==================================================
// ANNOUNCEMENTS
// ==================================================

// GET ANNOUNCEMENTS

app.get(
    '/api/announcements',
    async (req, res) => {
        try {
            const announcements =
                await announcementsCollection
                    .find(
                        {},
                        {
                            projection: {
                                _id: 0
                            }
                        }
                    )
                    .sort({
                        id: -1
                    })
                    .toArray();

            res.json(announcements);

        } catch (error) {
            console.error(
                'Failed to fetch announcements:',
                error
            );

            res.status(500).json({
                error:
                    'Failed to load announcements from the database.'
            });
        }
    }
);

// CREATE ANNOUNCEMENT

app.post(
    '/api/announcements',
    requireAdmin,
    async (req, res) => {
        try {
            if (!req.body.title) {
                return res.status(400).json({
                    error:
                        'An announcement needs at least a title.'
                });
            }

            const id =
                await nextNumericId(
                    announcementsCollection
                );

            const announcement = {
                active: true,
                date: new Date().toISOString(),
                ...req.body,
                id
            };

            delete announcement._id;

            await announcementsCollection.insertOne(
                announcement
            );

            res.status(201).json(
                announcement
            );

        } catch (error) {
            console.error(
                'Failed to create announcement:',
                error
            );

            res.status(500).json({
                error:
                    'Failed to save this announcement.'
            });
        }
    }
);

// UPDATE ANNOUNCEMENT

app.put(
    '/api/announcements/:id',
    requireAdmin,
    async (req, res) => {
        try {
            const id =
                Number(req.params.id);

            const update = {
                ...req.body
            };

            delete update._id;
            delete update.id;

            const result =
                await announcementsCollection.findOneAndUpdate(
                    {
                        id
                    },
                    {
                        $set: update
                    },
                    {
                        returnDocument: 'after',
                        projection: {
                            _id: 0
                        }
                    }
                );

            if (!result) {
                return res.status(404).json({
                    error:
                        'Announcement not found.'
                });
            }

            res.json(result);

        } catch (error) {
            console.error(
                'Failed to update announcement:',
                error
            );

            res.status(500).json({
                error:
                    'Failed to update this announcement.'
            });
        }
    }
);

// DELETE ANNOUNCEMENT

app.delete(
    '/api/announcements/:id',
    requireAdmin,
    async (req, res) => {
        try {
            const id =
                Number(req.params.id);

            const result =
                await announcementsCollection.deleteOne({
                    id
                });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    error:
                        'Announcement not found.'
                });
            }

            res.json({
                success: true
            });

        } catch (error) {
            console.error(
                'Failed to delete announcement:',
                error
            );

            res.status(500).json({
                error:
                    'Failed to delete this announcement.'
            });
        }
    }
);

// --------------------------------------------------
// Export Express application for Vercel
// --------------------------------------------------

module.exports = app;
