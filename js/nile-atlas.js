/**
 * nile-page.js  (formerly explore.js)
 * Region tab switcher for the Nile Atlas page.
 *
 * FIXES applied:
 *  Bug 3 — Added role="tab", aria-selected management on click
 *  Bug 3 — Added full keyboard navigation (Enter, Space, ArrowLeft, ArrowRight)
 *  Bug 3 — Named-property region data instead of fragile positional array
 *  Bug 1 — Mobile nav handled separately by nav-links.js (add to HTML)
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Region data (named properties — not fragile positional array) ── */
  const regions = {
    lower: {
      number: '01',
      label:  'LOWER EGYPT',
      title:  'The Delta',
      text:   'A fertile northern landscape where the Nile spread into branches before ' +
              'reaching the Mediterranean. The Delta supported agriculture, settlements ' +
              'and connections with the wider Mediterranean world.'
    },
    upper: {
      number: '02',
      label:  'UPPER EGYPT',
      title:  'The Nile Valley',
      text:   'The long southern stretch of the Nile valley formed a narrow fertile ' +
              'corridor surrounded by desert. Cities, temples and agricultural communities ' +
              'developed along the river.'
    },
    nubia: {
      number: '03',
      label:  'NUBIA',
      title:  'The Southern Frontier',
      text:   'Nubia lay south of Egypt along the Nile. The region was connected to ' +
              'Egypt through trade, diplomacy, conflict and cultural exchange over ' +
              'three millennia.'
    }
  };

  const tabs = document.querySelectorAll('.region-tab');

  const fields = {
    number: document.getElementById('regionNumber'),
    label:  document.getElementById('regionLabel'),
    title:  document.getElementById('regionTitle'),
    text:   document.getElementById('regionText'),
  };

  /* Guard: exit cleanly if required elements are missing */
  if (!tabs.length || Object.values(fields).some(el => !el)) return;

  /* ── Activate a specific tab ─────────────────────────────────────── */
  function activateTab(targetTab) {
    /* Deactivate all tabs */
    tabs.forEach(t => {
      t.classList.remove('is-active');
      t.setAttribute('aria-selected', 'false');
      t.setAttribute('tabindex', '-1');   /* remove from natural tab order */
    });

    /* Activate the target tab */
    targetTab.classList.add('is-active');
    targetTab.setAttribute('aria-selected', 'true');
    targetTab.setAttribute('tabindex', '0'); /* restore to tab order */

    /* Update the panel content */
    const data = regions[targetTab.dataset.region];
    if (!data) return;

    fields.number.textContent = data.number;
    fields.label.textContent  = data.label;
    fields.title.textContent  = data.title;
    fields.text.textContent   = data.text;
  }

  /* ── Wire up each tab button ─────────────────────────────────────── */
  tabs.forEach((tab, index) => {

    /* Click */
    tab.addEventListener('click', () => activateTab(tab));

    /* Keyboard: Enter / Space activate; Arrow keys move focus */
    tab.addEventListener('keydown', e => {
      const tabsArray = [...tabs];

      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          activateTab(tab);
          break;

        case 'ArrowRight':
        case 'ArrowDown': {
          e.preventDefault();
          const next = tabsArray[(index + 1) % tabsArray.length];
          next.focus();
          activateTab(next);
          break;
        }

        case 'ArrowLeft':
        case 'ArrowUp': {
          e.preventDefault();
          const prev = tabsArray[(index - 1 + tabsArray.length) % tabsArray.length];
          prev.focus();
          activateTab(prev);
          break;
        }

        case 'Home':
          e.preventDefault();
          tabsArray[0].focus();
          activateTab(tabsArray[0]);
          break;

        case 'End':
          e.preventDefault();
          tabsArray[tabsArray.length - 1].focus();
          activateTab(tabsArray[tabsArray.length - 1]);
          break;
      }
    });
  });
});
