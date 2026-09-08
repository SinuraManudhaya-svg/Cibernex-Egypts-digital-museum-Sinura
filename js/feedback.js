/**
 * feedback.js — Visitor Feedback Page
 * Egypt Digital Museum
 *
 * Sections:
 *  1.  Constants
 *  2.  Utility helpers
 *  3.  Star rating widget
 *  4.  Character counter
 *  5.  Field validation
 *  6.  Form-data collector
 *  7.  Mailto URL builder
 *  8.  WhatsApp URL builder
 *  9.  Submission handlers (email + WhatsApp button)
 * 10.  Success state
 * 11.  Form reset
 * 12.  Initialisation
 */

'use strict';

/* ══════════════════════════════════════════════════════════════
   1. CONSTANTS
══════════════════════════════════════════════════════════════ */
const CONTACT_EMAIL    = 'manudhayasinura@gmail.com';
const WHATSAPP_NUMBER  = '94718025240';   /* E.164 without '+' */
const MAX_CHARS        = 1000;
const NEAR_LIMIT       = 850;

/* ══════════════════════════════════════════════════════════════
   2. UTILITY HELPERS
══════════════════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);

/** True when the user prefers reduced motion. */
const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Trim and return the value of an input / select / textarea. */
const val = el => (el?.value ?? '').trim();

/* ══════════════════════════════════════════════════════════════
   3. STAR RATING WIDGET
   Renders 5 star buttons into #fbStars and manages selection.
   Returns a getRating() accessor used by the form collectors.
══════════════════════════════════════════════════════════════ */
function initStarRating() {
  const container  = $('fbStars');
  const statusEl   = $('fb-rating-status');
  if (!container) return { getRating: () => 0 };

  let selectedRating = 0;
  const stars        = [];

  const LABELS = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  /* Build 5 star buttons */
  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement('button');
    btn.type            = 'button';
    btn.className       = 'fb-star';
    btn.dataset.value   = i;
    btn.setAttribute('aria-label', `${i} star${i > 1 ? 's' : ''} — ${LABELS[i - 1]}`);
    btn.setAttribute('aria-pressed', 'false');
    btn.textContent     = '★';
    container.appendChild(btn);
    stars.push(btn);
  }

  /* ── Visual helpers ──────────────────────────────────────── */
  function litUpTo(n) {
    stars.forEach((s, idx) => {
      s.classList.toggle('is-lit',     idx < n);
      s.classList.toggle('is-hovered', false);
    });
  }

  function hoverUpTo(n) {
    stars.forEach((s, idx) => {
      s.classList.toggle('is-hovered', idx < n && idx >= selectedRating);
      s.classList.toggle('is-lit',     idx < selectedRating);
    });
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  /* ── Mouse hover ─────────────────────────────────────────── */
  container.addEventListener('mouseover', e => {
    const btn = e.target.closest('.fb-star');
    if (!btn) return;
    hoverUpTo(Number(btn.dataset.value));
    setStatus(LABELS[Number(btn.dataset.value) - 1]);
  });

  container.addEventListener('mouseout', () => {
    hoverUpTo(0);
    litUpTo(selectedRating);
    setStatus(selectedRating > 0 ? `${selectedRating} / 5 — ${LABELS[selectedRating - 1]}` : '');
  });

  /* ── Click to select ─────────────────────────────────────── */
  container.addEventListener('click', e => {
    const btn = e.target.closest('.fb-star');
    if (!btn) return;

    const clicked = Number(btn.dataset.value);

    /* Clicking the same star again de-selects (toggle off) */
    selectedRating = selectedRating === clicked ? 0 : clicked;

    litUpTo(selectedRating);
    stars.forEach((s, idx) => {
      s.setAttribute('aria-pressed', idx < selectedRating ? 'true' : 'false');
    });
    setStatus(selectedRating > 0
      ? `${selectedRating} / 5 — ${LABELS[selectedRating - 1]}`
      : 'No rating selected');
  });

  /* ── Keyboard: Arrow keys navigate between stars ─────────── */
  container.addEventListener('keydown', e => {
    const active = e.target.closest('.fb-star');
    if (!active) return;

    const currentIdx = stars.indexOf(active);
    let nextIdx = currentIdx;

    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIdx = Math.min(currentIdx + 1, stars.length - 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIdx = Math.max(currentIdx - 1, 0);
    } else {
      return;
    }

    stars[nextIdx].focus();
  });

  return {
    getRating: () => selectedRating,
    reset() {
      selectedRating = 0;
      litUpTo(0);
      stars.forEach(s => s.setAttribute('aria-pressed', 'false'));
      setStatus('');
    },
  };
}

/* ══════════════════════════════════════════════════════════════
   4. CHARACTER COUNTER
══════════════════════════════════════════════════════════════ */
function initCharCounter() {
  const textarea = $('fbMessage');
  const countEl  = $('fbCharCount');
  if (!textarea || !countEl) return;

  function update() {
    const used = textarea.value.length;
    countEl.textContent = `${used} / ${MAX_CHARS}`;
    countEl.classList.toggle('is-near-limit', used >= NEAR_LIMIT && used < MAX_CHARS);
    countEl.classList.toggle('is-at-limit',   used >= MAX_CHARS);
  }

  textarea.addEventListener('input', update);
  update();
}

/* ══════════════════════════════════════════════════════════════
   5. FIELD VALIDATION
══════════════════════════════════════════════════════════════ */
const RULES = {
  fbName: {
    validate: v => v.length >= 2,
    message:  'Please enter your name (at least 2 characters).',
  },
  fbEmail: {
    validate: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    message:  'Please enter a valid email address.',
  },
  fbSubject: {
    validate: v => v !== '',
    message:  'Please choose a subject.',
  },
  fbMessage: {
    validate: v => v.length >= 10,
    message:  'Please write a message (at least 10 characters).',
  },
};

/**
 * Validate one field. Returns true if valid.
 * Adds/removes .is-invalid and populates the error span.
 */
function validateField(id) {
  const rule    = RULES[id];
  const field   = $(id);
  const errorEl = $(`${id}Error`);
  if (!rule || !field) return true;

  const isValid = rule.validate(val(field));

  field.classList.toggle('is-invalid', !isValid);
  field.classList.toggle('is-valid',    isValid && val(field).length > 0);

  if (errorEl) errorEl.textContent = isValid ? '' : rule.message;
  field.setAttribute('aria-invalid', String(!isValid));

  return isValid;
}

/**
 * Validate all required fields. Returns true only if all pass.
 */
function validateAll() {
  const results = Object.keys(RULES).map(validateField);
  return results.every(Boolean);
}

/** Wire live validation on blur (not on every keystroke). */
function initLiveValidation() {
  Object.keys(RULES).forEach(id => {
    const field = $(id);
    if (!field) return;
    field.addEventListener('blur', () => validateField(id));
    /* Re-validate on input only after the field has been touched */
    field.addEventListener('input', () => {
      if (field.classList.contains('is-invalid') ||
          field.classList.contains('is-valid')) {
        validateField(id);
      }
    });
  });
}

/* ══════════════════════════════════════════════════════════════
   6. FORM-DATA COLLECTOR
══════════════════════════════════════════════════════════════ */
function collectFormData(starRating) {
  return {
    name:    val($('fbName')),
    email:   val($('fbEmail')),
    subject: val($('fbSubject')),
    message: val($('fbMessage')),
    rating:  starRating,
  };
}

/* ══════════════════════════════════════════════════════════════
   7. MAILTO URL BUILDER
══════════════════════════════════════════════════════════════ */
function buildMailtoUrl(data) {
  const ratingLine = data.rating > 0
    ? `Experience Rating: ${'★'.repeat(data.rating)}${'☆'.repeat(5 - data.rating)} (${data.rating}/5)\n`
    : '';

  const subject = `[Egypt Digital Museum] ${data.subject}`;

  const body = [
    `Name:     ${data.name}`,
    `Email:    ${data.email}`,
    `Subject:  ${data.subject}`,
    ratingLine ? `Rating:   ${data.rating}/5 — ${'★'.repeat(data.rating)}` : null,
    '',
    'Message:',
    data.message,
    '',
    '──────────────────────────────────────',
    'Sent via Egypt Digital Museum',
    'https://egypt-museum.com/feedback.html',
  ]
    .filter(line => line !== null)
    .join('\n');

  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/* ══════════════════════════════════════════════════════════════
   8. WHATSAPP URL BUILDER
══════════════════════════════════════════════════════════════ */
function buildWhatsAppUrl(data) {
  const ratingLine = data.rating > 0
    ? `\nRating: ${data.rating}/5 ${'★'.repeat(data.rating)}`
    : '';

  const text = [
    `Hello! I'm sending feedback about the Egypt Digital Museum.`,
    ``,
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Subject: ${data.subject}`,
    ratingLine,
    ``,
    `Message:`,
    data.message,
  ]
    .filter(line => line !== null)
    .join('\n');

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

/* ══════════════════════════════════════════════════════════════
   9. SUBMISSION HANDLERS
══════════════════════════════════════════════════════════════ */

/**
 * Core submit logic used by both the email and WhatsApp paths.
 * Validates the form, builds the appropriate URL, opens it,
 * then reveals the success state.
 *
 * @param {'email'|'whatsapp'} method
 * @param {object}             starWidget  — { getRating }
 */
function handleSubmit(method, starWidget) {
  /* Validate first */
  if (!validateAll()) {
    /* Scroll to first invalid field */
    const firstInvalid = document.querySelector('.fb-input.is-invalid, .fb-select.is-invalid, .fb-textarea.is-invalid');
    firstInvalid?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block:    'center',
    });
    firstInvalid?.focus({ preventScroll: true });
    return;
  }

  const data = collectFormData(starWidget.getRating());

  /* Open the appropriate app */
  const url = method === 'whatsapp' ? buildWhatsAppUrl(data) : buildMailtoUrl(data);

  /*
   * Using a hidden <a> + click() avoids popup blockers on some
   * browsers that block window.open() called outside a direct
   * user-gesture chain.
   */
  const anchor    = document.createElement('a');
  anchor.href     = url;
  anchor.target   = method === 'whatsapp' ? '_blank' : '_self';
  if (method === 'whatsapp') anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  showSuccess();
}

/* ══════════════════════════════════════════════════════════════
   10. SUCCESS STATE
══════════════════════════════════════════════════════════════ */
function showSuccess() {
  const form    = $('feedbackForm');
  const success = $('fbSuccess');
  if (!form || !success) return;

  form.hidden    = true;
  success.hidden = false;

  /* Scroll to the success panel */
  success.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block:    'start',
  });

  /* Move keyboard focus into the panel for screen readers */
  const heading = success.querySelector('h3');
  if (heading) {
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }
}

/* ══════════════════════════════════════════════════════════════
   11. FORM RESET
══════════════════════════════════════════════════════════════ */
function initResetButton(starWidget) {
  $('fbResetBtn')?.addEventListener('click', () => {
    const form    = $('feedbackForm');
    const success = $('fbSuccess');
    if (!form || !success) return;

    /* Reset HTML form fields */
    form.reset();

    /* Clear all validation states */
    form.querySelectorAll('.is-invalid, .is-valid').forEach(el => {
      el.classList.remove('is-invalid', 'is-valid');
      el.removeAttribute('aria-invalid');
    });
    form.querySelectorAll('.fb-error').forEach(el => { el.textContent = ''; });

    /* Reset star rating */
    starWidget.reset?.();

    /* Reset character count */
    const countEl = $('fbCharCount');
    if (countEl) {
      countEl.textContent = `0 / ${MAX_CHARS}`;
      countEl.classList.remove('is-near-limit', 'is-at-limit');
    }

    /* Swap panels */
    success.hidden = true;
    form.hidden    = false;

    /* Focus the first field */
    $('fbName')?.focus();
  });
}

/* ══════════════════════════════════════════════════════════════
   12. INITIALISATION
══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  /* Star rating */
  const starWidget = initStarRating();

  /* Character counter */
  initCharCounter();

  /* Live field validation */
  initLiveValidation();

  /* ── Email submit (form submit event) ─────────────────────── */
  $('feedbackForm')?.addEventListener('submit', e => {
    e.preventDefault();
    handleSubmit('email', starWidget);
  });

  /* ── WhatsApp submit (separate button, not a form submit) ─── */
  $('fbSubmitWhatsApp')?.addEventListener('click', () => {
    handleSubmit('whatsapp', starWidget);
  });

  /* ── Reset / send another ─────────────────────────────────── */
  initResetButton(starWidget);

  /* ── Announce required fields to screen readers ───────────── */
  const form = $('feedbackForm');
  if (form) {
    const note = document.createElement('p');
    note.className = 'sr-only';
    note.textContent = 'Fields marked with an asterisk (*) are required.';
    form.insertBefore(note, form.firstChild);
  }
});
