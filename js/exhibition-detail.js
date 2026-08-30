/**
 * exhibition-detail.js
 * Powers exhibition.html (exhibition.html?id=<slug>). Loads the
 * shared exhibitions + artifacts datasets from MongoDB (via the same
 * local API + fallback pattern used everywhere else on the site),
 * renders one exhibition in full — including its cover image when it
 * has one — and links out to each linked artifact's real
 * artifact.html page. Artifact references stay glyph-only (no
 * per-artifact images on this page, only the exhibition's own cover).
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

document.addEventListener('DOMContentLoaded', init);

async function init() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    let artifacts, exhibitions;
    try {
        [artifacts, exhibitions] = await Promise.all([loadArtifacts(), loadExhibitions()]);
    } catch (err) {
        console.error('Exhibition data failed to load:', err);
        showNotFound('Unable to load exhibition', 'Please refresh the page, or open this project with a local server instead of a plain file:// path.');
        return;
    }

    const artifactsById = new Map(artifacts.map(a => [a.id, a]));
    const exhibition = exhibitions.find(e => String(e.id) === String(id));

    if (!id || !exhibition) {
        showNotFound();
        return;
    }

    const hydrated = {
        ...exhibition,
        artifacts: exhibition.artifactIds.map(aid => artifactsById.get(aid)).filter(Boolean),
    };

    document.title = `${hydrated.title} | Egypt Digital Museum`;
    renderExhibition(hydrated);
    renderPrevNext(exhibition, exhibitions);
}

function renderExhibition(ex) {
    $('breadcrumbCurrent').textContent = ex.title;
    $('detailEyebrow').textContent = `EXHIBITION / ${(ex.categoryLabel || '').toUpperCase()}`;
    $('detailTitle').textContent = ex.title;
    $('detailDescription').textContent = ex.longDescription || ex.description || '';

    $('detailFacts').innerHTML = [
        ['Period', ex.period],
        ['Category', ex.categoryLabel],
        ['Artifacts', String(ex.artifacts.length)],
    ].map(([label, value]) => `
        <div><span>${esc(label)}</span><strong>${esc(value || '—')}</strong></div>
    `).join('');

    // Cover image: if the exhibition has one, turn the hero into a
    // full-bleed image with a scrim so the existing text stays
    // readable — same has-image/onerror-fallback pattern used on
    // exhibitions.html's cards.
    const hero = $('exhibitionHero');
    if (hero && ex.image) {
        const img = document.createElement('img');
        img.src = ex.image;
        img.alt = '';
        img.loading = 'lazy';
        img.className = 'exhibition-hero-bg';
        img.onerror = () => {
            img.remove();
            scrim.remove();
            hero.classList.remove('has-image');
        };

        const scrim = document.createElement('div');
        scrim.className = 'exhibition-hero-scrim';
        scrim.setAttribute('aria-hidden', 'true');

        hero.prepend(scrim);
        hero.prepend(img);
        hero.classList.add('has-image');
    }

    const grid = $('linkedArtifactGrid');
    if (!ex.artifacts.length) {
        grid.innerHTML = '<p class="linked-artifacts-empty">No artifacts linked to this exhibition yet.</p>';
    } else {
        grid.innerHTML = ex.artifacts.map(a => `
            <article class="linked-artifact-card" data-id="${esc(a.id)}" role="listitem" tabindex="0"
                     aria-label="${esc(a.name)} — ${esc(a.period)}">
                <div class="linked-artifact-glyph" aria-hidden="true">𓂀</div>
                <div class="linked-artifact-body">
                    <h3>${esc(a.name)}</h3>
                    <p class="linked-artifact-meta">${esc(a.dynasty)}<br>${esc(a.date)} · ${esc(a.category)}</p>
                    <span class="linked-artifact-explore">View Artifact →</span>
                </div>
            </article>
        `).join('');

        grid.addEventListener('click', goToArtifactCard);
        grid.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                goToArtifactCard(e);
            }
        });
    }
}

function goToArtifactCard(e) {
    const card = e.target.closest('.linked-artifact-card[data-id]');
    if (card) window.location.href = `artifact.html?id=${encodeURIComponent(card.dataset.id)}`;
}

function renderPrevNext(current, all) {
    const container = $('prevNextLinks');
    if (!container) return;

    const index = all.findIndex(e => e.id === current.id);
    if (index === -1) return;

    const prev = index > 0 ? all[index - 1] : null;
    const next = index < all.length - 1 ? all[index + 1] : null;

    container.innerHTML = [
        prev ? `<a href="exhibition.html?id=${encodeURIComponent(prev.id)}" aria-label="Previous exhibition: ${esc(prev.title)}">← Previous</a>` : '',
        next ? `<a href="exhibition.html?id=${encodeURIComponent(next.id)}" aria-label="Next exhibition: ${esc(next.title)}">Next →</a>` : '',
    ].join('');
}

function showNotFound(title = 'Exhibition not found', message = "This exhibition doesn't exist or may have been removed.") {
    $('exhibitionDetailContent')?.classList.add('hidden');
    const el = $('notFoundState');
    el.querySelector('h1').textContent = title;
    el.querySelector('p').textContent = message;
    el.classList.remove('hidden');
}
