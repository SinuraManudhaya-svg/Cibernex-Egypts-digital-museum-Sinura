/**
 * exhibitions.js
 * Powers exhibitions.html (the browse/collection page only — the
 * detail view lives on its own page, exhibition.html, exactly like
 * artifacts.html -> artifact.html).
 *
 * Exhibition content is served from MongoDB via /api/exhibitions,
 * falling back to json/exhibitions.json if the local API is down —
 * the same pattern artifacts.js already uses. Each exhibition only
 * stores which artifact ids it references — full artifact details
 * (period, dynasty, etc.) are always pulled live from the shared
 * artifact dataset, never duplicated by hand.
 */

'use strict';

const $ = id => document.getElementById(id);

function esc(v) {
    return String(v ?? '').replaceAll('&', '&amp;')
                           .replaceAll('<', '&lt;')
                           .replaceAll('>', '&gt;')
                           .replaceAll('"', '&quot;')
                           .replaceAll("'", '&#039;');
}

// Same local-API-with-fallback pattern used everywhere else on the site.
const ARTIFACTS_API_URL = '/api/artifacts';
const ARTIFACTS_FALLBACK_URL = 'json/artifacts.json';
const EXHIBITIONS_API_URL = '/api/exhibitions';
const EXHIBITIONS_FALLBACK_URL = 'json/exhibitions.json';

async function loadArtifacts() {
    try {
        const res = await fetch(ARTIFACTS_API_URL);
        if (!res.ok) throw new Error(`API responded ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn('Local API unavailable, falling back to json/artifacts.json:', err.message);
        const res = await fetch(ARTIFACTS_FALLBACK_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    }
}

async function loadExhibitions() {
    try {
        const res = await fetch(EXHIBITIONS_API_URL);
        if (!res.ok) throw new Error(`API responded ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn('Local API unavailable, falling back to json/exhibitions.json:', err.message);
        const res = await fetch(EXHIBITIONS_FALLBACK_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    }
}

const CATEGORIES = [
    { slug: 'all', label: 'All' },
    { slug: 'pharaohs', label: 'Pharaohs' },
    { slug: 'gods-mythology', label: 'Gods & Mythology' },
    { slug: 'life-death', label: 'Life & Death' },
    { slug: 'art-culture', label: 'Art & Culture' },
    { slug: 'science-technology', label: 'Science & Technology' },
    { slug: 'architecture', label: 'Architecture' },
    { slug: 'writing-knowledge', label: 'Writing & Knowledge' },
];

const state = {
    exhibitions: [],
    artifactsById: new Map(),
    activeCategory: 'all',
    activeSort: 'featured',
    searchTerm: '',
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
    let artifacts, exhibitionsMeta;
    try {
        [artifacts, exhibitionsMeta] = await Promise.all([loadArtifacts(), loadExhibitions()]);
    } catch (err) {
        console.error('Exhibitions data failed to load:', err);
        showFatalError();
        return;
    }

    artifacts.forEach(a => state.artifactsById.set(a.id, a));
    state.exhibitions = exhibitionsMeta.map(hydrateExhibition);

    renderFeatured();
    renderCategoryChips();
    renderGrid();

    // Delegated once here (not inside renderGrid) so repeated
    // searches/filters never stack up duplicate listeners.
    const grid = $('exhibitionGrid');
    grid?.addEventListener('click', goToCard);
    grid?.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            goToCard(e);
        }
    });

    $('exhibitionSearch')?.addEventListener('input', e => {
        state.searchTerm = e.target.value.trim().toLowerCase();
        renderGrid();
    });
    $('exhibitionSort')?.addEventListener('change', e => {
        state.activeSort = e.target.value;
        renderGrid();
    });
    $('resetFiltersBtn')?.addEventListener('click', () => {
        state.activeCategory = 'all';
        state.activeSort = 'featured';
        state.searchTerm = '';
        if ($('exhibitionSearch')) $('exhibitionSearch').value = '';
        if ($('exhibitionSort')) $('exhibitionSort').value = 'featured';
        document.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c.dataset.category === 'all'));
        renderGrid();
    });
}

function showFatalError() {
    document.querySelectorAll('#main > section').forEach(el => el.classList.add('hidden'));
    $('exhibitionsFatalError')?.classList.remove('hidden');
}

// Resolve an exhibition's linked artifacts, derived live from the
// shared artifact dataset — never hardcoded.
function hydrateExhibition(meta) {
    const artifacts = meta.artifactIds
        .map(id => state.artifactsById.get(id))
        .filter(Boolean);

    return { ...meta, artifacts, artifactCount: artifacts.length };
}

function renderFeatured() {
    const el = $('featuredExhibition');
    if (!el) return;

    const featuredList = state.exhibitions.filter(e => e.featured);
    if (!featuredList.length) {
        el.classList.add('hidden');
        return;
    }

    // Rotate through featured exhibitions by day, same pattern used
    // for the featured artifact on artifacts.html.
    const dayIndex = Math.floor(Date.now() / 86400000) % featuredList.length;
    const ex = featuredList[dayIndex];
    const hasImage = Boolean(ex.image);

    el.innerHTML = `
        <div class="featured-visual" aria-hidden="true">
            ${hasImage
                ? `<img src="${esc(ex.image)}" alt="" loading="lazy" class="featured-visual-img"
                        onerror="this.remove(); this.parentElement.classList.remove('has-image');">`
                : ''}
            <span class="featured-glyph">${esc(ex.glyph || '𓂀')}</span>
        </div>
        <div class="featured-body">
            <p class="section-label">FEATURED EXHIBITION</p>
            <h3>${esc(ex.title)}</h3>
            <p class="prose">${esc(ex.longDescription)}</p>
            <div class="featured-meta">
                <div><span>Period</span><strong>${esc(ex.period || '—')}</strong></div>
                <div><span>Artifacts</span><strong>${ex.artifactCount}</strong></div>
                <div><span>Category</span><strong>${esc(ex.categoryLabel)}</strong></div>
            </div>
            <a href="exhibition.html?id=${encodeURIComponent(ex.id)}" class="btn btn-primary">Explore Exhibition →</a>
        </div>
    `;

    if (hasImage) el.querySelector('.featured-visual')?.classList.add('has-image');
}

function renderCategoryChips() {
    const row = $('categoryChips');
    if (!row) return;

    row.innerHTML = CATEGORIES.map(c => `
        <button type="button" class="chip ${c.slug === state.activeCategory ? 'active' : ''}" data-category="${esc(c.slug)}">
            ${esc(c.label)}
        </button>
    `).join('');

    row.addEventListener('click', e => {
        const btn = e.target.closest('.chip');
        if (!btn) return;
        state.activeCategory = btn.dataset.category;
        row.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === btn));
        renderGrid();
    });
}

function renderGrid() {
    const grid = $('exhibitionGrid');
    const countEl = $('exhibitionResultsCount');
    const empty = $('exhibitionEmpty');
    if (!grid) return;

    let list = state.exhibitions.filter(ex =>
        state.activeCategory === 'all' || ex.category === state.activeCategory
    );

    if (state.searchTerm) {
        const term = state.searchTerm;
        list = list.filter(ex =>
            ex.title.toLowerCase().includes(term) ||
            ex.categoryLabel.toLowerCase().includes(term) ||
            ex.description.toLowerCase().includes(term) ||
            (ex.period || '').toLowerCase().includes(term)
        );
    }

    if (state.activeSort === 'az') list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    else if (state.activeSort === 'za') list = [...list].sort((a, b) => b.title.localeCompare(a.title));
    else list = [...list].sort((a, b) => Number(b.featured) - Number(a.featured));

    if (countEl) countEl.textContent = `${list.length} exhibition${list.length === 1 ? '' : 's'} found`;

    if (!list.length) {
        grid.innerHTML = '';
        empty?.classList.remove('hidden');
        return;
    }
    empty?.classList.add('hidden');

    grid.innerHTML = list.map(ex => {
        const hasImage = Boolean(ex.image);
        return `
        <article class="exhibition-card ${hasImage ? 'has-image' : ''}" data-id="${esc(ex.id)}" role="listitem" tabindex="0"
                 aria-label="${esc(ex.title)} — ${esc(ex.categoryLabel)}">
            ${hasImage
                ? `<img src="${esc(ex.image)}" alt="" loading="lazy" class="exhibition-card-bg"
                        onerror="this.remove(); this.closest('.exhibition-card').classList.remove('has-image');">`
                : ''}
            <div class="exhibition-card-scrim" aria-hidden="true"></div>
            <div class="exhibition-card-content">
                <span class="tag">${esc(ex.categoryLabel)}</span>
                <h3>${esc(ex.title)}</h3>
                <p>${esc(ex.description)}</p>
                <div class="exhibition-card-meta">
                    ${ex.period ? `<span>${esc(ex.period)}</span>` : ''}
                    <span>${ex.artifactCount} artifact${ex.artifactCount === 1 ? '' : 's'}</span>
                </div>
                <span class="btn btn-secondary">Explore →</span>
            </div>
        </article>
    `;
    }).join('');
}

function goToCard(e) {
    const card = e.target.closest('.exhibition-card[data-id]');
    if (card) window.location.href = `exhibition.html?id=${encodeURIComponent(card.dataset.id)}`;
}

const title = String(ex.title || '').toLowerCase();
const category = String(ex.categoryLabel || '').toLowerCase();
const description = String(ex.description || '').toLowerCase();
const period = String(ex.period || '').toLowerCase();

list = list.filter(() =>
    title.includes(term) ||
    category.includes(term) ||
    description.includes(term) ||
    period.includes(term)
);
