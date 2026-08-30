// ===== MOBILE NAV SAFETY NET =====
// Forces identical hamburger/nav-links behavior on EVERY page,
// regardless of what each page's own CSS file currently contains.
// Added because some pages' CSS had the mobile breakpoint for
// .menu-toggle/.nav-links and some didn't (or lost it), so the
// hamburger worked on index.html/about.html but not artifacts.html
// etc. This runs first, injects a <style> tag with !important rules,
// and can never be silently overridden by a missing or broken rule
// in an individual page's stylesheet again.
(function () {
    const style = document.createElement('style');
    style.id = 'edm-nav-safety-net';
    style.textContent = `
        @media (max-width: 900px) {
            .menu-toggle { display: block !important; }

            .nav-links {
                position: absolute !important;
                top: 76px !important;
                left: 0 !important;
                right: 0 !important;
                display: none !important;
                flex-direction: column !important;
                align-items: flex-start !important;
                gap: 16px !important;
                padding: 22px 30px !important;
                background: #090806 !important;
                border-bottom: 1px solid var(--border, rgba(214,168,79,0.25)) !important;
                z-index: 999 !important;
            }

            .nav-links.active { display: flex !important; }
        }

        @media (min-width: 901px) {
            .menu-toggle { display: none !important; }
            .nav-links {
                position: static !important;
                display: flex !important;
                flex-direction: row !important;
                align-items: center !important;
                background: transparent !important;
                border-bottom: none !important;
                padding: 0 !important;
            }
        }
    `;
    document.head.appendChild(style);
})();

// ===== ACTIVE NAV LINK =====
// Compares each nav link's href against the current page URL
// and adds .active to the one that matches.
(function () {
    const navLinks = document.querySelectorAll('.nav-links a');
    if (!navLinks.length) return;

    const currentPath = window.location.pathname.replace(/\/index\.html$/, '/');

    navLinks.forEach(link => {
        const linkPath = new URL(link.href).pathname.replace(/\/index\.html$/, '/');
        if (linkPath === currentPath) {
            link.classList.add('active');
        }
    });
})();

// ===== MOBILE MENU TOGGLE =====
// Single source of truth for the hamburger button, shared by every
// page (index.html previously had no handler for it at all).
(function () {
    const toggle = document.getElementById('menuToggle');
    const links  = document.getElementById('navLinks');
    if (!toggle || !links) return;

    toggle.addEventListener('click', () => {
        const isOpen = links.classList.toggle('active');
        toggle.setAttribute('aria-expanded', String(isOpen));
    });

    // Close the mobile menu after a link is tapped
    links.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            links.classList.remove('active');
            toggle.setAttribute('aria-expanded', 'false');
        });
    });
})();

// ===== NAV UTILITY BOX =====
// Appended inside #navLinks itself, so it opens/closes with the exact
// same toggle as the main nav links (no new button, no new state) —
// a small boxed group of legal pages + the admin login, matching the
// "hamburger opens the nav links AND a box with Privacy/Cookie/Terms
// + an admin link" pattern from the reference site.
(function () {
    const links = document.getElementById('navLinks');
    if (!links || document.getElementById('navUtilityBox')) return; // don't duplicate

    const box = document.createElement('div');
    box.className = 'nav-utility-box';
    box.id = 'navUtilityBox';
    box.innerHTML = `
        <a href="privacy-policy.html">Privacy Policy</a>
        <a href="cookie-policy.html">Cookie Policy</a>
        <a href="terms.html">Terms &amp; Conditions</a>
        <a href="admin-lock.html" class="nav-utility-admin">Admin →</a>
    `;
    links.appendChild(box);

    // These links weren't present when the "close menu on tap" binding
    // above ran, so give them the same behavior.
    box.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            links.classList.remove('active');
            document.getElementById('menuToggle')?.setAttribute('aria-expanded', 'false');
        });
    });
})();

// ===== SCROLL REVEAL =====
// Centralized here so every page gets it automatically (previously
// this IntersectionObserver was copy-pasted into only 3 of the 10
// pages' inline <script> blocks, and even there had no matching CSS —
// .reveal/.is-visible were never actually styled anywhere, so the
// effect was invisible everywhere it "worked"). The CSS that makes
// this visible lives in main.css. If a page still has its own copy of
// this observer in an inline <script>, having two is harmless — they
// just toggle the same class redundantly — but it can be deleted.
(function () {
    const targets = document.querySelectorAll(
        '.reveal-up, .reveal-left, .reveal-right, .reveal-scale, .stagger-item, .reveal'
    );
    if (!targets.length) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        targets.forEach(el => el.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            }
        });
    }, { threshold: 0.2 });

    targets.forEach((el, i) => {
        el.style.transitionDelay = `${(i % 3) * 0.15}s`;
        observer.observe(el);
    });
})();

// ===== LARGE FOOTER =====
// Replaces the contents of the existing <footer class="site-footer">
// on every page with a richer, multi-column footer — no HTML files
// need editing, since every page already has that element.
(function () {
    const footer = document.querySelector('footer.site-footer');
    if (!footer) return;

    const year = new Date().getFullYear();

    footer.classList.add('site-footer--large');
    footer.innerHTML = `
        <div class="footer-inner">
            <div class="footer-columns">
                <div class="footer-col">
                    <p class="footer-col-label">Navigate</p>
                    <a href="index.html">Home</a>
                    <a href="artifacts.html">Artifacts</a>
                    <a href="timeline.html">Timeline</a>
                </div>
                <div class="footer-col">
                    <p class="footer-col-label">Explore</p>
                    <a href="exhibitions.html">Exhibitions</a>
                    <a href="virtual-museum.html">Virtual Museum</a>
                    <a href="learn.html">Learn</a>
                </div>
                <div class="footer-col">
                    <p class="footer-col-label">Information</p>
                    <a href="privacy-policy.html">Privacy Policy</a>
                    <a href="cookie-policy.html">Cookie Policy</a>
                    <a href="terms.html">Terms &amp; Conditions</a>
                    <a href="admin-lock.html">Admin</a>
                </div>
                <div class="footer-col footer-col-about">
                    <p class="footer-col-label">About This Project</p>
                    <p class="footer-about-text">Egypt Digital Museum is a student-built digital museum exploring ancient Egyptian history — artifacts, timelines and curated exhibitions, sourced from real institutions.</p>
                    <a href="about.html">— Meet the Developer —</a>
                </div>
            </div>

            <div class="footer-wordmark" aria-hidden="true">
                <span class="footer-wordmark-glyph">𓂀</span>
                <span class="footer-wordmark-text">Egypt Digital Museum</span>
            </div>

            <div class="footer-bottom">
                <span>© ${year} Egypt Digital Museum</span>
                <span class="footer-bottom-sep">·</span>
                
            </div>
        </div>
    `;
})();
