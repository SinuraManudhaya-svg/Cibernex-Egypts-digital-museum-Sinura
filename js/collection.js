/**
 * collection.js
 */
'use strict';

const Collection = (function () {
    const KEY = 'edm_saved_artifacts';

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
        }
    }

    return {
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
                return false;
            }
            this.add(key);
            return true;
        },

        count() {
            return readAll().length;
        }
    };
})();
