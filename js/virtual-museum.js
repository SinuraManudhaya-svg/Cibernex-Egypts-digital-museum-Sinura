/**
 * virtual-museum.js
 * Powers virtual-museum.html. Each "room" is one of your existing
 * exhibitions — nothing new to seed or maintain. Loads the same
 * MongoDB-backed exhibitions + artifacts data as exhibitions.html
 * (API first, json/ fallback), then lets the visitor walk room to
 * room with prev/next controls, quick-jump tabs, and arrow keys.
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

const ARTIFACTS_API_URL = 'http://localhost:3000/api/artifacts';
const ARTIFACTS_FALLBACK_URL = 'json/artifacts.json';
const EXHIBITIONS_API_URL = 'http://localhost:3000/api/exhibitions';
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

// Scattered percentage positions for hotspot dots, reused across
// rooms regardless of artifact count — looks intentional rather than
// a perfectly aligned row. Room images vary a lot in composition, so
// these stay in the middle two-thirds of the frame to avoid landing
// on empty sky/floor in most photos.
const HOTSPOT_POSITIONS = [
    { x: 22, y: 62 }, { x: 42, y: 38 }, { x: 63, y: 58 },
    { x: 78, y: 35 }, { x: 34, y: 78 }, { x: 58, y: 22 },
];

const state = { rooms: [], currentIndex: 0 };

document.addEventListener('DOMContentLoaded', init);

async function init() {
    let artifacts, exhibitions;
    try {
        [artifacts, exhibitions] = await Promise.all([loadArtifacts(), loadExhibitions()]);
    } catch (err) {
        console.error('Virtual Museum data failed to load:', err);
        showFatalError();
        return;
    }

    const artifactsById = new Map(artifacts.map(a => [a.id, a]));

    // Each exhibition becomes one room — no separate data to maintain.
    state.rooms = exhibitions.map(ex => ({
        ...ex,
        artifacts: ex.artifactIds.map(id => artifactsById.get(id)).filter(Boolean),
    }));

    if (!state.rooms.length) {
        showFatalError();
        return;
    }

    renderTabs();
    goToRoom(0);

    $('roomPrevBtn')?.addEventListener('click', () => step(-1));
    $('roomNextBtn')?.addEventListener('click', () => step(1));

    // Delegated once here (not inside goToRoom) so switching rooms
    // repeatedly never stacks up duplicate listeners.
    const grid = $('roomArtifactGrid');
    grid?.addEventListener('click', goToArtifactCard);
    grid?.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            goToArtifactCard(e);
        }
    });

    $('roomStageInner')?.addEventListener('click', e => {
        const dot = e.target.closest('.room-hotspot');
        if (dot) showHotspotPanel(Number(dot.dataset.artifactIndex));
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft') step(-1);
        if (e.key === 'ArrowRight') step(1);
    });
}

function showFatalError() {
    $('museumRoot')?.classList.add('hidden');
    document.querySelector('.room-section')?.classList.add('hidden');
    $('museumFatalError')?.classList.remove('hidden');
}

function step(delta) {
    const total = state.rooms.length;
    goToRoom((state.currentIndex + delta + total) % total);
}

function renderTabs() {
    const row = $('roomTabs');
    if (!row) return;

    row.innerHTML = state.rooms.map((room, i) => `
        <button type="button" class="chip" data-index="${i}" role="tab"
                aria-selected="false" id="room-tab-${esc(room.id)}">
            ${esc(room.title)}
        </button>
    `).join('');

    row.addEventListener('click', e => {
        const btn = e.target.closest('.chip');
        if (btn) goToRoom(Number(btn.dataset.index));
    });
}

function goToRoom(index) {
    state.currentIndex = index;
    const room = state.rooms[index];
    const total = state.rooms.length;
    const hasImage = Boolean(room.image);
    const hotspotArtifacts = room.artifacts.slice(0, HOTSPOT_POSITIONS.length);

    $('roomProgressLabel').textContent = `ROOM ${index + 1} OF ${total}`;

    $('roomTabs')?.querySelectorAll('.chip').forEach((btn, i) => {
        const isActive = i === index;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
    });

    const stage = $('roomStageInner');
    stage.classList.toggle('has-image', hasImage);

    stage.innerHTML = `
        ${hasImage
            ? `<img src="${esc(room.image)}" alt="" loading="lazy" class="room-bg"
                    onerror="this.remove(); this.parentElement.classList.remove('has-image');">
               <div class="room-scrim" aria-hidden="true"></div>`
            : ''}
        <div class="room-content">
            <span class="room-glyph" aria-hidden="true">${esc(room.glyph || '𓂀')}</span>
            <p class="section-label">${esc(room.categoryLabel || '')}</p>
            <h2>${esc(room.title)}</h2>
            <p class="prose">${esc(room.longDescription || room.description || '')}</p>
            <div class="room-meta">
                ${room.period ? `<span>Period: <strong>${esc(room.period)}</strong></span>` : ''}
                <span>Artifacts: <strong>${room.artifacts.length}</strong></span>
                <a href="exhibition.html?id=${encodeURIComponent(room.id)}">View Full Exhibition →</a>
            </div>
        </div>
        ${hasImage && hotspotArtifacts.length ? `
            <div class="room-hotspots">
                ${hotspotArtifacts.map((a, i) => `
                    <button type="button" class="room-hotspot"
                            style="left:${HOTSPOT_POSITIONS[i].x}%; top:${HOTSPOT_POSITIONS[i].y}%;"
                            data-artifact-index="${i}" aria-label="View ${esc(a.name)}">
                        <span class="room-hotspot-dot"></span>
                    </button>
                `).join('')}
            </div>
        ` : ''}
    `;

    // Hotspots reference the room's own artifact list by index, so
    // stash it where showHotspotPanel can find it without re-querying.
    stage.dataset.hasHotspots = hasImage && hotspotArtifacts.length ? '1' : '';
    state.currentHotspotArtifacts = hotspotArtifacts;

    $('roomHotspotPanel')?.classList.remove('is-active');

    $('roomArtifactsHeading').innerHTML = `${esc(room.title)} <span>Artifacts</span>`;

    const grid = $('roomArtifactGrid');
    if (!room.artifacts.length) {
        grid.innerHTML = '<p class="linked-artifacts-empty">No artifacts linked to this room yet.</p>';
    } else {
        grid.innerHTML = room.artifacts.map(a => `
            <article class="linked-artifact-card" data-id="${esc(a.id)}" role="listitem" tabindex="0"
                     aria-label="${esc(a.name)} — ${esc(a.period)}">
                <div class="linked-artifact-glyph" aria-hidden="true">𓂀</div>
                <div class="linked-artifact-body">
                    <h3>${esc(a.name)}</h3>
                    <p class="linked-artifact-meta">${esc(a.dynasty)}<br>${esc(a.date)} · ${esc(a.category)}</p>
                    ${a.model3d
                        ? `<button type="button" class="view-3d-btn" data-model="${esc(a.model3d)}" data-title="${esc(a.name)}">View in 3D ⟳</button>`
                        : ''}
                    <span class="linked-artifact-explore">View Artifact →</span>
                </div>
            </article>
        `).join('');
    }

    // Keep the active room tab in view on smaller screens
    $(`room-tab-${room.id}`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
}

function showHotspotPanel(index) {
    const artifact = state.currentHotspotArtifacts?.[index];
    const panel = $('roomHotspotPanel');
    if (!artifact || !panel) return;

    panel.innerHTML = `
        <h4>${esc(artifact.name)}</h4>
        <p class="linked-artifact-meta">${esc(artifact.dynasty)} · ${esc(artifact.date)}</p>
        <div class="room-hotspot-actions">
            <a href="artifact.html?id=${encodeURIComponent(artifact.id)}" class="btn btn-primary">View Artifact</a>
            ${artifact.model3d
                ? `<button type="button" class="view-3d-btn" data-model="${esc(artifact.model3d)}" data-title="${esc(artifact.name)}">View in 3D ⟳</button>`
                : ''}
        </div>
    `;
    panel.classList.add('is-active');

    // The 3D button here is generated fresh each time, so wire its
    // click directly rather than relying on a delegated listener
    // that was only ever attached to #roomArtifactGrid.
    panel.querySelector('.view-3d-btn')?.addEventListener('click', e => {
        window.openModelViewer?.(e.currentTarget.dataset.model, e.currentTarget.dataset.title);
    });
}

function goToArtifactCard(e) {
    const modelBtn = e.target.closest('.view-3d-btn');
    if (modelBtn) {
        e.stopPropagation();
        window.openModelViewer?.(modelBtn.dataset.model, modelBtn.dataset.title);
        return;
    }
    const card = e.target.closest('.linked-artifact-card[data-id]');
    if (card) window.location.href = `artifact.html?id=${encodeURIComponent(card.dataset.id)}`;
}