/**
 * main-loader.js
 */

'use strict';

(function () {
    const loader = document.getElementById('mainLoader');
    if (!loader) return;

    if (document.documentElement.classList.contains('skip-main-loader')) {
        return;
    }

    buildGlyphRing();
    splitTitleIntoLetters();
    runProgress();

    function buildGlyphRing() {
        const ring = document.getElementById('glyphRing');
        if (!ring) return;

        const glyphs = ['𓂀', '☥'];
        const count = 10;
        const radius = 210;

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * 360;
            const span = document.createElement('span');
            span.textContent = glyphs[i % glyphs.length];
            span.style.transform =
                `rotate(${angle}deg) translate(${radius}px) rotate(${-angle}deg)`;
            ring.appendChild(span);
        }
    }

    function splitTitleIntoLetters() {
        document.querySelectorAll('#mainLoaderTitle .title-line').forEach(line => {
            const text = line.dataset.text || '';
            const baseDelay = line.classList.contains('title-line--small') ? 0.9 : 0.55;

            line.innerHTML = text.split('').map((ch, i) => {
                const displayCh = ch === ' ' ? '&nbsp;' : ch;
                const delay = (baseDelay + i * 0.045).toFixed(3);
                return `<span class="letter" style="animation-delay:${delay}s">${displayCh}</span>`;
            }).join('');
        });
    }

    function runProgress() {
        const fill = document.getElementById('mainProgressFill');
        const percentEl = document.getElementById('mainProgressPercent');
        const labelEl = document.getElementById('mainProgressLabel');

        const stages = [
            { at: 0,  text: 'Sealing the chamber' },
            { at: 20, text: 'Descending the passage' },
            { at: 40, text: 'Igniting ancient torches' },
            { at: 62, text: 'Awakening the artifacts' },
            { at: 82, text: 'Aligning the timeline' },
            { at: 96, text: 'Opening the museum doors' },
        ];

        let progress = 0;
        let stageIndex = 0;

        function tick() {
            const remaining = 100 - progress;
            progress += Math.max(0.25, remaining * 0.028);
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
                setTimeout(finish, 350);
            }
        }

        setTimeout(() => requestAnimationFrame(tick), 2600);
    }

 
    function finish() {
        loader.classList.add('flash');

        setTimeout(() => {
            loader.classList.add('open');
            sessionStorage.setItem('edm_main_loader_seen', '1');
        }, 250);

        loader.addEventListener('transitionend', function onDoorDone(e) {
            if (e.propertyName !== 'transform') return;
            loader.removeEventListener('transitionend', onDoorDone);
            loader.classList.add('removed');
        });
    }
})();
