/**
 * announcements.js
 * Loads active announcements from the API and renders them at the
 * bottom of the homepage (index.html). Announcements only live in
 * MongoDB — there's no static json/announcements.json fallback like
 * artifacts and exhibitions have — so if the local API server isn't
 * running, this quietly hides the whole section instead of showing
 * an error. Announcements are a nice-to-have, not core content, so a
 * missing section here shouldn't alarm a visitor the way a broken
 * artifacts page would.
 */

'use strict';

(async function () {
    const section = document.getElementById('announcementsSection');
    const list = document.getElementById('announcementsList');
    if (!section || !list) return;

    function esc(v) {
        return String(v ?? '').replaceAll('&', '&amp;')
                               .replaceAll('<', '&lt;')
                               .replaceAll('>', '&gt;')
                               .replaceAll('"', '&quot;')
                               .replaceAll("'", '&#039;');
    }

    function formatDate(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }

    try {
        const res = await fetch('http://localhost:3000/api/announcements');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const all = await res.json();
        const active = Array.isArray(all) ? all.filter(a => a.active) : [];

        if (!active.length) {
            section.classList.add('hidden');
            return;
        }

        list.innerHTML = active.map(a => `
            <article class="announcement-item">
                <time class="announcement-date">${esc(formatDate(a.date))}</time>
                <div class="announcement-body">
                    <h3>${esc(a.title)}</h3>
                    <p>${esc(a.message)}</p>
                </div>
            </article>
        `).join('');
    } catch (err) {
        console.warn('Announcements unavailable (is the API server running?):', err.message);
        section.classList.add('hidden');
    }
})();