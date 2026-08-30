/**
 * collection.js
 * Small shared helper around localStorage for "My Collection".
 * Stores an array of saved artifact IDs under one key so both the
 * artifact grid page and the artifact detail page stay in sync.
 *
 * Exposes a global `Collection` object — loaded before artifacts.js
 * and artifact-detail.js on every page that needs it.
 */
'use strict';

const Collection = (function () {
    const KEY = 'edm_saved_artifacts';

    /** Read the saved ID list. Guards against corrupted/missing storage. */
    function readAll() {
        try {
            const raw = localStorage.getItem(KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    function writeAll(ids) {
        try {
            localStorage.setItem(KEY, JSON.stringify(ids));
        } catch {
            // localStorage may be unavailable (private browsing, quota, etc.)
            // Fail silently — the collection simply won't persist.
        }
    }

    return {
        /** All saved artifact IDs (as strings) */
        getAll() {
            return readAll();
        },

        has(id) {
            return readAll().includes(String(id));
        },

        add(id) {
            const ids = readAll();
            const key = String(id);
            if (!ids.includes(key)) {
                ids.push(key);
                writeAll(ids);
            }
        },

        remove(id) {
            const ids = readAll().filter(x => x !== String(id));
            writeAll(ids);
        },

        toggle(id) {
            const key = String(id);
            if (this.has(key)) {
                this.remove(key);
                return false; // now unsaved
            }
            this.add(key);
            return true; // now saved
        },

        count() {
            return readAll().length;
        }
    };
})();