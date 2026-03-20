/* ==========================================
   MILLON.JS - El precio del cariño
   ========================================== */

let millonState = {
  preguntas: [],
  currentIndex: 0,
  dineroActual: 1000000,
  dineroInicial: 1000000,
  timer: null,
  timeLeft: 45,
  roundTimeTotal: 45,
  finished: false,
  resultados: [],
  presenterName: 'Presentador',
  presenterFile: 'Canela.png',
  uiWarningMessage: '',
  uiStatusMessage: '',
  uiStatusIsError: false,
  uiStatusTimer: null,
  pendingPreset: null,
  presetSelection: []
};

function pickRandomMillonPresenter() {
  const chars = (typeof availableCharacters !== 'undefined' && Array.isArray(availableCharacters))
    ? availableCharacters
    : [];

  if (chars.length === 0) {
    return { name: 'Canela', file: 'Canela.png' };
  }

  const picked = chars[Math.floor(Math.random() * chars.length)] || {};
  return {
    name: picked.name || 'Presentador',
    file: picked.file || 'Canela.png'
  };
}

function initMillonGame(config) {
  const preguntas = Array.isArray(config?.preguntas) ? config.preguntas : [];
  const presenter = pickRandomMillonPresenter();

  millonState = {
    preguntas,
    currentIndex: 0,
    dineroActual: 1000000,
    dineroInicial: 1000000,
    timer: null,
    timeLeft: 45,
    roundTimeTotal: 45,
    finished: false,
    resultados: [],
    presenterName: presenter.name,
    presenterFile: presenter.file,
    uiWarningMessage: '',
    uiStatusMessage: '',
    uiStatusIsError: false,
    uiStatusTimer: null,
    pendingPreset: null,
    presetSelection: []
  };

  renderMillonQuestion();
  startMillonTimer();
}

function stopMillonGame() {
  if (millonState.timer) {
    clearInterval(millonState.timer);
    millonState.timer = null;
  }
}

function getMillonRoundRules(index) {
  const round = index + 1;
  if (round <= 4) return { optionCount: 4, maxBetOptions: 3, allIn: false, time: 45 };
  if (round <= 7) return { optionCount: 3, maxBetOptions: 2, allIn: false, time: 40 };
  return { optionCount: 2, maxBetOptions: 1, allIn: true, time: 30 };
}

function startMillonTimer() {
  if (millonState.timer) clearInterval(millonState.timer);

  const q = millonState.preguntas[millonState.currentIndex];
  const rules = getMillonRoundRules(millonState.currentIndex);
  millonState.timeLeft = Math.max(10, parseInt(q?.tiempoSegundos, 10) || rules.time);
  millonState.roundTimeTotal = millonState.timeLeft;

  updateMillonTimerUI();

  millonState.timer = setInterval(() => {
    millonState.timeLeft -= 1;
    updateMillonTimerUI();

    if (millonState.timeLeft <= 0) {
      clearInterval(millonState.timer);
      millonState.timer = null;
      lockAndResolveMillonQuestion(true);
    }
  }, 1000);
}

function updateMillonTimerUI() {
  const timerEl = document.getElementById('millonTimer');
  if (timerEl) timerEl.textContent = Math.max(0, millonState.timeLeft);

  const timerBar = document.getElementById('millonTimerBar');
  if (timerBar) {
    const total = Math.max(1, millonState.roundTimeTotal || 1);
    const pct = Math.max(0, Math.min(100, (millonState.timeLeft / total) * 100));
    timerBar.style.width = pct + '%';
  }
}

function formatEuros(amount) {
  return new Intl.NumberFormat('es-ES').format(Math.max(0, amount)) + ' €';
}

function sanitizeBets(rawBets) {
  return rawBets.map(v => {
    const n = parseInt(v, 10);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.floor(n / 25000) * 25000;
  });
}

function getMillonCurrentBets() {
  const q = millonState.preguntas[millonState.currentIndex];
  if (!q) return [];
  return (q.opciones || []).map((_, i) => {
    const el = document.getElementById('millonBet-' + i);
    return el ? el.value : '0';
  });
}

function refreshMillonOverlayMessage() {
  const msgEl = document.getElementById('millonPresenterMsg');
  if (!msgEl) return;

  const warning = millonState.uiWarningMessage || '';
  const status = millonState.uiStatusMessage || '';
  const text = warning || status;
  const isError = Boolean(warning) || (Boolean(status) && !!millonState.uiStatusIsError);

  msgEl.textContent = text;
  msgEl.classList.toggle('show', !!text);
  msgEl.classList.toggle('error', isError);
}

function setMillonWarningMessage(message) {
  millonState.uiWarningMessage = message || '';
  refreshMillonOverlayMessage();
}

function setMillonStatusMessage(message, isError = false, autoHideMs = 0) {
  if (millonState.uiStatusTimer) {
    clearTimeout(millonState.uiStatusTimer);
    millonState.uiStatusTimer = null;
  }

  millonState.uiStatusMessage = message || '';
  millonState.uiStatusIsError = !!isError;
  refreshMillonOverlayMessage();

  if (millonState.uiStatusMessage && autoHideMs > 0) {
    const snapshot = millonState.uiStatusMessage;
    millonState.uiStatusTimer = setTimeout(() => {
      if (millonState.uiStatusMessage === snapshot) {
        millonState.uiStatusMessage = '';
        millonState.uiStatusIsError = false;
        refreshMillonOverlayMessage();
      }
      millonState.uiStatusTimer = null;
    }, autoHideMs);
  }
}

function getMillonSuspenseMs(index) {
  const round = index + 1;
  if (round >= 8) return 5000;
  return Math.min(4600, 1200 + (index * 550));
}

function lockMillonBetUI() {
  document.querySelectorAll('.millon-option input, .millon-bet-row button, .millon-actions button').forEach(el => {
    el.disabled = true;
  });
}

function runMillonTrapdoors(correctIndex) {
  const optionEls = Array.from(document.querySelectorAll('.millon-option'));
  const roundSuspense = getMillonSuspenseMs(millonState.currentIndex);
  const trapAnimMs = 780;

  if (optionEls.length === 0) {
    return trapAnimMs;
  }

  const incorrectEls = optionEls.filter((_, idx) => idx !== correctIndex);
  const count = incorrectEls.length;

  if (count === 0) {
    return trapAnimMs;
  }

  const initialDelay = Math.max(450, Math.floor(roundSuspense * 0.28));
  const usableWindow = Math.max(0, roundSuspense - initialDelay);
  const step = count > 1 ? Math.max(320, Math.floor(usableWindow / (count - 1))) : 0;
  const lastOpenAt = initialDelay + (count - 1) * step;
  const totalDuration = lastOpenAt + trapAnimMs;

  incorrectEls.forEach((el, i) => {
    setTimeout(() => {
      el.classList.add('wrong', 'trap-opening');
    }, initialDelay + (i * step));
  });

  return totalDuration;
}

function updateMillonBetStats() {
  const bets = sanitizeBets(getMillonCurrentBets());
  const apostado = bets.reduce((a, b) => a + b, 0);
  const restante = Math.max(0, millonState.dineroActual - apostado);

  const betEl = document.getElementById('millonApostado');
  const leftEl = document.getElementById('millonSinApostar');

  if (betEl) betEl.textContent = formatEuros(apostado);
  if (leftEl) leftEl.textContent = formatEuros(restante);
  setMillonWarningMessage(apostado > millonState.dineroActual ? 'Has apostado mas dinero del disponible' : '');
}

function setMillonBet(index, delta) {
  const input = document.getElementById('millonBet-' + index);
  if (!input) return;

  const current = Math.max(0, parseInt(input.value || '0', 10) || 0);
  const next = Math.max(0, current + delta);
  input.value = String(Math.floor(next / 25000) * 25000);
  updateMillonBetStats();
}

function clearMillonBets() {
  const q = millonState.preguntas[millonState.currentIndex];
  if (!q) return;
  (q.opciones || []).forEach((_, i) => {
    const input = document.getElementById('millonBet-' + i);
    if (input) input.value = '0';
  });
  updateMillonBetStats();
}

function updatePresetUIHint() {
  const container = document.querySelector('.millon-options');
  if (!container) return;

  container.classList.remove('millon-selecting');

  if (millonState.pendingPreset === 'allin') {
    container.classList.add('millon-selecting');
    setMillonStatusMessage('Selecciona una opción para mover TODO el dinero');
    return;
  }

  if (millonState.pendingPreset === 'half') {
    container.classList.add('millon-selecting');
    setMillonStatusMessage('Selecciona dos opciones para repartir mitad y mitad');
    return;
  }

  setMillonStatusMessage('');
}

function clearPresetSelectionMarks() {
  document.querySelectorAll('.millon-option').forEach(el => el.classList.remove('selected'));
}

function handleMillonOptionClick(index) {
  if (!millonState.pendingPreset) return;

  const q = millonState.preguntas[millonState.currentIndex];
  if (!q) return;
  const optionCount = Array.isArray(q.opciones) ? q.opciones.length : 0;
  if (index < 0 || index >= optionCount) return;

  if (millonState.pendingPreset === 'allin') {
    clearMillonBets();
    const input = document.getElementById('millonBet-' + index);
    if (input) input.value = String(millonState.dineroActual);
    millonState.pendingPreset = null;
    millonState.presetSelection = [];
    clearPresetSelectionMarks();
    updateMillonBetStats();
    updatePresetUIHint();
    return;
  }

  if (millonState.pendingPreset === 'half') {
    const already = millonState.presetSelection.indexOf(index);
    if (already >= 0) {
      millonState.presetSelection.splice(already, 1);
    } else if (millonState.presetSelection.length < 2) {
      millonState.presetSelection.push(index);
    }

    clearPresetSelectionMarks();
    millonState.presetSelection.forEach(i => {
      const el = document.querySelector('.millon-option[data-option-index="' + i + '"]');
      if (el) el.classList.add('selected');
    });

    if (millonState.presetSelection.length === 2) {
      const [first, second] = millonState.presetSelection;
      const half = Math.floor((millonState.dineroActual / 2) / 25000) * 25000;
      const rest = millonState.dineroActual - half;

      clearMillonBets();
      const firstInput = document.getElementById('millonBet-' + first);
      const secondInput = document.getElementById('millonBet-' + second);
      if (firstInput) firstInput.value = String(half);
      if (secondInput) secondInput.value = String(rest);

      millonState.pendingPreset = null;
      millonState.presetSelection = [];
      clearPresetSelectionMarks();
      updateMillonBetStats();
      updatePresetUIHint();
    }
  }
}

function applyMillonAllIn() {
  const q = millonState.preguntas[millonState.currentIndex];
  if (!q) return;
  millonState.pendingPreset = 'allin';
  millonState.presetSelection = [];
  clearPresetSelectionMarks();
  updatePresetUIHint();
}

function applyMillonHalfHalf() {
  const q = millonState.preguntas[millonState.currentIndex];
  if (!q) return;

  const rules = getMillonRoundRules(millonState.currentIndex);
  if (rules.allIn) {
    setMillonStatusMessage('En la ultima pregunta solo puedes apostar todo a una opcion', true, 2500);
    return;
  }

  millonState.pendingPreset = 'half';
  millonState.presetSelection = [];
  clearPresetSelectionMarks();
  updatePresetUIHint();
}

function lockAndResolveMillonQuestion(byTimeout = false) {
  if (millonState.finished) return;

  const q = millonState.preguntas[millonState.currentIndex];
  if (!q) {
    finishMillonGame();
    return;
  }

  const rules = getMillonRoundRules(millonState.currentIndex);
  const bets = sanitizeBets(getMillonCurrentBets());
  const apostado = bets.reduce((a, b) => a + b, 0);
  const betOptions = bets.filter(v => v > 0).length;

  if (!byTimeout) {
    if (apostado > millonState.dineroActual) {
      showToast('Has apostado mas dinero del disponible', true);
      return;
    }

    if (rules.allIn) {
      if (apostado !== millonState.dineroActual || betOptions !== 1) {
        showToast('Ultima pregunta: debes apostar todo a una sola opcion', true);
        return;
      }
    } else {
      if (betOptions === 0) {
        showToast('Debes apostar al menos en una opcion', true);
        return;
      }
      if (betOptions > rules.maxBetOptions) {
        showToast('En esta ronda solo puedes apostar en ' + rules.maxBetOptions + ' opciones', true);
        return;
      }
    }
  }

  const correctIndex = parseInt(q.correctaIndex, 10);
  const saved = Number.isFinite(correctIndex) ? (bets[correctIndex] || 0) : 0;
  const perdidoSinApostar = Math.max(0, millonState.dineroActual - apostado);

  millonState.resultados.push({
    pregunta: q.pregunta || '',
    apostado,
    saved,
    perdidoSinApostar,
    byTimeout
  });

  lockMillonBetUI();
  setMillonStatusMessage('Abriendo trampillas...', false);

  const suspenseMs = runMillonTrapdoors(correctIndex);

  const optionEls = Array.from(document.querySelectorAll('.millon-option'));
  setTimeout(() => {
    const correctEl = optionEls[correctIndex];
    if (correctEl) correctEl.classList.add('correct');
    setMillonStatusMessage('Solo queda la correcta: se salvan ' + formatEuros(saved) + (byTimeout ? ' (tiempo agotado)' : ''), false, 2200);
  }, suspenseMs + 60);

  millonState.dineroActual = saved;
  const currentMoneyEl = document.getElementById('millonCurrentMoney');
  if (currentMoneyEl) currentMoneyEl.textContent = formatEuros(millonState.dineroActual);

  if (millonState.timer) {
    clearInterval(millonState.timer);
    millonState.timer = null;
  }

  setTimeout(() => {
    if (millonState.dineroActual <= 0) {
      finishMillonGame();
      return;
    }
    millonState.currentIndex += 1;
    if (millonState.currentIndex >= millonState.preguntas.length) {
      finishMillonGame();
      return;
    }
    renderMillonQuestion();
    startMillonTimer();
  }, suspenseMs + 2500);
}

function submitMillonBets() {
  lockAndResolveMillonQuestion(false);
}

function renderMillonQuestion() {
  const container = document.getElementById('millonContent');
  if (!container) return;

  const q = millonState.preguntas[millonState.currentIndex];
  if (!q) {
    finishMillonGame();
    return;
  }

  const rules = getMillonRoundRules(millonState.currentIndex);
  let opciones = Array.isArray(q.opciones) ? q.opciones.slice(0, rules.optionCount) : [];
  while (opciones.length < rules.optionCount) opciones.push('Opcion ' + (opciones.length + 1));

  const allInHint = rules.allIn
    ? '<p class="millon-hint">Ultima pregunta: apuesta TODO a una sola opcion.</p>'
    : '<p class="millon-hint">Puedes apostar en un maximo de ' + rules.maxBetOptions + ' opciones.</p>';

  container.innerHTML = `
    <div class="millon-container">
      <div class="millon-topbar">
        <div class="millon-pill">Pregunta ${millonState.currentIndex + 1} / ${millonState.preguntas.length}</div>
        <div class="millon-pill">Tiempo: <span id="millonTimer">${millonState.timeLeft}</span>s</div>
        <div class="millon-pill">Disponible: <span id="millonCurrentMoney">${formatEuros(millonState.dineroActual)}</span></div>
      </div>
      <div class="millon-timer-track">
        <div class="millon-timer-bar" id="millonTimerBar"></div>
      </div>

      <div class="millon-presenter-wrap">
        <div class="millon-presenter-avatar">
          <img src="/img/characters/${encodeURIComponent(millonState.presenterFile || 'Canela.png')}" alt="${millonState.presenterName || 'Presentador'}" onerror="this.src='/img/characters/Canela.png'" />
          <span class="millon-presenter-name">${millonState.presenterName || 'Presentador'}</span>
        </div>
        <div class="millon-presenter-bubble">
          <h3 class="millon-question">${q.pregunta || 'Pregunta sin texto'}</h3>
          ${allInHint}
          <div class="millon-presenter-msg" id="millonPresenterMsg" aria-live="polite"></div>
        </div>
      </div>

      <div class="millon-options">
        ${opciones.map((op, i) => `
          <div class="millon-option" data-option-index="${i}" onclick="handleMillonOptionClick(${i})">
            <div class="millon-trapdoor" aria-hidden="true"></div>
            <div class="millon-option-inner">
              <div class="millon-option-title">${op}</div>
              <div class="millon-bet-row">
                <button class="ac-button millon-mini millon-minus" onclick="event.stopPropagation(); setMillonBet(${i}, -25000)">-25k</button>
                <input type="number" min="0" step="25000" value="0" id="millonBet-${i}" oninput="updateMillonBetStats()" />
                <button class="ac-button millon-mini millon-plus" onclick="event.stopPropagation(); setMillonBet(${i}, 25000)">+25k</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="millon-stats">
        <span>Apostado: <strong id="millonApostado">0 €</strong></span>
        <span>Sin apostar (se pierde): <strong id="millonSinApostar">${formatEuros(millonState.dineroActual)}</strong></span>
      </div>

      <div class="millon-actions">
        <button class="ac-button" onclick="clearMillonBets()">Limpiar</button>
        <button class="ac-button" onclick="applyMillonAllIn()">Apostar todo</button>
        <button class="ac-button" onclick="applyMillonHalfHalf()">Mitad y mitad</button>
        <button class="ac-button ac-button-primary" onclick="submitMillonBets()">Confirmar apuestas</button>
      </div>
    </div>
  `;

  millonState.pendingPreset = null;
  millonState.presetSelection = [];
  updateMillonBetStats();
  updateMillonTimerUI();
  updatePresetUIHint();
}

function finishMillonGame() {
  if (millonState.finished) return;
  millonState.finished = true;
  stopMillonGame();

  const roundsPlayed = millonState.currentIndex >= millonState.preguntas.length
    ? millonState.preguntas.length
    : millonState.currentIndex + 1;

  const score = millonState.dineroActual;
  const details = `
    <p>Has terminado El precio del cariño.</p>
    <p>Rondas jugadas: <strong>${roundsPlayed}</strong></p>
    <p>Dinero inicial: <strong>${formatEuros(millonState.dineroInicial)}</strong></p>
    <p>Dinero final: <strong>${formatEuros(score)}</strong></p>
  `;

  showResults(score, millonState.dineroInicial, details, 'millon');
}
