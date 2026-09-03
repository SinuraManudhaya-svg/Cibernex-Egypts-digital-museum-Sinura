/**
 * quiz.js
 * Ten-question Knowledge Challenge for the Egypt Digital Museum.
 * Expanded from minified source; inline onclick replaced with event delegation.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── Questions: [prompt, [options], correctIndex] ──────────────────────────
  const questions = [
    [
      'Which river was central to ancient Egyptian civilization?',
      ['Nile', 'Tigris', 'Euphrates', 'Indus'],
      0
    ],
    [
      'Which object helped scholars decipher Egyptian scripts?',
      ['Senet board', 'Rosetta Stone', 'Canopic jar', 'Palette'],
      1
    ],
    [
      'What was a major role of scribes in ancient Egypt?',
      ['Building pyramids alone', 'Recording information', 'Fishing only', 'Making jewellery only'],
      1
    ],
    [
      'Which material was commonly used for writing in ancient Egypt?',
      ['Papyrus', 'Silk', 'Porcelain', 'Steel'],
      0
    ],
    [
      'What does archaeology primarily study?',
      ['Only kings', 'Material evidence of past societies', 'Only myths', 'Future civilizations'],
      1
    ],
    [
      'Which landscape supported intensive agriculture in ancient Egypt?',
      ['Nile Valley', 'Open desert', 'High mountains', 'Arctic coast'],
      0
    ],
    [
      'Which group created specialised objects and crafts?',
      ['Artisans', 'Only soldiers', 'Only sailors', 'Astronomers only'],
      0
    ],
    [
      'Why is archaeological context important?',
      [
        'It gives clues about relationships and use',
        'It makes objects newer',
        'It changes the weather',
        'It removes evidence'
      ],
      0
    ],
    [
      'Which ancient game is associated with Egyptian society?',
      ['Senet', 'Chess', 'Monopoly', 'Go'],
      0
    ],
    [
      'What is a responsible way to study historical claims?',
      ['Check evidence and sources', 'Accept every claim', 'Ignore context', 'Use only one random image'],
      0
    ]
  ];

  // ── State ─────────────────────────────────────────────────────────────────
  let currentIndex = 0;
  const answers = Array(questions.length).fill(null);

  // ── Element references ────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const counterEl  = $('questionCounter');
  const progressEl = $('progressBar');
  const scoreEl    = $('scoreLabel');
  const cardEl     = $('quizCard');
  const resultEl   = $('quizResult');
  const prevBtn    = $('prevBtn');
  const nextBtn    = $('nextBtn');

  if (!counterEl || !cardEl || !resultEl || !prevBtn || !nextBtn) return;

  // ── Score helper ──────────────────────────────────────────────────────────
  function currentScore() {
    return answers.filter((v, j) => v === questions[j][2]).length;
  }

  // ── Render current question ───────────────────────────────────────────────
  function render() {
    const [prompt, options] = questions[currentIndex];
    const total = questions.length;

    counterEl.textContent  = `QUESTION ${String(currentIndex + 1).padStart(2, '0')} / ${total}`;
    progressEl.style.width = `${((currentIndex + 1) / total) * 100}%`;
    scoreEl.textContent    = `SCORE ${String(currentScore()).padStart(2, '0')}`;

    const optionsHtml = options.map((text, idx) => {
      const isSelected = answers[currentIndex] === idx ? 'selected' : '';
      const letter = String.fromCharCode(65 + idx);
      return `
        <button class="answer ${isSelected}" data-index="${idx}" type="button">
          <span>${letter}</span>${text}
        </button>`;
    }).join('');

    cardEl.innerHTML = `
      <span class="card-number">${String(currentIndex + 1).padStart(2, '0')}</span>
      <p class="section-label">KNOWLEDGE CHECK</p>
      <h2>${prompt}</h2>
      <div class="answers">${optionsHtml}</div>
    `;

    prevBtn.disabled    = currentIndex === 0;
    nextBtn.textContent = currentIndex === total - 1 ? 'Finish' : 'Next →';
  }

  // ── Answer click (event delegation on the card) ───────────────────────────
  cardEl.addEventListener('click', e => {
    const btn = e.target.closest('.answer');
    if (!btn) return;
    answers[currentIndex] = Number(btn.dataset.index);
    render();
  });

  // ── Navigation ────────────────────────────────────────────────────────────
  nextBtn.addEventListener('click', () => {
    // Require an answer before advancing
    if (answers[currentIndex] === null) return;

    if (currentIndex < questions.length - 1) {
      currentIndex++;
      render();
      return;
    }

    // ── Show result ───────────────────────────────────────────────────────
    const score = currentScore();
    const level =
      score >= 9 ? 'MASTER OF THE MUSEUM' :
      score >= 7 ? 'ARCHIVE EXPLORER'     :
      score >= 5 ? 'CURIOUS SCHOLAR'      :
                   'BEGINNING EXPLORER';

    resultEl.hidden = false;
    resultEl.innerHTML = `
      <span class="section-label">YOUR RESULT</span>
      <strong>${score} / ${questions.length}</strong>
      <h2>${level}</h2>
      <p>Review the Learn and Artifacts sections to deepen your knowledge.</p>
      <button class="quiz-button" id="restartBtn" type="button">Try Again</button>
    `;
    resultEl.scrollIntoView({ behavior: 'smooth' });
  });

  prevBtn.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex--;
      render();
    }
  });

  // ── Restart via event delegation (avoids inline onclick) ─────────────────
  resultEl.addEventListener('click', e => {
    if (e.target.id === 'restartBtn') {
      location.reload();
    }
  });

  // ── Initial render ────────────────────────────────────────────────────────
  render();
});
