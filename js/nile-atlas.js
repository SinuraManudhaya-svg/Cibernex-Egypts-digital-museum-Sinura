/**
 * nile-ailas.js
 * Region tab switcher for the Nile Atlas page.
 * Egypt Digital Museum
 */

document.addEventListener('DOMContentLoaded', () => {
  const regions = {
    lower: {
      number: '01',
      label:  'LOWER EGYPT',
      title:  'The Delta',
      text:   'A fertile northern landscape where the Nile spread into branches before reaching the Mediterranean. The Delta supported agriculture, settlements and connections with the wider Mediterranean world.'
    },
    upper: {
      number: '02',
      label:  'UPPER EGYPT',
      title:  'The Nile Valley',
      text:   'The long southern stretch of the Nile valley formed a narrow fertile corridor surrounded by desert. Cities, temples and agricultural communities developed along the river.'
    },
    nubia: {
      number: '03',
      label:  'NUBIA',
      title:  'The Southern Frontier',
      text:   'Nubia lay south of Egypt along the Nile. The region was connected to Egypt through trade, diplomacy, conflict and cultural exchange.'
    }
  };

  const tabs   = document.querySelectorAll('.region-tab');
  const fields = {
    number: document.getElementById('regionNumber'),
    label:  document.getElementById('regionLabel'),
    title:  document.getElementById('regionTitle'),
    text:   document.getElementById('regionText'),
  };

  // Return early if required elements aren't present
  if (!tabs.length || Object.values(fields).some(el => !el)) return;

  function showRegion(key) {
    const data = regions[key];
    if (!data) return;
    fields.number.textContent = data.number;
    fields.label.textContent  = data.label;
    fields.title.textContent  = data.title;
    fields.text.textContent   = data.text;
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Update active tab
      document.querySelector('.region-tab.is-active')?.classList.remove('is-active');
      tab.classList.add('is-active');

      // Update panel content
      showRegion(tab.dataset.region);
    });
  });
});
