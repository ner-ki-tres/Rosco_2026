/* ==========================================
   PALABRAS.JS - Prueba de las 9 Palabras
   New mechanic: memorize positions → click grid to match
   ========================================== */

let palabrasState = {
  conjuntos: [],
  currentSet: null,
  fase: 'select', // select, memorize, resolve
  words: [],           // original 9 words in grid positions (never change)
  revealedCells: [],   // boolean[9] — true if correctly matched
  wordQueue: [],       // shuffled queue of words to match
  currentWordIdx: 0,   // index into wordQueue
  timer: null,
  timeLeft: 0,
  score: 0,
  totalTime: 105,
  tiempoMemorizar: 10,
  tiempoResolver: 90
};

function initPalabrasGame(config) {
  palabrasState = {
    conjuntos: config.conjuntos || [],
    currentSet: null,
    fase: 'select',
    words: [],
    revealedCells: Array(9).fill(false),
    wordQueue: [],
    currentWordIdx: 0,
    timer: null,
    timeLeft: 0,
    score: 0,
    totalTime: 100,
    tiempoMemorizar: 10,
    tiempoResolver: 90
  };

  document.getElementById('palabrasScore').textContent = '0';
  renderPalabrasSelectSet();
}

function stopPalabrasGame() {
  if (palabrasState.timer) {
    clearInterval(palabrasState.timer);
    palabrasState.timer = null;
  }
  resolveTimerRunning = false;
}

// FASE 1: Seleccionar conjunto
function renderPalabrasSelectSet() {
  const container = document.getElementById('palabrasContent');
  container.innerHTML = `
    <div class="palabras-container">
      <div class="palabras-fase">
        <div class="palabras-fase-titulo">Elige un conjunto de palabras</div>
        <div class="palabras-fase-desc">Selecciona que grupo de 9 palabras quieres memorizar</div>
      </div>
      <div class="palabras-set-selector">
        ${palabrasState.conjuntos.map((set, i) => `
          <button class="set-btn" onclick="selectPalabrasSet(${i})">
            ${set.nombre || 'Conjunto ' + (i + 1)}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

// FASE 2: Memorizar
function selectPalabrasSet(index) {
  palabrasState.currentSet = palabrasState.conjuntos[index];
  palabrasState.words = [...palabrasState.currentSet.palabras]; // fixed positions
  palabrasState.fase = 'memorize';
  renderPalabrasMemorize();
}

function renderPalabrasMemorize() {
  const container = document.getElementById('palabrasContent');
  const words = palabrasState.words;

  container.innerHTML = `
    <div class="palabras-game-layout">
      <div class="palabras-canela-side">
        <div class="palabras-speech-bubble">
          <p>Memoriza donde esta cada palabra!</p>
        </div>
        <img src="img/characters/Canela.png" alt="Canela" class="palabras-canela-img" id="palabrasCanelaImg" />
      </div>
      <div class="palabras-main-side">
        <div class="palabras-fase">
          <div class="palabras-fase-titulo">Memoriza las posiciones!</div>
          <div class="palabras-fase-desc">Tienes ${palabrasState.tiempoMemorizar} segundos</div>
        </div>

        <div class="timer-bar-container">
          <div class="timer-bar" id="palabrasTimerBar"></div>
        </div>
        <div class="countdown-display" id="palabrasCountdown">${palabrasState.tiempoMemorizar}</div>

        <div class="palabras-grid">
          ${words.map((word, i) => `
            <div class="palabra-card reveal" style="animation-delay: ${i * 0.1}s">
              <span class="palabra-numero">${i + 1}</span>
              ${word}
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Timer de memorización — NO skip
  let timeLeft = palabrasState.tiempoMemorizar;
  const bar = document.getElementById('palabrasTimerBar');
  const countdown = document.getElementById('palabrasCountdown');

  if (palabrasState.timer) clearInterval(palabrasState.timer);

  palabrasState.timer = setInterval(() => {
    timeLeft--;
    if (bar) bar.style.width = (timeLeft / palabrasState.tiempoMemorizar * 100) + '%';
    if (countdown) {
      countdown.textContent = timeLeft;
      if (timeLeft <= 5) countdown.classList.add('warning');
    }

    if (timeLeft <= 0) {
      clearInterval(palabrasState.timer);
      startPalabrasResolve();
    }
  }, 1000);
}

// FASE 3: Resolver — click grid cells to match words
function startPalabrasResolve() {
  if (palabrasState.timer) clearInterval(palabrasState.timer);
  palabrasState.fase = 'resolve';
  palabrasState.revealedCells = Array(9).fill(false);
  palabrasState.score = 0;
  palabrasState.busy = false;
  document.getElementById('palabrasScore').textContent = '0';
  reshuffleWordQueue();
  buildResolveLayout();
  startResolveTimer();
}

function reshuffleWordQueue() {
  const unrevealed = [];
  for (let i = 0; i < 9; i++) {
    if (!palabrasState.revealedCells[i]) {
      unrevealed.push(palabrasState.words[i]);
    }
  }
  palabrasState.wordQueue = shuffleArray(unrevealed);
  palabrasState.currentWordIdx = 0;
}

function getCurrentWord() {
  if (palabrasState.currentWordIdx >= palabrasState.wordQueue.length) return null;
  return palabrasState.wordQueue[palabrasState.currentWordIdx];
}

/* Build the resolve UI once — never fully re-render */
function buildResolveLayout() {
  const container = document.getElementById('palabrasContent');
  const currentWord = getCurrentWord();
  if (!currentWord) { finishPalabras(); return; }

  container.innerHTML = `
    <div class="palabras-game-layout">
      <div class="palabras-canela-side">
        <div class="palabras-speech-bubble palabras-word-bubble" id="palabrasBubble">
          <p class="palabras-current-word" id="palabrasWordLabel">${currentWord}</p>
        </div>
        <img src="img/characters/Canela.png" alt="Canela" class="palabras-canela-img" id="palabrasCanelaImg" />
      </div>
      <div class="palabras-main-side">
        <div class="palabras-fase">
          <div class="palabras-fase-titulo">Donde estaba esta palabra?</div>
          <div class="palabras-fase-desc">Haz clic en la posicion correcta</div>
        </div>

        <div class="timer-bar-container">
          <div class="timer-bar" id="palabrasResolveTimerBar"></div>
        </div>
        <div class="countdown-display" id="palabrasResolveCountdown">${palabrasState.timeLeft || palabrasState.tiempoResolver}</div>

        <div class="palabras-grid" id="palabrasResolveGrid">
          ${palabrasState.words.map((word, i) => `
            <div class="flip-card" id="flipCard-${i}" onclick="clickPalabrasCell(${i})">
              <div class="flip-card-inner" id="flipInner-${i}">
                <div class="flip-card-front">
                  <span class="palabra-numero">${i + 1}</span>
                  ?
                </div>
                <div class="flip-card-back" id="flipBack-${i}">
                  <span class="palabra-numero">${i + 1}</span>
                  <span class="flip-word">${word}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="palabras-score-display">
          Puntos: <span id="palabrasLiveScore">${palabrasState.score}</span>
        </div>
      </div>
    </div>
  `;
}

/* Update just the word label in the bubble without re-rendering */
function updateWordBubble() {
  const w = getCurrentWord();
  const label = document.getElementById('palabrasWordLabel');
  if (label && w) label.textContent = w;
}

/* Update the live score display */
function updateLiveScore() {
  const el = document.getElementById('palabrasLiveScore');
  if (el) el.textContent = palabrasState.score;
  document.getElementById('palabrasScore').textContent = palabrasState.score;
}

let resolveTimerRunning = false;

function startResolveTimer() {
  if (resolveTimerRunning) return;
  resolveTimerRunning = true;
  if (!palabrasState.timeLeft || palabrasState.timeLeft <= 0) {
    palabrasState.timeLeft = palabrasState.tiempoResolver;
  }
  if (palabrasState.timer) clearInterval(palabrasState.timer);

  palabrasState.timer = setInterval(() => {
    palabrasState.timeLeft--;
    updateResolveTimerUI();
    if (palabrasState.timeLeft <= 0) {
      clearInterval(palabrasState.timer);
      resolveTimerRunning = false;
      finishPalabras();
    }
  }, 1000);
}

function updateResolveTimerUI() {
  const bar = document.getElementById('palabrasResolveTimerBar');
  const countdown = document.getElementById('palabrasResolveCountdown');
  if (bar) bar.style.width = (palabrasState.timeLeft / palabrasState.tiempoResolver * 100) + '%';
  if (countdown) {
    countdown.textContent = palabrasState.timeLeft;
    if (palabrasState.timeLeft <= 10) countdown.classList.add('warning');
  }
}

function clickPalabrasCell(cellIndex) {
  if (palabrasState.fase !== 'resolve') return;
  if (palabrasState.revealedCells[cellIndex]) return;
  if (palabrasState.busy) return; // prevent clicks during animation
  palabrasState.busy = true;

  const currentWord = getCurrentWord();
  if (!currentWord) { palabrasState.busy = false; return; }

  const correctWord = palabrasState.words[cellIndex];
  const inner = document.getElementById('flipInner-' + cellIndex);
  const back = document.getElementById('flipBack-' + cellIndex);
  const card = document.getElementById('flipCard-' + cellIndex);

  // Flip the card to show the word
  if (inner) inner.classList.add('flipped');

  const isCorrect = normalizeStr(currentWord) === normalizeStr(correctWord);

  // After flip animation completes (~400ms)
  setTimeout(() => {
    if (isCorrect) {
      // CORRECT
      palabrasState.revealedCells[cellIndex] = true;
      palabrasState.score += 2;
      updateLiveScore();
      if (back) back.classList.add('correct-back');
      if (card) card.onclick = null;
      showPalabrasAction('correct');

      palabrasState.currentWordIdx++;

      // Check if all done
      if (palabrasState.revealedCells.every(r => r)) {
        setTimeout(() => finishPalabras(), 800);
        return;
      }

      // Update bubble to next word after 1s
      setTimeout(() => {
        if (palabrasState.fase !== 'resolve') return;
        updateWordBubble();
        palabrasState.busy = false;
      }, 600);

    } else {
      // WRONG — show red
      palabrasState.score = Math.max(0, palabrasState.score - 1);
      updateLiveScore();
      if (back) back.classList.add('wrong-back');
      showPalabrasAction('wrong');

      // After 1s: unflip this card AND all previously revealed cards
      setTimeout(() => {
        if (palabrasState.fase !== 'resolve') return;
        // Unflip the wrong card
        if (inner) inner.classList.remove('flipped');
        if (back) back.classList.remove('wrong-back');

        // Unflip all previously correct cards
        for (let i = 0; i < 9; i++) {
          if (palabrasState.revealedCells[i]) {
            const ci = document.getElementById('flipInner-' + i);
            const cb = document.getElementById('flipBack-' + i);
            const cc = document.getElementById('flipCard-' + i);
            if (ci) ci.classList.remove('flipped');
            if (cb) cb.classList.remove('correct-back');
            if (cc) cc.onclick = () => clickPalabrasCell(i);
          }
        }

        // Reset state
        palabrasState.revealedCells = Array(9).fill(false);
        reshuffleWordQueue();
        updateWordBubble();
        palabrasState.busy = false;
      }, 1000);
    }
  }, 450);
}

let palabrasActionTimeout = null;

function showPalabrasAction(type) {
  const actionFile = type === 'correct' ? 'Canela Acierto.webp' : 'Canela Fallo.webp';
  const img = document.getElementById('palabrasCanelaImg');
  if (!img) return;

  // Clear any pending restore
  if (palabrasActionTimeout) {
    clearTimeout(palabrasActionTimeout);
    palabrasActionTimeout = null;
  }

  const prevSrc = img.dataset.originalSrc || img.src;
  if (!img.dataset.originalSrc) img.dataset.originalSrc = img.src;

  // Fade out -> swap -> fade in
  img.style.opacity = '0';
  setTimeout(() => {
    img.src = '/img/actions/' + encodeURIComponent(actionFile);
    img.style.opacity = '1';
  }, 150);

  // Restore after 1.2s
  palabrasActionTimeout = setTimeout(() => {
    img.style.opacity = '0';
    setTimeout(() => {
      img.src = prevSrc;
      img.style.opacity = '1';
    }, 150);
    palabrasActionTimeout = null;
  }, 1200);
}

function finishPalabras() {
  if (palabrasState.timer) clearInterval(palabrasState.timer);
  resolveTimerRunning = false;
  palabrasState.fase = 'done';

  const allRevealed = palabrasState.revealedCells.every(r => r);
  const revealedCount = palabrasState.revealedCells.filter(r => r).length;
  const finalScore = Math.max(0, palabrasState.score);

  document.getElementById('palabrasScore').textContent = finalScore;

  const details = `
    <p>Palabras acertadas: <strong>${revealedCount}</strong> / 9</p>
    <p>Puntuacion final: <strong>${finalScore}</strong></p>
    ${allRevealed ? '<p style="color: var(--ac-green-dark); font-weight: 900;">TODAS CORRECTAS!</p>' : ''}
    <p style="font-size: 0.9rem; color: var(--ac-text-light);">
      Tiempo restante: ${palabrasState.timeLeft}s
    </p>
  `;
  showResults(finalScore, 18, details, 'palabras');
}

// Utility: shuffle array
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
