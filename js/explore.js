/**
 * explore.js — Main Explore Page
 * Egypt Digital Museum
 *
 * Sections:
 *  1. Mobile navigation
 *  2. Ancient site data  (17 sites — drives the SVG map)
 *  3. Ancient cities data (7 cities — drives the Cities section)
 *  4. Monuments data     (10 monuments — drives the Monuments section)
 *  5. Map coordinate system
 *  6. Map initialization & marker rendering
 *  7. Marker interaction & info panel
 *  8. Filter system
 *  9. Map controls (reset)
 * 10. Locate-on-map (event delegation for all locate buttons)
 * 11. Cities section rendering
 * 12. Monuments section rendering
 * 13. Scroll navigation & journey CTA
 * 14. Reduced-motion support
 * 15. Boot
 */

'use strict';

/* ══════════════════════════════════════════════════════════════
   1. MOBILE NAVIGATION
══════════════════════════════════════════════════════════════ */
function initMobileNav() {
  const toggle   = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');
  if (!toggle || !navLinks) return;

  toggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/* ══════════════════════════════════════════════════════════════
   2. ANCIENT SITE DATA  (17 sites for the SVG map)
══════════════════════════════════════════════════════════════ */
const ancientSites = [
  {
    id:           'alexandria',
    name:         'Alexandria',
    type:         'cities',
    region:       'Lower Egypt',
    period:       'Ptolemaic Period, 332–30 BCE',
    coords:       { lat: 31.20, lng: 29.90 },
    description:  'Founded by Alexander the Great in 331 BCE, Alexandria became the intellectual and commercial capital of the Hellenistic world — home to the Great Library, the Mouseion research institute, and the Lighthouse of Pharos, one of the Seven Wonders.',
    significance: 'Greatest center of learning in the ancient world; Ptolemaic royal capital'
  },
  {
    id:           'giza',
    name:         'Giza',
    type:         'pyramids',
    region:       'Lower Egypt',
    period:       'Old Kingdom, c. 2580–2510 BCE',
    coords:       { lat: 30.00, lng: 31.13 },
    description:  'The Giza plateau holds three royal pyramid complexes built for Khufu, Khafre and Menkaure. The Great Pyramid of Khufu is the only surviving ancient wonder of the world. The Great Sphinx, carved from a single limestone outcrop, stands as the plateau\'s guardian.',
    significance: 'Largest surviving monuments of the ancient world; only intact ancient wonder'
  },
  {
    id:           'memphis',
    name:         'Memphis',
    type:         'cities',
    region:       'Lower Egypt',
    period:       'Early Dynastic to Late Period, c. 3100–332 BCE',
    coords:       { lat: 29.85, lng: 31.25 },
    description:  'Egypt\'s first capital, traditionally founded by Narmer at the junction of Upper and Lower Egypt. Memphis served as the primary administrative and religious center of the Old Kingdom, home to the Temple of Ptah and the royal workshops that produced monuments for the Giza plateau.',
    significance: 'First capital of unified Egypt; religious center of the god Ptah'
  },
  {
    id:           'saqqara',
    name:         'Saqqara',
    type:         'tombs',
    region:       'Lower Egypt',
    period:       'Early Dynastic – Old Kingdom, c. 3100–2180 BCE',
    coords:       { lat: 29.87, lng: 31.22 },
    description:  'The vast necropolis of Memphis, containing the Step Pyramid of Djoser — Egypt\'s first large stone monument, designed by the architect Imhotep around 2650 BCE. Saqqara contains tombs from almost every period of Egyptian history.',
    significance: 'Site of Egypt\'s first monumental stone architecture; the Step Pyramid of Djoser'
  },
  {
    id:           'dahshur',
    name:         'Dahshur',
    type:         'pyramids',
    region:       'Lower Egypt',
    period:       'Old Kingdom, c. 2600 BCE',
    coords:       { lat: 29.79, lng: 31.21 },
    description:  'A royal necropolis south of Saqqara containing Sneferu\'s Bent Pyramid and Red Pyramid — key experimental structures marking the transition from step pyramids to the true smooth-sided pyramid form that reached its peak at Giza.',
    significance: 'Site of the experimental pyramids that led to the Giza form'
  },
  {
    id:           'faiyum',
    name:         'Faiyum',
    type:         'archaeological',
    region:       'Lower Egypt',
    period:       'Middle Kingdom to Roman, c. 2050 BCE – 400 CE',
    coords:       { lat: 29.31, lng: 30.84 },
    description:  'A natural depression irrigated by a Nile branch, extensively developed during the Middle Kingdom. The Faiyum was Egypt\'s most productive agricultural region and later the source of the famous Faiyum portrait mummies — some of the best-preserved ancient paintings on panel.',
    significance: 'Most productive agricultural zone; Greco-Roman portrait mummies'
  },
  {
    id:           'amarna',
    name:         'Amarna',
    type:         'cities',
    region:       'Middle Egypt',
    period:       'New Kingdom, Amarna Period, c. 1346–1332 BCE',
    coords:       { lat: 27.65, lng: 30.90 },
    description:  'The short-lived capital of Akhenaten, built on a virgin desert site to honor the sun disc Aten. Abandoned after Akhenaten\'s death and never reoccupied, Amarna preserves an unparalleled snapshot of a complete Egyptian city — its street plan, houses, workshops and royal buildings still legible in the sand.',
    significance: 'Best-preserved ancient Egyptian city plan; Amarna religious revolution'
  },
  {
    id:           'abydos',
    name:         'Abydos',
    type:         'temples',
    region:       'Upper Egypt',
    period:       'Early Dynastic to New Kingdom, c. 3100–1070 BCE',
    coords:       { lat: 26.18, lng: 31.92 },
    description:  'One of Egypt\'s oldest and most sacred cities, Abydos was believed to be the burial place of Osiris himself. It contains royal tombs from the 1st and 2nd Dynasties — Egypt\'s earliest kings — and the magnificent memorial temple of Seti I, decorated with the famous Abydos King List.',
    significance: 'Sacred center of Osiris worship; earliest royal tombs; the Abydos King List'
  },
  {
    id:           'dendera',
    name:         'Dendera',
    type:         'temples',
    region:       'Upper Egypt',
    period:       'Ptolemaic–Roman Period, c. 54 BCE – 14 CE',
    coords:       { lat: 26.14, lng: 32.67 },
    description:  'The Temple of Hathor at Dendera is one of the best-preserved ancient Egyptian temples, built during the Ptolemaic period on the site of much earlier shrines. Its roof features the famous Dendera Zodiac — a circular bas-relief map of the ancient sky — and extraordinary painted astronomical ceilings.',
    significance: 'Best-preserved Ptolemaic temple; the Dendera Zodiac; Hathor cult center'
  },
  {
    id:           'luxor',
    name:         'Luxor (Thebes)',
    type:         'cities',
    region:       'Upper Egypt',
    period:       'Middle Kingdom – New Kingdom, c. 2050–1070 BCE',
    coords:       { lat: 25.70, lng: 32.64 },
    description:  'Ancient Thebes was Egypt\'s New Kingdom capital and its primary religious center — the city the ancient Egyptians called Waset and Homer described as having "a hundred gates." Today, Luxor\'s east and west banks together form the world\'s greatest concentration of ancient monuments.',
    significance: 'New Kingdom capital; highest density of ancient monuments globally'
  },
  {
    id:           'karnak',
    name:         'Karnak',
    type:         'temples',
    region:       'Upper Egypt',
    period:       'Middle Kingdom – Ptolemaic, c. 2055–30 BCE',
    coords:       { lat: 25.72, lng: 32.66 },
    description:  'The largest religious complex ever built, Karnak was the primary home of Amun, king of the gods, and the center of his vast theological and economic empire. Built continuously over 2,000 years, its Great Hypostyle Hall contains 134 massive papyrus-form columns, the tallest reaching 23 meters.',
    significance: 'Largest ancient temple complex ever built; 2,000 years of continuous construction'
  },
  {
    id:           'valley-kings',
    name:         'Valley of the Kings',
    type:         'tombs',
    region:       'Upper Egypt',
    period:       'New Kingdom, c. 1539–1075 BCE',
    coords:       { lat: 25.74, lng: 32.60 },
    description:  'The royal necropolis of the New Kingdom pharaohs, containing over 60 rock-cut tombs including the famous tomb of Tutankhamun, discovered nearly intact by Howard Carter in 1922. The valley\'s painted tombs represent the most complete record of ancient Egyptian funerary belief.',
    significance: 'New Kingdom royal burial ground; Tutankhamun\'s tomb discovered 1922'
  },
  {
    id:           'valley-queens',
    name:         'Valley of the Queens',
    type:         'tombs',
    region:       'Upper Egypt',
    period:       'New Kingdom, c. 1295–1069 BCE',
    coords:       { lat: 25.73, lng: 32.56 },
    description:  'The burial ground for royal wives, princes and princesses of the New Kingdom, containing over 90 tombs. The valley is dominated by the tomb of Nefertari, wife of Ramesses II — regarded as the finest painted tomb in Egypt for its extraordinary color and artistry.',
    significance: 'Royal family burial site; tomb of Nefertari — finest New Kingdom painted tomb'
  },
  {
    id:           'edfu',
    name:         'Edfu',
    type:         'temples',
    region:       'Upper Egypt',
    period:       'Ptolemaic Period, 237–57 BCE',
    coords:       { lat: 24.98, lng: 32.87 },
    description:  'The Temple of Horus at Edfu is the best-preserved ancient temple in Egypt, built during the Ptolemaic period over the site of an earlier New Kingdom temple. Its massive pylons, columned halls and sanctuary illustrate a complete ancient Egyptian temple layout in exceptional condition.',
    significance: 'Best-preserved ancient Egyptian temple; dedicated to Horus the Elder'
  },
  {
    id:           'kom-ombo',
    name:         'Kom Ombo',
    type:         'temples',
    region:       'Upper Egypt',
    period:       'Ptolemaic Period, c. 180–47 BCE',
    coords:       { lat: 24.45, lng: 32.93 },
    description:  'A unique double temple jointly dedicated to Horus the Elder and Sobek the crocodile god. Every architectural element is duplicated along a central axis — two entrances, two hypostyle halls, two sanctuaries — reflecting the dual nature of its divine patronage.',
    significance: 'Egypt\'s only known symmetrical double temple'
  },
  {
    id:           'aswan',
    name:         'Aswan',
    type:         'archaeological',
    region:       'Upper Egypt',
    period:       'Old Kingdom – Roman, c. 2686 BCE – 395 CE',
    coords:       { lat: 24.09, lng: 32.90 },
    description:  'Ancient Syene, Egypt\'s southern frontier city, was the primary source of the pink granite used in major royal monuments — obelisks, statues, pyramid casing and sarcophagi. The Elephantine Island opposite contains some of Egypt\'s oldest temple remains and a Nilometer used to measure and predict the annual flood.',
    significance: 'Southern frontier; main granite quarry for major monuments; Elephantine Island'
  },
  {
    id:           'abu-simbel',
    name:         'Abu Simbel',
    type:         'temples',
    region:       'Nubia',
    period:       'New Kingdom, c. 1264–1244 BCE',
    coords:       { lat: 22.34, lng: 31.62 },
    description:  'Two massive rock-cut temples carved from the cliffside by Ramesses II, the Great Temple featuring four colossal 20-meter seated statues of the pharaoh. The temples were precisely oriented so sunlight illuminates the inner sanctuary twice a year. In the 1960s, both temples were relocated by UNESCO to save them from rising Lake Nasser.',
    significance: 'Southernmost major monument; UNESCO relocation 1968; solar alignment precision'
  }
];

/* ══════════════════════════════════════════════════════════════
   3. ANCIENT CITIES DATA  (drives the Cities section cards)
══════════════════════════════════════════════════════════════ */
const ancientCities = [
  {
    seq:       '01',
    name:      'Memphis',
    region:    'Lower Egypt',
    period:    'c. 3100–332 BCE',
    siteId:    'memphis',
    desc:      'Egypt\'s founding capital, established at the junction of Upper and Lower Egypt. Memphis was the political and administrative center of the Old Kingdom, home to the Temple of Ptah and the royal workshops that supplied the Giza necropolis.',
    landmarks: 'Temple of Ptah · Saqqara necropolis · Alabaster Sphinx'
  },
  {
    seq:       '02',
    name:      'Thebes (Luxor)',
    region:    'Upper Egypt',
    period:    'c. 2050–1070 BCE',
    siteId:    'luxor',
    desc:      'New Kingdom capital and religious heartland, known as Waset to the Egyptians. The city\'s east bank held the living city and temples of Karnak and Luxor; its west bank held the royal necropolis, mortuary temples and the Valley of the Kings.',
    landmarks: 'Karnak Temple · Luxor Temple · Valley of the Kings · Deir el-Medina'
  },
  {
    seq:       '03',
    name:      'Alexandria',
    region:    'Lower Egypt',
    period:    '332 BCE – 641 CE',
    siteId:    'alexandria',
    desc:      'Founded by Alexander the Great in 331 BCE, Alexandria became the Mediterranean\'s greatest city — capital of the Ptolemaic kingdom, home to the Great Library, and the point where Greek intellectual culture fused with Egyptian religious tradition.',
    landmarks: 'Great Library · Lighthouse of Pharos · Serapeum · Royal Palace District'
  },
  {
    seq:       '04',
    name:      'Amarna',
    region:    'Middle Egypt',
    period:    'c. 1346–1332 BCE',
    siteId:    'amarna',
    desc:      'The revolutionary capital built by Akhenaten for the worship of the Aten sun disc. Constructed on uninhabited land and abandoned after the pharaoh\'s death, Amarna provides an exceptional archaeological record of a complete Egyptian city preserved in the desert.',
    landmarks: 'Royal Palace · Great Aten Temple · Amarna Tombs · Royal Road'
  },
  {
    seq:       '05',
    name:      'Abydos',
    region:    'Upper Egypt',
    period:    'c. 3100–1070 BCE',
    siteId:    'abydos',
    desc:      'One of Egypt\'s oldest cult cities, sacred to Osiris and home to the earliest royal tombs. Every major pharaoh sought to build a monument or be commemorated at Abydos, making it one of Egypt\'s most layered archaeological sites.',
    landmarks: 'Temple of Seti I · Osireion · Royal Tombs of Dynasty 1–2 · Temple of Ramesses II'
  },
  {
    seq:       '06',
    name:      'Elephantine (Aswan)',
    region:    'Upper Egypt',
    period:    'c. 2686 BCE – 395 CE',
    siteId:    'aswan',
    desc:      'The island fortress-city at the Nile\'s first cataract, controlling Egypt\'s access to sub-Saharan Africa. Elephantine was a major trade depot, granite-quarry gateway and the site of Egypt\'s oldest calendar — a Nilometer used to predict flood levels and calculate tax assessments.',
    landmarks: 'Elephantine Island temples · Nilometer · Granite quarries · Philae Temple'
  },
  {
    seq:       '07',
    name:      'Faiyum',
    region:    'Lower Egypt',
    period:    'c. 2050 BCE – 400 CE',
    siteId:    'faiyum',
    desc:      'Capital of the Faiyum oasis and Egypt\'s most intensively irrigated agricultural region, developed during the Middle Kingdom under Amenemhat III. The region later became a major center of Greco-Roman Egypt, producing the extraordinary panel portraits that survive as the earliest painted portraiture tradition.',
    landmarks: 'Temple of Sobek · Hawara Pyramid · Lahun · Faiyum Portrait sites'
  }
];

/* ══════════════════════════════════════════════════════════════
   4. MONUMENTS DATA  (drives the Monuments section cards)
══════════════════════════════════════════════════════════════ */
const monuments = [
  {
    name:     'Great Pyramid of Giza',
    type:     'Pyramid',
    location: 'Giza, Lower Egypt',
    period:   'Old Kingdom, c. 2580 BCE',
    siteId:   'giza',
    glyph:    '△',
    image:    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Kheops-Pyramid.jpg/640px-Kheops-Pyramid.jpg',
    desc:     'Built for Pharaoh Khufu and originally standing 146.5 meters, the Great Pyramid was the tallest man-made structure on earth for over 3,800 years. The only intact ancient wonder of the world, it required an estimated 2.3 million stone blocks.'
  },
  {
    name:     'Great Sphinx of Giza',
    type:     'Monument',
    location: 'Giza, Lower Egypt',
    period:   'Old Kingdom, c. 2530 BCE',
    siteId:   'giza',
    glyph:    '𓂀',
    image:    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/All_Gizah_Pyramids.jpg/640px-All_Gizah_Pyramids.jpg',
    desc:     'The largest monolithic statue in the world, carved from a single limestone outcrop. The Sphinx — depicting a human head on a lion\'s body — guards the Giza necropolis and is believed to represent Pharaoh Khafre, builder of the second Giza pyramid.'
  },
  {
    name:     'Karnak Temple Complex',
    type:     'Temple',
    location: 'Luxor, Upper Egypt',
    period:   'Middle Kingdom – Ptolemaic, c. 2055–30 BCE',
    siteId:   'karnak',
    glyph:    '𓂀',
    image:    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Karnak_temple.jpg/640px-Karnak_temple.jpg',
    desc:     'The largest ancient religious complex ever built, constructed continuously over 2,000 years by successive pharaohs. The Great Hypostyle Hall alone covers 5,000 square meters and contains 134 massive columns. At its height, the Karnak estate controlled significant portions of Egypt\'s agricultural land.'
  },
  {
    name:     'Luxor Temple',
    type:     'Temple',
    location: 'Luxor, Upper Egypt',
    period:   'New Kingdom, c. 1390–1213 BCE',
    siteId:   'luxor',
    glyph:    '𓇳',
    image:    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Luxor_temple_R01.jpg/640px-Luxor_temple_R01.jpg',
    desc:     'Built primarily by Amenhotep III and Ramesses II, Luxor Temple was dedicated to the rejuvenation of the kingship. The temple was the setting for the annual Opet Festival, during which the statues of Amun, Mut and Khonsu were transported from Karnak along the Avenue of Sphinxes.'
  },
  {
    name:     'Valley of the Kings',
    type:     'Necropolis',
    location: 'Luxor West Bank, Upper Egypt',
    period:   'New Kingdom, c. 1539–1075 BCE',
    siteId:   'valley-kings',
    glyph:    '𓇳',
    image:    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Valley_of_the_Kings_overview.jpg/640px-Valley_of_the_Kings_overview.jpg',
    desc:     'A remote valley in the Theban hills chosen as the burial ground for New Kingdom pharaohs, replacing the vulnerable pyramid tradition. Over 60 rock-cut tombs have been identified, decorated with religious texts and painted scenes. Tutankhamun\'s tomb, discovered nearly intact in 1922, transformed modern understanding of ancient Egypt.'
  },
  {
    name:     'Abu Simbel',
    type:     'Temple',
    location: 'Nubia, southern Egypt',
    period:   'New Kingdom, c. 1264–1244 BCE',
    siteId:   'abu-simbel',
    glyph:    '𓂀',
    image:    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Abu_Simbel%2C_Ramesses_Temple%2C_front%2C_Egypt%2C_Oct_2004.jpg/640px-Abu_Simbel%2C_Ramesses_Temple%2C_front%2C_Egypt%2C_Oct_2004.jpg',
    desc:     'Two temples carved directly into the sandstone cliff by Ramesses II as a monument to his own divinity and his victory at the Battle of Kadesh. The Great Temple features four 20-meter colossal statues of Ramesses. In 1968, both temples were cut into blocks and relocated 65 meters uphill by a UNESCO-led operation to save them from Lake Nasser.'
  },
  {
    name:     'Temple of Hatshepsut',
    type:     'Mortuary Temple',
    location: 'Deir el-Bahari, Luxor West Bank',
    period:   'New Kingdom, c. 1479–1458 BCE',
    siteId:   'valley-kings',
    glyph:    '𓇼',
    image:    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Mortuary_Temple_of_Hatshepsut.jpg/640px-Mortuary_Temple_of_Hatshepsut.jpg',
    desc:     'The mortuary temple of Pharaoh Hatshepsut, built into the dramatic limestone cliffs of Deir el-Bahari. Its three-terraced colonnaded design, attributed to the architect Senenmut, records Hatshepsut\'s divine birth and the famous expedition she sent to the Land of Punt. It remains one of the most architecturally innovative ancient buildings in Egypt.'
  },
  {
    name:     'Dendera Temple',
    type:     'Temple',
    location: 'Dendera, Upper Egypt',
    period:   'Ptolemaic–Roman, c. 54 BCE – 14 CE',
    siteId:   'dendera',
    glyph:    '𓇼',
    image:    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Dendera2.jpg/640px-Dendera2.jpg',
    desc:     'The Temple of Hathor at Dendera is among the best-preserved ancient Egyptian temples, its painted reliefs still retaining remarkable color. The temple roof features the original Dendera Zodiac — a circular bas-relief showing the Egyptian conception of the sky — now in the Louvre, replaced by a copy.'
  },
  {
    name:     'Temple of Horus at Edfu',
    type:     'Temple',
    location: 'Edfu, Upper Egypt',
    period:   'Ptolemaic Period, 237–57 BCE',
    siteId:   'edfu',
    glyph:    '𓂀',
    image:    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Horus_Temple_of_Edfu.jpg/640px-Horus_Temple_of_Edfu.jpg',
    desc:     'Dedicated to Horus the Elder, the Edfu temple is the most completely preserved ancient temple in Egypt and provides the clearest surviving picture of what an ancient Egyptian religious complex looked like in use. Its detailed inscriptions describe temple rituals, mythological narratives and architectural theory.'
  },
  {
    name:     'Step Pyramid of Djoser',
    type:     'Pyramid',
    location: 'Saqqara, Lower Egypt',
    period:   'Old Kingdom, c. 2650 BCE',
    siteId:   'saqqara',
    glyph:    '△',
    image:    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Saqqara_BW_5.jpg/640px-Saqqara_BW_5.jpg',
    desc:     'Egypt\'s first monumental stone building, designed by the architect-physician Imhotep for Pharaoh Djoser. The Step Pyramid began as a mastaba and was extended upward through six stages to become a six-stepped pyramid rising 62 meters. It marks the decisive shift from mud-brick to stone architecture in ancient Egypt.'
  }
];

/* ══════════════════════════════════════════════════════════════
   5. MAP COORDINATE SYSTEM
   ViewBox: 0 0 600 750
   Bounds:  lng [25, 36.5] = 11.5°  →  xScale = 52.17 px/°
            lat [21.5, 32.5] = 11°  →  yScale = 68.18 px/°
══════════════════════════════════════════════════════════════ */
const MAP = {
  viewBox: { w: 600, h: 750 },
  bounds: { lngMin: 25, lngMax: 36.5, latMin: 21.5, latMax: 32.5 }
};

/**
 * Convert geographic coordinates to SVG pixel coordinates.
 * @param {number} lat
 * @param {number} lng
 * @returns {{ x: number, y: number }}
 */
function toSvgCoord(lat, lng) {
  const { lngMin, lngMax, latMin, latMax } = MAP.bounds;
  const x = ((lng - lngMin) / (lngMax - lngMin)) * MAP.viewBox.w;
  const y = ((latMax - lat) / (latMax - latMin)) * MAP.viewBox.h;
  return { x: +x.toFixed(1), y: +y.toFixed(1) };
}

/* ══════════════════════════════════════════════════════════════
   6. MAP INITIALIZATION & MARKER RENDERING
══════════════════════════════════════════════════════════════ */
const SVG_NS = 'http://www.w3.org/2000/svg';

/** Track the currently active site */
let activeSiteId = null;

function initMap() {
  renderMarkers();
}

/**
 * Create one SVG <g> marker element for a site and append it
 * to the markers layer.
 */
function renderMarkers() {
  const layer = document.getElementById('map-markers-layer');
  if (!layer) return;

  ancientSites.forEach(site => {
    const { x, y } = toSvgCoord(site.coords.lat, site.coords.lng);

    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'map-marker');
    g.setAttribute('data-site-id', site.id);
    g.setAttribute('data-type', site.type);
    g.setAttribute('transform', `translate(${x},${y})`);
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', `${site.name} — ${site.region} — click to view details`);

    /* Outer ring */
    const ring = document.createElementNS(SVG_NS, 'circle');
    ring.setAttribute('r', '6');
    ring.setAttribute('class', 'marker-ring');

    /* Inner dot */
    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('r', '2.8');
    dot.setAttribute('class', 'marker-dot');

    /* Name label (offset above the ring) */
    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('y', '-11');
    label.setAttribute('class', 'marker-label');
    label.textContent = site.name;

    g.appendChild(ring);
    g.appendChild(dot);
    g.appendChild(label);
    layer.appendChild(g);

    /* Events */
    g.addEventListener('click', () => activateMarker(site.id));
    g.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activateMarker(site.id);
      }
    });
  });
}

/* ══════════════════════════════════════════════════════════════
   7. MARKER INTERACTION & INFO PANEL
══════════════════════════════════════════════════════════════ */

/**
 * Activate a site marker: update CSS state + show info panel.
 * @param {string} siteId
 */
function activateMarker(siteId) {
  /* Deactivate previous */
  if (activeSiteId) {
    const prev = document.querySelector(`[data-site-id="${activeSiteId}"]`);
    prev?.classList.remove('is-active');
  }
  activeSiteId = siteId;

  const el = document.querySelector(`[data-site-id="${siteId}"]`);
  el?.classList.add('is-active');

  const site = ancientSites.find(s => s.id === siteId);
  if (site) updateInfoPanel(site);
}

/**
 * Populate and reveal the map info panel with site data.
 * @param {object} site
 */
function updateInfoPanel(site) {
  const placeholder = document.getElementById('ex-panel-placeholder');
  const content     = document.getElementById('ex-panel-content');
  if (!placeholder || !content) return;

  content.innerHTML = `
    <button class="ex-panel-close" id="ex-panel-close" type="button"
            aria-label="Close site information panel">×</button>
    <span class="ex-panel-type-badge">${site.type.toUpperCase()}</span>
    <span class="ex-panel-region">${site.region}</span>
    <h3 class="ex-panel-name">${site.name}</h3>
    <p class="ex-panel-period">${site.period}</p>
    <p class="ex-panel-description">${site.description}</p>
    <div class="ex-panel-significance">
      <strong>SIGNIFICANCE</strong>
      <p>${site.significance}</p>
    </div>
  `;

  placeholder.hidden = true;
  content.hidden     = false;

  document.getElementById('ex-panel-close')?.addEventListener('click', resetInfoPanel);
}

/**
 * Reset the info panel to its placeholder state.
 */
function resetInfoPanel() {
  const placeholder = document.getElementById('ex-panel-placeholder');
  const content     = document.getElementById('ex-panel-content');
  if (!placeholder || !content) return;

  placeholder.hidden = false;
  content.hidden     = true;

  if (activeSiteId) {
    document.querySelector(`[data-site-id="${activeSiteId}"]`)
      ?.classList.remove('is-active');
    activeSiteId = null;
  }
}

/* ══════════════════════════════════════════════════════════════
   8. FILTER SYSTEM
══════════════════════════════════════════════════════════════ */
function initFilters() {
  const buttons = document.querySelectorAll('.ex-filter-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      applyFilter(btn.dataset.filter);
    });
  });
}

/**
 * Show/hide markers based on the selected type filter.
 * @param {string} type — 'all' or one of the site type strings
 */
function applyFilter(type) {
  const markers = document.querySelectorAll('.map-marker');
  let visibleCount = 0;

  markers.forEach(marker => {
    const match = type === 'all' || marker.dataset.type === type;
    marker.classList.toggle('is-hidden', !match);
    if (match) visibleCount++;
  });

  /* Update count display */
  const countEl = document.getElementById('ex-count-num');
  if (countEl) countEl.textContent = visibleCount;

  /* Reset info panel when filter changes */
  resetInfoPanel();
}

/* ══════════════════════════════════════════════════════════════
   9. MAP CONTROLS (reset button)
══════════════════════════════════════════════════════════════ */
function initMapControls() {
  document.getElementById('map-reset-btn')?.addEventListener('click', () => {
    /* Reset filters */
    document.querySelectorAll('.ex-filter-btn').forEach(b => b.classList.remove('is-active'));
    document.querySelector('[data-filter="all"]')?.classList.add('is-active');
    applyFilter('all');

    /* Reset panel */
    resetInfoPanel();
  });
}

/* ══════════════════════════════════════════════════════════════
   10. LOCATE-ON-MAP
   All [data-locate-id] buttons across regions, cities and
   monuments use event delegation — no inline JS.
══════════════════════════════════════════════════════════════ */
function initLocateButtons() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-locate-id]');
    if (!btn) return;
    locateOnMap(btn.dataset.locateId);
  });
}

/**
 * Scroll to the map, reset filters if needed, then activate the
 * requested marker and update the info panel.
 * @param {string} siteId
 */
function locateOnMap(siteId) {
  const mapSection = document.getElementById('map');
  if (!mapSection) return;

  mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  /* Delay activation until after the scroll settles */
  const delay = prefersReducedMotion() ? 0 : 750;
  setTimeout(() => {
    /* Ensure the marker's type is visible */
    const site = ancientSites.find(s => s.id === siteId);
    if (!site) return;

    const currentFilter = document.querySelector('.ex-filter-btn.is-active')?.dataset.filter;
    if (currentFilter && currentFilter !== 'all' && currentFilter !== site.type) {
      /* Switch to ALL so the site is visible */
      document.querySelectorAll('.ex-filter-btn').forEach(b => b.classList.remove('is-active'));
      document.querySelector('[data-filter="all"]')?.classList.add('is-active');
      applyFilter('all');
    }

    activateMarker(siteId);

    /* Focus the marker for keyboard/screen-reader users */
    document.querySelector(`[data-site-id="${siteId}"]`)?.focus({ preventScroll: true });
  }, delay);
}

/* ══════════════════════════════════════════════════════════════
   11. CITIES SECTION RENDERING
══════════════════════════════════════════════════════════════ */
function renderCities() {
  const grid = document.getElementById('cities-grid');
  if (!grid) return;

  ancientCities.forEach(city => {
    const article = document.createElement('article');
    article.className = 'city-card';
    article.innerHTML = `
      <div class="city-card-header">
        <span class="city-seq">${city.seq}</span>
        <span class="city-region-tag">${city.region.toUpperCase()}</span>
      </div>
      <h3 class="city-name">${city.name}</h3>
      <p class="city-period">${city.period}</p>
      <p class="city-desc">${city.desc}</p>
      <span class="city-landmarks-label">KEY LANDMARKS</span>
      <p class="city-landmarks">${city.landmarks}</p>
      ${city.siteId ? `
        <button class="ex-locate-btn" data-locate-id="${city.siteId}" type="button">
          Locate on Map →
        </button>` : ''}
    `;
    grid.appendChild(article);
  });
}

/* ══════════════════════════════════════════════════════════════
   12. MONUMENTS SECTION RENDERING
══════════════════════════════════════════════════════════════ */
function renderMonuments() {
  const grid = document.getElementById('monuments-grid');
  if (!grid) return;

  monuments.forEach(monument => {
    const article = document.createElement('article');
    article.className = 'monument-card';

    /* Image wrapper — data-glyph is used as CSS ::after fallback */
    article.innerHTML = `
      <div class="monument-img-wrap" data-glyph="${monument.glyph}">
        <img
          src="${monument.image}"
          alt="${monument.name}"
          loading="lazy"
        />
        <span class="monument-type-tag">${monument.type.toUpperCase()}</span>
      </div>
      <div class="monument-body">
        <h3 class="monument-name">${monument.name}</h3>
        <p class="monument-location">${monument.location}</p>
        <p class="monument-period">${monument.period}</p>
        <p class="monument-desc">${monument.desc}</p>
        ${monument.siteId ? `
          <button class="ex-locate-btn" data-locate-id="${monument.siteId}" type="button"
                  style="margin-top:1rem;">
            Locate on Map →
          </button>` : ''}
      </div>
    `;

    /* Image error handler: show glyph fallback via class */
    const img = article.querySelector('img');
    img?.addEventListener('error', () => {
      img.parentElement?.classList.add('img-error');
      img.style.display = 'none';
    });

    grid.appendChild(article);
  });
}

/* ══════════════════════════════════════════════════════════════
   13. SCROLL NAVIGATION & JOURNEY CTA
══════════════════════════════════════════════════════════════ */
function initScrollNav() {
  /* Hero section navigation chips */
  document.querySelectorAll('.ex-hero-chip').forEach(chip => {
    chip.addEventListener('click', e => {
      const href = chip.getAttribute('href');
      if (!href?.startsWith('#')) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function initJourneyCTA() {
  document.getElementById('begin-exploration-btn')?.addEventListener('click', () => {
    document.getElementById('map')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  });
}

/* ══════════════════════════════════════════════════════════════
   14. REDUCED-MOTION SUPPORT
══════════════════════════════════════════════════════════════ */
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function applyReducedMotion() {
  if (prefersReducedMotion()) {
    /* Disable CSS smooth-scroll from JS-triggered scrolls */
    document.documentElement.style.scrollBehavior = 'auto';
  }
}

/* ══════════════════════════════════════════════════════════════
   15. BOOT
══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  applyReducedMotion();
  initMobileNav();
  initMap();
  initFilters();
  initMapControls();
  initLocateButtons();
  renderCities();
  renderMonuments();
  initScrollNav();
  initJourneyCTA();
});
