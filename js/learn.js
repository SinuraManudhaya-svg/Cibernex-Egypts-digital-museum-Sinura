/**
 * learn.js
 * Powers learn.html. This page is static reference content (no
 * MongoDB/artifact data involved), so all this does is drive the
 * sticky jump-nav: smooth-scrolls to a section on click, and
 * highlights whichever section is currently in view.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const nav = document.getElementById('learnJumpNav');
    if (!nav) return;

    const chips = [...nav.querySelectorAll('.chip')];
    const sections = chips
        .map(chip => document.querySelector(chip.getAttribute('href')))
        .filter(Boolean);

    nav.addEventListener('click', e => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        const target = document.querySelector(chip.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    const observer = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const id = entry.target.id;
                chips.forEach(chip => {
                    chip.classList.toggle('active', chip.getAttribute('href') === `#${id}`);
                });
            });
        },
        { rootMargin: '-120px 0px -70% 0px', threshold: 0 }
    );

    sections.forEach(section => observer.observe(section));
});


document.addEventListener('DOMContentLoaded', () => {
    initHieroGenerator();
    initGlossarySearch();
    initQuiz();
});

// ================= HIEROGLYPH NAME GENERATOR =================
// Maps each English letter to the nearest uniliteral sign from the
// table above, by the object it depicts (never an actual hieroglyph
// Unicode character — some of those render as blank boxes on certain
// systems/fonts, so plain text descriptions are used instead, exactly
// like the alphabet table itself does).
const HIERO_MAP = {
    A: 'Egyptian vulture', B: 'Leg and foot', C: 'Basket with handle (≈ K)',
    D: 'Hand', E: 'Flowering reed (≈ I — no true vowel sign)', F: 'Horned viper',
    G: 'Jar stand', H: 'Courtyard / reed shelter', I: 'Flowering reed',
    J: 'Cobra (≈ DJ)', K: 'Basket with handle', L: 'Mouth (≈ R — no L sign)',
    M: 'Owl', N: 'Water ripple', O: 'Quail chick (≈ W/U — no true vowel sign)',
    P: 'Stool', Q: 'Hill slope', R: 'Mouth', S: 'Folded cloth',
    T: 'Loaf of bread', U: 'Quail chick', V: 'Horned viper (≈ F)',
    W: 'Quail chick', X: 'Twisted flax (≈ KH)', Y: 'Two reed flowers',
    Z: 'Door bolt',
};

function initHieroGenerator() {
    const input = document.getElementById('hieroNameInput');
    const btn = document.getElementById('hieroGenerateBtn');
    const result = document.getElementById('hieroResult');
    if (!input || !btn || !result) return;

    function generate() {
        const name = input.value.trim().toUpperCase().replace(/[^A-Z]/g, '');
        if (!name) {
            result.innerHTML = '<p class="prose">Type a name above, then press Generate.</p>';
            return;
        }

        const letters = name.split('');
        result.innerHTML = `
            <div class="hiero-result-row">
                ${letters.map(ch => `
                    <div class="hiero-letter-card">
                        <div class="hiero-letter">${ch}</div>
                        <div class="hiero-sign">${HIERO_MAP[ch] || '—'}</div>
                    </div>
                `).join('')}
            </div>
            <button type="button" class="btn btn-secondary hiero-copy-btn" id="hieroCopyBtn">Copy Result</button>
        `;

        document.getElementById('hieroCopyBtn')?.addEventListener('click', async () => {
            const text = letters.map(ch => `${ch}: ${HIERO_MAP[ch] || '—'}`).join('\n');
            try {
                await navigator.clipboard.writeText(text);
                const copyBtn = document.getElementById('hieroCopyBtn');
                if (copyBtn) {
                    const original = copyBtn.textContent;
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => { copyBtn.textContent = original; }, 1500);
                }
            } catch (err) {
                console.warn('Clipboard copy failed:', err.message);
            }
        });
    }

    btn.addEventListener('click', generate);
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') generate();
    });
}

// ================= GLOSSARY SEARCH =================
function initGlossarySearch() {
    const input = document.getElementById('glossarySearch');
    const grid = document.getElementById('glossaryGrid');
    const empty = document.getElementById('glossaryEmpty');
    if (!input || !grid) return;

    const terms = [...grid.querySelectorAll('.fact')];

    input.addEventListener('input', () => {
        const query = input.value.trim().toLowerCase();
        let visibleCount = 0;

        terms.forEach(term => {
            const haystack = (term.dataset.term || '') + ' ' + term.textContent.toLowerCase();
            const matches = haystack.toLowerCase().includes(query);
            term.classList.toggle('hidden', !matches);
            if (matches) visibleCount++;
        });

        empty?.classList.toggle('hidden', visibleCount > 0);
    });
}

// ================= QUIZ =================
const QUIZ_QUESTIONS = [
    {
        q: 'Which river was central to Egyptian civilization?',
        options: ['Tigris', 'Nile', 'Euphrates', 'Indus'],
        correct: 1,
        explain: 'The Nile\'s yearly flood made farming possible in an otherwise desert landscape.',
    },
    {
        q: 'Who built the Great Pyramid of Giza?',
        options: ['Djoser', 'Khufu', 'Ramesses II', 'Tutankhamun'],
        correct: 1,
        explain: 'Khufu, a 4th Dynasty pharaoh, built the Great Pyramid — the largest of the Giza pyramids.',
    },
    {
        q: "What does \"Ma'at\" represent?",
        options: ['A god of war', 'Truth, balance and cosmic order', 'A type of hieroglyph', "A pharaoh's crown"],
        correct: 1,
        explain: "Ma'at was the principle of truth and order the pharaoh was duty-bound to uphold.",
    },
    {
        q: 'Which discovery helped decode hieroglyphs?',
        options: ['Book of the Dead', 'Rosetta Stone', 'Narmer Palette', 'Ankh'],
        correct: 1,
        explain: 'The Rosetta Stone\'s parallel hieroglyphic, Demotic and Greek text let Champollion crack the code in 1822.',
    },
    {
        q: 'Which queen ruled Egypt as full pharaoh for over two decades?',
        options: ['Nefertiti', 'Hatshepsut', 'Cleopatra VII', 'Tiye'],
        correct: 1,
        explain: 'Hatshepsut took full pharaonic titulary and ruled in her own right, not just as a consort.',
    },
    {
        q: 'Who was the jackal-headed god of mummification?',
        options: ['Horus', 'Anubis', 'Thoth', 'Set'],
        correct: 1,
        explain: 'Anubis presided over embalming and guided the dead through the afterlife.',
    },
    {
        q: 'Egyptian hieroglyphic writing recorded…',
        options: ['Vowels only', 'Consonants only', 'Both equally', 'Neither'],
        correct: 1,
        explain: 'Vowels were never written — only consonant sounds, which is why modern pronunciations are reconstructions.',
    },
    {
        q: "What did Egyptians track to predict the Nile's flood?",
        options: ['The moon', 'The star Sirius', 'Rainfall patterns', 'Bird migration'],
        correct: 1,
        explain: "The heliacal rising of Sirius closely lined up with the start of the Nile's annual flood.",
    },
];

const QUIZ_BEST_KEY = 'edm_quiz_best_score';

function initQuiz() {
    const box = document.getElementById('quizBox');
    if (!box) return;

    const state = { index: 0, score: 0, answered: false };

    const els = {
        progress: document.getElementById('quizProgressLabel'),
        best: document.getElementById('quizBestScore'),
        question: document.getElementById('quizQuestion'),
        options: document.getElementById('quizOptions'),
        feedback: document.getElementById('quizFeedback'),
        nextBtn: document.getElementById('quizNextBtn'),
        restartBtn: document.getElementById('quizRestartBtn'),
    };

    function bestScore() {
        return Number(localStorage.getItem(QUIZ_BEST_KEY) || 0);
    }

    function updateBestLabel() {
        const best = bestScore();
        els.best.textContent = best > 0 ? `Best: ${best} / ${QUIZ_QUESTIONS.length}` : '';
    }

    function renderQuestion() {
        state.answered = false;
        const item = QUIZ_QUESTIONS[state.index];

        els.progress.textContent = `Question ${state.index + 1} of ${QUIZ_QUESTIONS.length}`;
        els.question.textContent = item.q;
        els.feedback.classList.add('hidden');
        els.nextBtn.disabled = true;
        els.nextBtn.textContent = state.index === QUIZ_QUESTIONS.length - 1 ? 'See Score' : 'Next Question';

        els.options.innerHTML = item.options.map((opt, i) => `
            <button type="button" class="quiz-option" data-index="${i}">${opt}</button>
        `).join('');

        els.options.querySelectorAll('.quiz-option').forEach(btn => {
            btn.addEventListener('click', () => selectAnswer(Number(btn.dataset.index)));
        });
    }

    function selectAnswer(chosenIndex) {
        if (state.answered) return;
        state.answered = true;

        const item = QUIZ_QUESTIONS[state.index];
        const buttons = [...els.options.querySelectorAll('.quiz-option')];

        buttons.forEach((btn, i) => {
            btn.disabled = true;
            if (i === item.correct) btn.classList.add('correct');
            else if (i === chosenIndex) btn.classList.add('incorrect');
        });

        if (chosenIndex === item.correct) state.score++;

        els.feedback.textContent = item.explain;
        els.feedback.classList.remove('hidden');
        els.nextBtn.disabled = false;
    }

    function showFinalScore() {
        const total = QUIZ_QUESTIONS.length;
        const best = bestScore();
        if (state.score > best) localStorage.setItem(QUIZ_BEST_KEY, String(state.score));

        els.progress.textContent = 'Quiz complete';
        els.question.innerHTML = `<div class="quiz-final-score">${state.score} / ${total}</div>`;
        els.options.innerHTML = '';
        els.feedback.textContent = state.score === total
            ? 'Perfect score — you clearly read the whole page!'
            : 'Review the sections above and try again to improve your score.';
        els.feedback.classList.remove('hidden');
        els.nextBtn.classList.add('hidden');
        els.restartBtn.classList.remove('hidden');
        updateBestLabel();
    }

    els.nextBtn.addEventListener('click', () => {
        if (state.index < QUIZ_QUESTIONS.length - 1) {
            state.index++;
            renderQuestion();
        } else {
            showFinalScore();
        }
    });

    els.restartBtn.addEventListener('click', () => {
        state.index = 0;
        state.score = 0;
        els.nextBtn.classList.remove('hidden');
        els.restartBtn.classList.add('hidden');
        renderQuestion();
    });

    updateBestLabel();
    renderQuestion();
}