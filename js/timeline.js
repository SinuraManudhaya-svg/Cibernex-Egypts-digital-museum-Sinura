/**
 * timeline.js
 * Powers timeline.html. Groups the shared artifact dataset by
 * period, computes each period's date range directly from the data
 * (rather than hard-coding dates that could drift out of sync), and
 * renders a clickable track of period nodes plus a detail panel.
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

// Same local-API-with-fallback pattern used on the artifacts and
// artifact detail pages.
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

// Fixed chronological order — the dataset's "period" strings are
// grouped against this list so the track always reads oldest to
// newest, regardless of what order artifacts appear in the data.
const PERIOD_ORDER = [
    'Predynastic Egypt',
    'Early Dynastic Period',
    'Old Kingdom',
    'Middle Kingdom',
    'New Kingdom',
    'Ptolemaic Period',
    'Roman Egypt',
];

// General, well-established overview text for each era — not tied to
// any single artifact's data, so it won't go stale as the collection
// grows. Kept to broad, standard historical framing.
const PERIOD_OVERVIEWS = {
    'Predynastic Egypt': "Long before the pharaohs, communities along the Nile Valley developed farming, pottery, and early trade networks. Naqada-period cemeteries reveal the growing use of decorated pottery, carved palettes, and prestige goods that laid the groundwork for Egypt's later unification.",
    'Early Dynastic Period': "With the unification of Upper and Lower Egypt, the first pharaohs established Egypt's earliest royal institutions, writing system, and monumental art traditions, centered on the new capital at Memphis.",
    'Old Kingdom': "Known as the age of the pyramid builders, the Old Kingdom saw the construction of the Step Pyramid, the Great Pyramid of Giza, and the Great Sphinx, alongside the rise of a powerful centralized state and its first great works of sculpture and relief.",
    'Middle Kingdom': "Following a period of political fragmentation, the Middle Kingdom restored central authority and became a golden age of Egyptian literature, portrait sculpture, and expansion into Nubia.",
    'New Kingdom': "Egypt's imperial age, marked by powerful pharaohs such as Hatshepsut, Akhenaten, Tutankhamun, and Ramesses II, extensive temple building, and Egypt's greatest territorial reach across the Near East and Nubia.",
    'Ptolemaic Period': "After Alexander the Great's conquest, the Greek-descended Ptolemaic dynasty ruled Egypt from Alexandria, blending Egyptian and Hellenistic culture, religion, and art until the reign of Cleopatra VII.",
    'Roman Egypt': "Following the defeat of Cleopatra VII, Egypt became a province of the Roman Empire. Its temples and traditions continued for centuries even as new artistic styles, such as the Fayum mummy portraits, emerged.",
};

const state = { byPeriod: new Map(), activePeriod: null };

document.addEventListener('DOMContentLoaded', init);

async function init() {
    let artifacts;
    try {
        artifacts = await loadArtifacts();
    } catch (err) {
        console.error('Timeline data failed to load:', err);
        $('periodSection')?.classList.add('hidden');
        $('timelineTrack')?.classList.add('hidden');
        $('timelineEmpty')?.classList.remove('hidden');
        return;
    }

    // Group by period, keeping only periods that actually have data.
    PERIOD_ORDER.forEach(p => state.byPeriod.set(p, []));
    artifacts.forEach(a => {
        if (!state.byPeriod.has(a.period)) state.byPeriod.set(a.period, []);
        state.byPeriod.get(a.period).push(a);
    });

    const periodsWithData = PERIOD_ORDER.filter(p => (state.byPeriod.get(p) || []).length > 0);
    renderTrack(periodsWithData);

    if (periodsWithData.length) {
        // Deep-link support: timeline.html?period=New%20Kingdom
        const requested = new URLSearchParams(window.location.search).get('period');
        const initial = periodsWithData.includes(requested) ? requested : periodsWithData[0];
        selectPeriod(initial);
    }
}

function dateRangeFor(list) {
    const years = list.map(a => a.sortYear).filter(y => typeof y === 'number');
    if (!years.length) return '';
    const min = Math.min(...years);
    const max = Math.max(...years);
    const fmt = y => y < 0 ? `${Math.abs(y)} BCE` : `${y} CE`;
    return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
}

function renderTrack(periods) {
    const track = $('timelineTrack');
    track.innerHTML = periods.map(p => `
        <button type="button" class="timeline-node" data-period="${esc(p)}"
                role="tab" aria-selected="false" id="tab-${esc(p).replace(/\s+/g, '-')}">
            <strong>${esc(p)}</strong>
            <small>${esc(dateRangeFor(state.byPeriod.get(p)))}</small>
        </button>
    `).join('');

    track.addEventListener('click', e => {
        const btn = e.target.closest('.timeline-node');
        if (btn) selectPeriod(btn.dataset.period);
    });
}

function selectPeriod(period) {
    state.activePeriod = period;

    $('timelineTrack').querySelectorAll('.timeline-node').forEach(btn => {
        const isActive = btn.dataset.period === period;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
    });

    const list = state.byPeriod.get(period) || [];

    $('periodDates').textContent = dateRangeFor(list) || period.toUpperCase();
    $('periodTitle').innerHTML = `${esc(period)}`;
    $('periodOverview').textContent = PERIOD_OVERVIEWS[period] || '';
    $('periodCount').textContent = `${list.length} artifact${list.length === 1 ? '' : 's'} in the collection from this era`;

    // Sort chronologically within the period for a sensible reading order
    const sorted = [...list].sort((a, b) => a.sortYear - b.sortYear);

    $('periodArtifactList').innerHTML = sorted.map(a => `
        <li>
            <a href="artifact.html?id=${encodeURIComponent(a.id)}">
                ${esc(a.name)}
                <span>${esc(a.dynasty)} · ${esc(a.date)}</span>
            </a>
        </li>
    `).join('') || '<li><span>No artifacts recorded for this era yet.</span></li>';

    // Keep the active node in view on smaller tracks
    $(`tab-${period.replace(/\s+/g, '-')}`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });

    // ADDED: refresh the new Era-at-a-Glance + Historical Events sections.
    // This is the only change to this pre-existing function — everything
    // above this line is exactly as it was.
    renderEraGlance(period, list);
    renderEvents(period);
}

/* ══════════════════════════════════════════════════════════════
   NEW BELOW THIS LINE — nothing above was changed.
   Era at a Glance + Historical Events (additive only). Doesn't
   touch artifact.html?id= links, the ?period= deep-link handling,
   or the nav — only adds two new sections and reads from the same
   state.byPeriod data the rest of the page already builds.
   ══════════════════════════════════════════════════════════════ */

// Real, well-documented historical events, grouped by the same
// period keys as PERIOD_ORDER. Kept to broadly established facts —
// nothing invented. relatedArtifactId is only set when there's a
// genuine, confirmed match to a real artifact id in the dataset.
const TIMELINE_EVENTS = {
    'Predynastic Egypt': [
        { year: -3500, title: 'Naqada I villages flourish', description: 'Communities along the Nile Valley develop settled farming life, pottery traditions, and early social organization.', relatedArtifactId: 24 },
        { year: -3300, title: 'Naqada II expansion', description: 'Trade networks grow along the Nile, and prestige goods such as decorated pottery and carved palettes begin appearing in elite burials.', relatedArtifactId: 9 },
        { year: -3100, title: 'Egypt on the eve of unification', description: 'Upper and Lower Egypt grow increasingly interconnected in the years leading up to the First Dynasty.' },
    ],
    'Early Dynastic Period': [
        { year: -3100, title: 'Traditional unification of Egypt', description: 'Later Egyptian tradition credits King Narmer with uniting Upper and Lower Egypt, marking the start of the dynastic era.', relatedArtifactId: 8, location: 'Hierakonpolis' },
        { year: -2980, title: 'Reign of King Djet', description: 'Early royal funerary monuments are built at Abydos, reflecting the growing power of the First Dynasty kings.', relatedArtifactId: 28, location: 'Abydos' },
        { year: -2686, title: 'Reign of Khasekhemwy', description: "The Second Dynasty closes with Khasekhemwy's reign, setting the stage for the centralized state of the Old Kingdom.", relatedArtifactId: 27 },
    ],
    'Old Kingdom': [
        { year: -2670, title: "Djoser's Step Pyramid", description: 'King Djoser commissions the Step Pyramid at Saqqara, the first large-scale cut-stone monument in history.', relatedArtifactId: 11, location: 'Saqqara' },
        { year: -2560, title: 'The Great Pyramid completed', description: "King Khufu's pyramid at Giza is completed — the largest pyramid ever built in Egypt.", relatedArtifactId: 33, location: 'Giza' },
        { year: -2550, title: 'Reign of Khafre', description: 'The Great Sphinx at Giza is traditionally associated with the reign of King Khafre.', relatedArtifactId: 5, location: 'Giza' },
        { year: -2350, title: 'The Pyramid Texts', description: "The earliest known corpus of Egyptian religious writing is carved into the burial chamber of King Unas's pyramid.", relatedArtifactId: 36, location: 'Saqqara' },
    ],
    'Middle Kingdom': [
        { year: -2000, title: 'Reunification of Egypt', description: 'Mentuhotep II reunites Egypt after the First Intermediate Period, beginning the Middle Kingdom.' },
        { year: -1878, title: 'Reign of Senusret III', description: 'A powerful warrior-king known for military campaigns into Nubia and major administrative reform.', relatedArtifactId: 38 },
        { year: -1860, title: 'Reign of Amenemhat III', description: "One of the Middle Kingdom's most prolific builders, overseeing major construction projects across Egypt.", relatedArtifactId: 39 },
    ],
    'New Kingdom': [
        { year: -1479, title: 'Hatshepsut becomes pharaoh', description: 'One of the few women to rule Egypt as pharaoh in her own right, known for extensive temple building and trade expeditions.', relatedArtifactId: 43, location: 'Thebes' },
        { year: -1457, title: 'Battle of Megiddo', description: "Thutmose III's decisive victory at Megiddo is among the earliest battles in history recorded in detail.", location: 'Megiddo' },
        { year: -1353, title: "Akhenaten's religious reforms", description: 'Akhenaten promotes worship centered on the Aten and founds a new capital city at Amarna.', relatedArtifactId: 45, location: 'Amarna' },
        { year: -1332, title: 'Tutankhamun becomes king', description: 'The young pharaoh ascends the throne as a child, following the religious upheaval of the Amarna period.', relatedArtifactId: 47 },
        { year: -1323, title: 'Death of Tutankhamun', description: "The young king's death leads to his burial in the Valley of the Kings — a tomb later famous for surviving largely intact.", relatedArtifactId: 1, location: 'Valley of the Kings' },
        { year: -1264, title: 'Abu Simbel begun', description: 'Ramesses II begins construction of his monumental rock-cut temple in Nubia.', relatedArtifactId: 48, location: 'Abu Simbel' },
    ],
    'Ptolemaic Period': [
        { year: -332, title: 'Alexander the Great in Egypt', description: 'Alexander conquers Egypt, beginning Greek rule that leads to the founding of the Ptolemaic Dynasty.' },
        { year: -196, title: 'The Rosetta Stone decree', description: 'A priestly decree honoring Ptolemy V is inscribed in three scripts — later the key to deciphering hieroglyphs.', relatedArtifactId: 2, location: 'Memphis' },
        { year: -30, title: 'Death of Cleopatra VII', description: 'The last active ruler of the Ptolemaic Dynasty dies, and Egypt becomes a province of Rome.' },
    ],
    'Roman Egypt': [
        { year: -30, title: 'Egypt becomes a Roman province', description: 'Following the defeat of Mark Antony and Cleopatra, Egypt is formally annexed as a province of the Roman Empire.' },
        { year: -15, title: 'Temple of Dendur built', description: 'A temple to Isis is built under Emperor Augustus, continuing Egyptian temple traditions under Roman rule.', relatedArtifactId: 57, location: 'Dendur, Nubia' },
        { year: 150, title: 'Fayum portraits flourish', description: 'Lifelike painted portraits attached to mummies blend Roman painting technique with Egyptian burial practice.', relatedArtifactId: 19, location: 'Fayum' },
    ],
};

function formatYear(y) {
    return y < 0 ? `${Math.abs(y)} BCE` : `${y} CE`;
}

// ---------- ERA AT A GLANCE ----------
function renderEraGlance(period, list) {
    const grid = $('eraGlanceGrid');
    if (!grid) return;

    const dynasties = [...new Set(list.map(a => a.dynasty).filter(Boolean))];
    const events = TIMELINE_EVENTS[period] || [];

    grid.innerHTML = `
        <div><span>Time Period</span><strong>${esc(dateRangeFor(list) || '—')}</strong></div>
        <div><span>Dynasties</span><strong>${esc(dynasties.length || '—')}</strong></div>
        <div><span>Artifacts</span><strong>${list.length}</strong></div>
        <div><span>Key Events</span><strong>${events.length}</strong></div>
    `;
}

// ---------- HISTORICAL EVENTS ----------
function renderEvents(period) {
    const track = $('eventsTrack');
    const panel = $('eventDetailPanel');
    if (!track) return;

    const events = [...(TIMELINE_EVENTS[period] || [])].sort((a, b) => a.year - b.year);

    if (!events.length) {
        track.innerHTML = '<p class="prose">No curated events recorded for this era yet.</p>';
        panel?.classList.add('hidden');
        return;
    }

    track.innerHTML = events.map((ev, i) => `
        <button type="button" class="event-node" data-index="${i}">
            <span class="event-year">${esc(formatYear(ev.year))}</span>
            <span class="event-title">${esc(ev.title)}</span>
        </button>
    `).join('');

    track.querySelectorAll('.event-node').forEach(btn => {
        btn.addEventListener('click', () => showEventDetail(period, Number(btn.dataset.index)));
    });

    showEventDetail(period, 0);
}

function showEventDetail(period, index) {
    const events = [...(TIMELINE_EVENTS[period] || [])].sort((a, b) => a.year - b.year);
    const ev = events[index];
    const panel = $('eventDetailPanel');
    if (!ev || !panel) return;

    $('eventsTrack')?.querySelectorAll('.event-node').forEach((btn, i) => {
        btn.classList.toggle('active', i === index);
    });

    const periodArtifacts = state.byPeriod.get(period) || [];
    const artifact = typeof ev.relatedArtifactId === 'number'
        ? periodArtifacts.find(a => a.id === ev.relatedArtifactId)
        : null;

    panel.innerHTML = `
        <p class="section-label">${esc(formatYear(ev.year))}</p>
        <h4>${esc(ev.title)}</h4>
        <p class="prose">${esc(ev.description)}</p>
        ${ev.location ? `<span class="event-location">📍 ${esc(ev.location)}</span>` : ''}
        ${artifact ? `<div><a href="artifact.html?id=${encodeURIComponent(artifact.id)}" class="btn btn-secondary">View Related Artifact →</a></div>` : ''}
    `;
    panel.classList.remove('hidden');
}
