/**
 * artifacts.js
 * Handles: smooth scroll (Lenis), loader, mobile nav,
 * artifact data fetch, search/filter/sort, grid render,
 * featured artifact, and the "My Collection" panel.
 *
 * Clicking a card navigates to artifact.html?id=<id> (Phase 7) —
 * this page no longer opens an inline detail modal.
 */

'use strict';

/* ── Helpers ─────────────────────────────────────────── */
const $ = id => document.getElementById(id);

/** Escape HTML to prevent XSS when inserting user/data strings */
function esc(v) {
    return String(v ?? '').replaceAll('&', '&amp;')
                           .replaceAll('<', '&lt;')
                           .replaceAll('>', '&gt;')
                           .replaceAll('"', '&quot;')
                           .replaceAll("'", '&#039;');
}

/* ── State ───────────────────────────────────────────── */
// While you're developing locally with the MongoDB-backed API
// server (see /server), this points at it. If that server isn't
// running for some reason, we fall back to the static JSON file so
// the page still works.
const API_URL = '/api/artifacts';
const FALLBACK_DATA_URL = 'json/artifacts.json';

async function loadArtifacts() {
    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`API responded ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn('Local API unavailable, falling back to json/artifacts.json:', err.message);
        const res = await fetch(FALLBACK_DATA_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    }
}

const state = {
    artifacts: [],
    filtered: [],
};

/* ── DOM refs (assigned after DOMContentLoaded) ──────── */
let grid, count, empty, searchInput, periodFilter, categoryFilter, sortSelect;
let collectionModal, collectionList, collectionCountEl;

/* ══════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', init);

async function init() {

    // Smooth scroll (Lenis) and the loading-screen progress animation
    // are both handled once, centrally, by main.js — which is loaded
    // on every page. Running either one again here would start a
    // second, competing animation loop, so this file only owns
    // page-specific logic (data, filters, grid, collection).

    // Mobile hamburger menu is wired up once, for every page, by
    // nav-links.js — no need to duplicate that listener here.

    /* ── DOM refs ── */
    grid            = $('artifactGrid');
    count           = $('resultCount');
    empty           = $('emptyState');
    searchInput     = $('searchInput');
    periodFilter    = $('periodFilter');
    categoryFilter  = $('categoryFilter');
    sortSelect      = $('sortSelect');
    collectionModal = $('collectionModal');
    collectionList  = $('collectionList');
    collectionCountEl = $('collectionCount');

    /* ── Load data ── */
    try {
        state.artifacts = await loadArtifacts();
        populateFilters();
        applyFilters();
        renderFeatured();
    } catch (err) {
        console.error('Artifact data failed to load:', err);
        count.textContent = 'Data unavailable';
        grid.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1">
                <div class="empty-symbol">𓂀</div>
                <h3>Collection could not be loaded</h3>
                <p>Please refresh the page, or open this project with a local server (e.g. VS Code Live Server) instead of a plain file:// path.</p>
            </div>`;
        $('featuredSection')?.classList.add('hidden');
        return;
    }

    /* ── Filter / sort listeners ── */
    searchInput.addEventListener('input', applyFilters);
    [periodFilter, categoryFilter, sortSelect].forEach(el =>
        el.addEventListener('change', applyFilters)
    );

    $('resetFilters')?.addEventListener('click', resetFilters);

    /* ── Card click (event delegation): open detail page or toggle save ── */
    grid.addEventListener('click', e => {
        const saveBtn = e.target.closest('.save-toggle');
        if (saveBtn) {
            e.stopPropagation();
            toggleSave(saveBtn.dataset.id, saveBtn);
            return;
        }
        const card = e.target.closest('.artifact-card[data-id]');
        if (card) goToArtifact(card.dataset.id);
    });

    grid.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const card = e.target.closest('.artifact-card[data-id]');
        if (card) {
            e.preventDefault();
            goToArtifact(card.dataset.id);
        }
    });

    /* ── My Collection panel ── */
    $('collectionToggle')?.addEventListener('click', openCollectionPanel);
    $('collectionModalClose')?.addEventListener('click', closeCollectionPanel);
    collectionModal?.addEventListener('click', e => {
        if (e.target.matches('[data-close-modal]')) closeCollectionPanel();
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeCollectionPanel();
    });

    updateCollectionBadge();
}

function goToArtifact(id) {
    window.location.href = `artifact.html?id=${encodeURIComponent(id)}`;
}

/* ══════════════════════════════════════════════════════
   FEATURED ARTIFACT (Phase 8)
══════════════════════════════════════════════════════ */
function renderFeatured() {
    const section = $('featuredSection');
    if (!section) return;

    const featuredList = state.artifacts.filter(a => a.featured);
    if (!featuredList.length) {
        section.classList.add('hidden');
        return;
    }

    // Rotate through featured artifacts by day so the section changes
    // over time without needing a backend.
    const dayIndex = Math.floor(Date.now() / 86400000) % featuredList.length;
    const a = featuredList[dayIndex];
    const hasImage = Boolean(a.image);

    section.innerHTML = `
        <article class="featured-card">
            <div class="featured-image">
                ${hasImage
                    ? `<img src="${esc(a.image)}" alt="${esc(a.name)}" loading="lazy"
                            onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">`
                    : ''}
                <div class="featured-placeholder" ${hasImage ? 'style="display:none"' : ''}>𓂀</div>
            </div>
            <div class="featured-body">
                <span class="featured-tag">Featured Artifact</span>
                <p class="featured-period">${esc(a.period)} · ${esc(a.dynasty)}</p>
                <h2>${esc(a.name)}</h2>
                <p>${esc(a.description)}</p>
                <a class="featured-explore" href="artifact.html?id=${encodeURIComponent(a.id)}">Explore Artifact →</a>
            </div>
        </article>`;
}

/* ══════════════════════════════════════════════════════
   FILTERS
══════════════════════════════════════════════════════ */
function populateFilters() {
    const addOptions = (select, values) =>
        [...new Set(values)].sort().forEach(v =>
            select.insertAdjacentHTML('beforeend', `<option value="${esc(v)}">${esc(v)}</option>`)
        );

    addOptions(periodFilter,   state.artifacts.map(a => a.period));
    addOptions(categoryFilter, state.artifacts.map(a => a.category));
}

function applyFilters() {
    const q = searchInput.value.toLowerCase().trim();
    const p = periodFilter.value;
    const c = categoryFilter.value;

    let results = state.artifacts.filter(a => {
        const text = [
            a.name, a.objectId, a.period, a.dynasty, a.category,
            a.material, a.location, a.description,
        ].join(' ').toLowerCase();

        return (!q || text.includes(q))
            && (p === 'all' || a.period   === p)
            && (c === 'all' || a.category === c);
    });

    results.sort((a, b) => {
        switch (sortSelect.value) {
            case 'az':      return a.name.localeCompare(b.name);
            case 'za':      return b.name.localeCompare(a.name);
            case 'oldest':  return a.sortYear - b.sortYear;
            case 'newest':  return b.sortYear - a.sortYear;
            default:        return Number(b.featured) - Number(a.featured);
        }
    });

    state.filtered = results;
    renderGrid(results);

    const n = results.length;
    count.textContent = `${n} artifact${n === 1 ? '' : 's'} found`;
    empty.classList.toggle('hidden', n > 0);
}

function resetFilters() {
    searchInput.value    = '';
    periodFilter.value   = 'all';
    categoryFilter.value = 'all';
    sortSelect.value     = 'featured';
    applyFilters();
}

/* ══════════════════════════════════════════════════════
   RENDER GRID
══════════════════════════════════════════════════════ */
function renderGrid(list) {
    grid.innerHTML = list.map(a => {
        const hasImage = Boolean(a.image);
        const saved = Collection.has(a.id);
        return `
        <article class="artifact-card" data-id="${esc(a.id)}" role="listitem" tabindex="0"
                 aria-label="${esc(a.name)} — ${esc(a.period)}">
            <div class="artifact-image">
                ${hasImage
                    ? `<img src="${esc(a.image)}" alt="${esc(a.name)}" loading="lazy"
                            onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">`
                    : ''}
                <div class="artifact-placeholder" ${hasImage ? 'style="display:none"' : ''}>𓂀</div>
                <span class="artifact-period">${esc(a.period)}</span>
                <button type="button" class="save-toggle ${saved ? 'saved' : ''}" data-id="${esc(a.id)}"
                        aria-pressed="${saved}"
                        aria-label="${saved ? 'Remove from' : 'Add to'} My Collection">${saved ? '♥' : '♡'}</button>
            </div>
            <div class="artifact-info">
                <h3>${esc(a.name)}</h3>
                <p class="artifact-meta">${esc(a.dynasty)}<br>${esc(a.date)} · ${esc(a.category)}</p>
                <span class="explore-label">EXPLORE ARTIFACT →</span>
            </div>
        </article>`;
    }).join('');
}

/* ══════════════════════════════════════════════════════
   MY COLLECTION (Phase 9)
══════════════════════════════════════════════════════ */
function toggleSave(id, btnEl) {
    const nowSaved = Collection.toggle(id);
    if (btnEl) {
        btnEl.classList.toggle('saved', nowSaved);
        btnEl.textContent = nowSaved ? '♥' : '♡';
        btnEl.setAttribute('aria-pressed', String(nowSaved));
        btnEl.setAttribute('aria-label', `${nowSaved ? 'Remove from' : 'Add to'} My Collection`);
    }
    updateCollectionBadge();
    if (collectionModal && !collectionModal.classList.contains('hidden')) {
        renderCollectionPanel();
    }
}

function updateCollectionBadge() {
    if (collectionCountEl) collectionCountEl.textContent = Collection.count();
}

function openCollectionPanel() {
    renderCollectionPanel();
    collectionModal.classList.remove('hidden');
    document.body.classList.add('modal-open');
    requestAnimationFrame(() => $('collectionModalClose')?.focus());
}

function closeCollectionPanel() {
    collectionModal?.classList.add('hidden');
    document.body.classList.remove('modal-open');
}

function renderCollectionPanel() {
    const ids = Collection.getAll();
    const items = state.artifacts.filter(a => ids.includes(String(a.id)));

    if (!items.length) {
        collectionList.innerHTML = `
            <div class="collection-empty" style="grid-column:1/-1">
                <p>You haven't saved any artifacts yet. Tap the ♡ on any artifact card to add it here.</p>
            </div>`;
        return;
    }

    collectionList.innerHTML = items.map(a => {
        const hasImage = Boolean(a.image);
        return `
        <article class="artifact-card" data-id="${esc(a.id)}" role="listitem" tabindex="0"
                 aria-label="${esc(a.name)} — ${esc(a.period)}">
            <div class="artifact-image">
                ${hasImage
                    ? `<img src="${esc(a.image)}" alt="${esc(a.name)}" loading="lazy"
                            onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">`
                    : ''}
                <div class="artifact-placeholder" ${hasImage ? 'style="display:none"' : ''}>𓂀</div>
                <span class="artifact-period">${esc(a.period)}</span>
                <button type="button" class="save-toggle saved" data-id="${esc(a.id)}"
                        aria-pressed="true" aria-label="Remove from My Collection">♥</button>
            </div>
            <div class="artifact-info">
                <h3>${esc(a.name)}</h3>
                <p class="artifact-meta">${esc(a.dynasty)}<br>${esc(a.date)} · ${esc(a.category)}</p>
                <span class="explore-label">EXPLORE ARTIFACT →</span>
            </div>
        </article>`;
    }).join('');

    // Delegate clicks inside the collection list too
    collectionList.onclick = e => {
        const saveBtn = e.target.closest('.save-toggle');
        if (saveBtn) {
            e.stopPropagation();
            toggleSave(saveBtn.dataset.id);
            renderGrid(state.filtered); // keep grid hearts in sync
            return;
        }
        const card = e.target.closest('.artifact-card[data-id]');
        if (card) goToArtifact(card.dataset.id);
    };
}
