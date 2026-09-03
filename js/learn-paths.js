/**
 * learn-paths.js
 * Handles scroll-reveal animation and accessibility
 * for the "Explore Ancient Egypt" learning-paths section.
 *
 * Egypt Digital Museum
 */

(function () {
  'use strict';

  const VISIBLE_CLASS = 'is-visible';

  // Respect prefers-reduced-motion — if set, just make everything visible immediately
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /**
   * Initialise IntersectionObserver-based scroll reveal.
   * @param {string} selector  CSS selector for elements to reveal
   * @param {object} opts      IntersectionObserver options
   */
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
          observer.unobserve(entry.target); // reveal once only
        }
      });
    }, opts);

    targets.forEach(el => observer.observe(el));
  }

  /**
   * Keyboard accessibility: cards that are <a> elements already handle
   * keyboard navigation natively. This function is a safety net in case
   * a card is rendered as a non-interactive element and needs Enter/Space.
   */
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

  /**
   * Boot everything after the DOM is ready.
   */
  function init() {
    // Reveal individual cards with a slight threshold so they animate
    // once a good portion is scrolled into view.
    initScrollReveal('.lp-card', {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px',
    });

    // Reveal the sources panel with a slightly higher threshold
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
