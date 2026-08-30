// ===== SMOOTH SCROLL (Lenis) =====
// autoRaf: true makes Lenis run its own requestAnimationFrame loop —
// no need for a manual raf() function or gsap.ticker integration
// unless you actually add the GSAP + ScrollTrigger <script> tags to
// index.html. If you want that later, add the CDN scripts first,
// then swap this block for the gsap.ticker version.
const lenis = new Lenis({
    autoRaf: true,
});

// ===== LOADING SCREEN =====
(function () {
    const loader = document.getElementById('loader');
    if (!loader) return; // loader markup not on this page — skip safely

    const fill = document.getElementById('progress-fill');
    const percentEl = document.getElementById('progress-percent');
    const labelEl = document.getElementById('progress-label');

    const stages = [
        { at: 0,  text: 'Unsealing the archives' },
        { at: 35, text: 'Restoring the artifacts' },
        { at: 70, text: 'Aligning the timeline' },
        { at: 95, text: 'Almost there' }
    ];

    let progress = 0;
    let stageIndex = 0;

    function tick() {
        const remaining = 100 - progress;
        progress += Math.max(0.4, remaining * 0.045);
        if (progress > 100) progress = 100;

        fill.style.width = progress + '%';
        percentEl.textContent = Math.floor(progress) + '%';

        if (stageIndex < stages.length - 1 && progress >= stages[stageIndex + 1].at) {
            stageIndex++;
            labelEl.textContent = stages[stageIndex].text;
        }

        if (progress < 100) {
            requestAnimationFrame(tick);
        } else {
            setTimeout(finish, 400);
        }
    }

    function finish() {
        loader.classList.add('hidden');
    }

    setTimeout(() => requestAnimationFrame(tick), 300);
})();