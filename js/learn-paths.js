/**
 * learn-paths.js
 */

(function () {
  'use strict';

  const VISIBLE_CLASS = 'is-visible';
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initScrollReveal(selector, opts) {
    const targets = document.querySelectorAll(selector);
    if (!targets.length) return;

    if (prefersReducedMotion) {
      targets.forEach(el => el.classList.add(VISIBLE_CLASS));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add(VISIBLE_CLASS);
          observer.unobserve(entry.target);
        }
      });
    }, opts);

    targets.forEach(el => observer.observe(el));
  }

  function initCardKeyboardSupport() {
    const cards = document.querySelectorAll('.lp-card[href]');
    cards.forEach(card => {
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });
    });
  }

  function init() {
    initScrollReveal('.lp-card', {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px',
    });

    initScrollReveal('.lp-sources-inner', {
      threshold: 0.2,
      rootMargin: '0px 0px -20px 0px',
    });

    initCardKeyboardSupport();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
