/**
 * artifact-detail.js
 * Powers artifact.html (Phase 7). Reads the numeric id from the URL
 * query string (artifact.html?id=1), loads the shared dataset, and
 * renders one artifact in full plus a set of related artifacts
 * (Phase 10).
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

// Same local-API-with-fallback pattern as artifacts.js — see there
// for why.
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

document.addEventListener('DOMContentLoaded', init);

async function init() {
    // Mobile hamburger menu is wired up once, for every page, by
    // nav-links.js — no need to duplicate that listener here.

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    let artifacts;
    try {
        artifacts = await loadArtifacts();
    } catch (err) {
        console.error('Artifact data failed to load:', err);
        showError();
        return;
    }

    const artifact = artifacts.find(a => String(a.id) === String(id));

    if (!id || !artifact) {
        showNotFound();
        return;
    }

    document.title = `${artifact.name} | Egypt Digital Museum`;
    renderArtifact(artifact);
    renderRelated(artifact, artifacts);
}

/* ══════════════════════════════════════════════════════
   RENDER — MAIN ARTIFACT
══════════════════════════════════════════════════════ */
function renderArtifact(a) {
    const hasImage = Boolean(a.image);
    const saved = typeof Collection !== 'undefined' && Collection.has(a.id);

    $('detailImageWrap').innerHTML = `
        ${hasImage
            ? `<img src="${esc(a.image)}" alt="${esc(a.name)}" loading="lazy"
                    onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">`
            : ''}
        <div class="detail-image-placeholder" ${hasImage ? 'style="display:none"' : ''}>𓂀</div>
        <button type="button" id="detailSave" class="detail-save ${saved ? 'saved' : ''}"
                aria-pressed="${saved}" aria-label="${saved ? 'Remove from' : 'Add to'} My Collection">
            <span aria-hidden="true">${saved ? '♥' : '♡'}</span> ${saved ? 'Saved' : 'Save'}
        </button>`;

    $('detailPeriodTag').textContent = `${a.period} · ${a.dynasty}`;
    $('detailName').textContent = a.name;
    $('detailSubtitle').textContent = a.subtitle || '';
    $('detailObjectId').textContent = a.objectId || '';

    $('detailFacts').innerHTML = [
        ['Date', a.date],
        ['Category', a.category],
        ['Material', a.material],
        ['Dimensions', a.dimensions],
        ['Origin', a.origin],
        ['Current Location', a.location],
    ].map(([label, value]) => `
        <div><span>${esc(label)}</span><strong>${esc(value || '—')}</strong></div>
    `).join('');

    $('detailDiscovery').textContent = a.discovery || 'Discovery details are not recorded for this item.';
    $('detailDescription').textContent = a.description || '';
    $('detailSignificance').textContent = a.significance || '';

    const sourceLink = $('detailSourceLink');
    if (a.sourceUrl) {
        sourceLink.href = a.sourceUrl;
        sourceLink.textContent = a.sourceName ? `${a.sourceName} ↗` : 'View source ↗';
        sourceLink.closest('.detail-source').classList.remove('hidden');
    } else {
        sourceLink.closest('.detail-source').classList.add('hidden');
    }

    $('detailSave')?.addEventListener('click', function () {
        if (typeof Collection === 'undefined') return;
        const nowSaved = Collection.toggle(a.id);
        this.classList.toggle('saved', nowSaved);
        this.setAttribute('aria-pressed', String(nowSaved));
        this.setAttribute('aria-label', `${nowSaved ? 'Remove from' : 'Add to'} My Collection`);
        this.innerHTML = `<span aria-hidden="true">${nowSaved ? '♥' : '♡'}</span> ${nowSaved ? 'Saved' : 'Save'}`;
    });

    $('detailContent').classList.remove('hidden');
}

/* ══════════════════════════════════════════════════════
   RELATED ARTIFACTS (Phase 10)
   Priority: matching period > category > dynasty. Excludes self.
══════════════════════════════════════════════════════ */
function renderRelated(current, all) {
    const others = all.filter(a => String(a.id) !== String(current.id));

    const scored = others.map(a => {
        let score = 0;
        if (a.period === current.period)   score += 3;
        if (a.category === current.category) score += 2;
        if (a.dynasty === current.dynasty)   score += 1;
        return { a, score };
    }).filter(x => x.score > 0);

    scored.sort((x, y) => y.score - x.score);
    const related = scored.slice(0, 4).map(x => x.a);

    const section = $('relatedSection');
    const grid = $('relatedGrid');
    if (!related.length) {
        section.classList.add('hidden');
        return;
    }

    grid.innerHTML = related.map(a => {
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
            </div>
            <div class="artifact-info">
                <h3>${esc(a.name)}</h3>
                <p class="artifact-meta">${esc(a.dynasty)}<br>${esc(a.date)} · ${esc(a.category)}</p>
                <span class="explore-label">EXPLORE ARTIFACT →</span>
            </div>
        </article>`;
    }).join('');

    grid.addEventListener('click', e => {
        const card = e.target.closest('.artifact-card[data-id]');
        if (card) window.location.href = `artifact.html?id=${encodeURIComponent(card.dataset.id)}`;
    });
    grid.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const card = e.target.closest('.artifact-card[data-id]');
        if (card) {
            e.preventDefault();
            window.location.href = `artifact.html?id=${encodeURIComponent(card.dataset.id)}`;
        }
    });
}

/* ══════════════════════════════════════════════════════
   ERROR / NOT-FOUND STATES (Phase 15)
══════════════════════════════════════════════════════ */
function showNotFound() {
    $('detailContent')?.classList.add('hidden');
    $('relatedSection')?.classList.add('hidden');
    $('notFoundState').classList.remove('hidden');
}

function showError() {
    $('detailContent')?.classList.add('hidden');
    $('relatedSection')?.classList.add('hidden');
    const el = $('notFoundState');
    el.querySelector('h1').textContent = 'Collection could not be loaded';
    el.querySelector('p').textContent = 'Please refresh the page, or open this project with a local server instead of a plain file:// path.';
    el.classList.remove('hidden');
}
