/* ==========================================
   ROSCO.JS - El Rosco Final
   Layout: left (wheel + input) | right (Canela + definition)
   ========================================== */

let roscoState = {
  preguntas: [],
  currentIndex: 0,
  aciertos: 0,
  fallos: 0,
  maxFallos: 3,
  estados: [], // 'pending', 'correct', 'wrong', 'pasapalabra'
  timer: null,
  timeLeft: 180,
  totalTime: 180,
  finished: false,
  pasapalabrasRemaining: false,
  tabletView: 'definition'
};

/* ---------- VOICE RECOGNITION ---------- */
let roscoRecognition = null;
let roscoIsRecording = false;

function initVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  const recognition = new SpeechRecognition();
  recognition.lang = 'es-ES';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.trim();
    const input = document.getElementById('roscoInput');
    if (input) {
      input.value = transcript;
      input.focus();
    }
    stopVoiceRecording();
  };

  recognition.onerror = () => { stopVoiceRecording(); };
  recognition.onend = () => { stopVoiceRecording(); };

  return recognition;
}

function toggleVoiceRecording() {
  if (roscoIsRecording) {
    stopVoiceRecording();
  } else {
    startVoiceRecording();
  }
}

function startVoiceRecording() {
  if (!roscoRecognition) roscoRecognition = initVoiceRecognition();
  if (!roscoRecognition) return;

  roscoIsRecording = true;
  const btn = document.getElementById('roscoVoiceBtn');
  if (btn) btn.classList.add('recording');
  roscoRecognition.start();
}

function stopVoiceRecording() {
  roscoIsRecording = false;
  const btn = document.getElementById('roscoVoiceBtn');
  if (btn) btn.classList.remove('recording');
  if (roscoRecognition) {
    try { roscoRecognition.stop(); } catch(e) {}
  }
}

/* ---------- TABLET CONTEXT VIEW ---------- */
function initRoscoTabletView() {
  const layout = document.getElementById('roscoLayout');
  const avatarImg = document.getElementById('roscoTabletAvatarImg');
  if (!layout) return;

  if (avatarImg) {
    const avatarSrc = (typeof selectedUser !== 'undefined' && selectedUser && selectedUser.file)
      ? '/img/users/' + encodeURIComponent(selectedUser.file)
      : '/img/characters/Canela.png';
    avatarImg.src = avatarSrc;
  }

  if (window.matchMedia('(max-width: 768px)').matches) {
    // En tablet arrancamos mostrando Canela + definición
    roscoState.tabletView = 'definition';
    layout.classList.remove('tablet-view-rosco');
    layout.classList.add('tablet-view-definition');
    renderRosco();
  } else {
    roscoState.tabletView = 'rosco';
    layout.classList.remove('tablet-view-definition', 'tablet-view-rosco');
  }
}

function toggleRoscoTabletView(view) {
  const layout = document.getElementById('roscoLayout');
  if (!layout || !window.matchMedia('(max-width: 768px)').matches) return;

  if (view === 'rosco') {
    roscoState.tabletView = 'rosco';
    layout.classList.remove('tablet-view-definition');
    layout.classList.add('tablet-view-rosco');
    renderRosco();
    return;
  }

  roscoState.tabletView = 'definition';
  layout.classList.remove('tablet-view-rosco');
  layout.classList.add('tablet-view-definition');
  renderRosco();
}

/* ---------- TEXT-TO-SPEECH ---------- */
let roscoSelectedVoice = null;

function populateVoiceList() {
  const select = document.getElementById('roscoVoiceSelect');
  if (!select) return;

  const voices = speechSynthesis.getVoices();
  select.innerHTML = '';

  // Prefer Spanish voices
  const esVoices = voices.filter(v => v.lang.startsWith('es'));

  // Default to first Spanish voice
  if (esVoices.length > 0) {
    roscoSelectedVoice = esVoices[0];
    select.value = '0';
  }

}

function speakDefinition() {
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
    return;
  }

  const current = roscoState.preguntas[roscoState.currentIndex];
  if (!current) return;

  const tipoText = current.tipo === 'empieza'
    ? `Empieza por ${current.letra}.`
    : `Contiene la ${current.letra}.`;

  const text = `${tipoText} ${current.definicion}`;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-ES';
  utterance.rate = 0.95;

  if (roscoSelectedVoice) {
    utterance.voice = roscoSelectedVoice;
  }

  speechSynthesis.speak(utterance);
}

// Load voices (may load async)
if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.onvoiceschanged = populateVoiceList;
  populateVoiceList();
}

function initRoscoGame(config) {
  roscoState = {
    preguntas: [...config.preguntas],
    currentIndex: 0,
    aciertos: 0,
    fallos: 0,
    maxFallos: config.maxFallos || 3,
    estados: config.preguntas.map(() => 'pending'),
    timer: null,
    timeLeft: config.tiempoSegundos || 180,
    totalTime: config.tiempoSegundos || 180,
    finished: false,
    pasapalabrasRemaining: false,
    tabletView: 'definition'
  };

  // Populate voice list when entering rosco
  populateVoiceList();

  renderRosco();
  updateDefinitionPanel();
  initRoscoTabletView();
  startRoscoTimer();
}

function stopRoscoGame() {
  if (roscoState.timer) {
    clearInterval(roscoState.timer);
    roscoState.timer = null;
  }
  stopVoiceRecording();
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}

function startRoscoTimer() {
  if (roscoState.timer) clearInterval(roscoState.timer);

  roscoState.timer = setInterval(() => {
    roscoState.timeLeft--;
    const timerEl = document.getElementById('roscoTimerCircle');
    if (timerEl) timerEl.textContent = roscoState.timeLeft;

    if (roscoState.timeLeft <= 0) {
      clearInterval(roscoState.timer);
      finishRosco();
    }
  }, 1000);
}

/* ---------- UPDATE RIGHT-PANEL DEFINITION ---------- */
function updateDefinitionPanel() {
  if (roscoState.finished) return;
  const current = roscoState.preguntas[roscoState.currentIndex];
  if (!current) return;

  const tipoText = current.tipo === 'empieza'
    ? `Empieza por "${current.letra}"`
    : `Contiene la "${current.letra}"`;

  const letterEl = document.getElementById('roscoDefLetter');
  const tipoEl  = document.getElementById('roscoDefTipo');
  const textEl  = document.getElementById('roscoDefText');
  const letterInlineEl = document.getElementById('roscoDefLetterInline');
  const tipoInlineEl  = document.getElementById('roscoDefTipoInline');
  const textInlineEl  = document.getElementById('roscoDefTextInline');

  if (letterEl) letterEl.textContent = current.letra;
  if (tipoEl)  tipoEl.textContent = tipoText;
  if (textEl)  textEl.textContent = current.definicion;
  if (letterInlineEl) letterInlineEl.textContent = current.letra;
  if (tipoInlineEl)  tipoInlineEl.textContent = tipoText;
  if (textInlineEl)  textInlineEl.textContent = current.definicion;
}

/* ---------- RENDER WHEEL + INPUT (left column only) ---------- */
function renderRosco() {
  const container = document.getElementById('roscoContent');
  if (!container) return;

  const isTablet = window.matchMedia('(max-width: 768px)').matches;
  const showDefinitionInGlass = isTablet && roscoState.tabletView === 'definition';

  if (showDefinitionInGlass) {
    const current = roscoState.preguntas[roscoState.currentIndex];
    if (!current) return;

    const tipoText = current.tipo === 'empieza'
      ? `Empieza por "${current.letra}"`
      : `Contiene la "${current.letra}"`;

    // Counters kept visible in tablet definition mode
    const countersHTML = `
      <div class="rosco-counters">
        <div class="rosco-counter timer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          <span id="roscoTimerCircle">${roscoState.timeLeft}</span>
        </div>
        <div class="rosco-counter aciertos">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span id="roscoAciertos">${roscoState.aciertos}</span>
        </div>
        <div class="rosco-counter fallos">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          <span id="roscoFallos">${roscoState.fallos}</span>
        </div>
      </div>
    `;

    // Input controls also kept visible in tablet definition mode
    let inputHTML = '';
    if (!roscoState.finished) {
      inputHTML = `
        <div class="rosco-input-zone">
          <div class="rosco-input-row">
            <button class="rosco-pasapalabra-btn" onclick="pasapalabraAction()">Pasapalabra</button>
            <input type="text" class="rosco-input" id="roscoInput"
              placeholder="Escribe tu respuesta..."
              autocomplete="off" autofocus>
            <button class="rosco-voice-btn" id="roscoSpeakBtn" onclick="speakDefinition()" title="Escuchar pista">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              </svg>
            </button>
            <button class="rosco-submit-btn" onclick="submitRoscoAnswer()">Enviar</button>
          </div>
          <div class="rosco-feedback" id="roscoFeedback"></div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="rosco-glass-container rosco-glass-container-definition">
        <div class="rosco-tablet-definition-view">
          <img src="img/characters/Canela.png" alt="Canela" class="rosco-tablet-canela-inline" />
          <div class="rosco-definition-box rosco-definition-box-inline">
            <div class="rosco-def-letter" id="roscoDefLetterInline">${current.letra}</div>
            <div class="rosco-def-tipo" id="roscoDefTipoInline">${tipoText}</div>
            <div class="rosco-def-text" id="roscoDefTextInline">${current.definicion}</div>
            <button class="rosco-tts-btn" onclick="speakDefinition()" title="Leer definición">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
            </button>
          </div>
          ${countersHTML}
          ${inputHTML}
        </div>
      </div>
    `;

    setTimeout(() => {
      const input = document.getElementById('roscoInput');
      if (input) input.focus();
    }, 100);

    return;
  }

  const letras = roscoState.preguntas;
  const total = letras.length;

  // Wheel
  const radius = getWheelRadius();
  const centerX = radius + 22;
  const centerY = radius + 22;
  const wheelSize = (radius + 22) * 2;

  let wheelHTML = `<div class="rosco-wheel" style="width:${wheelSize}px; height:${wheelSize}px;">`;

  letras.forEach((pregunta, i) => {
    const angle = (i / total) * 2 * Math.PI - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle) - 22;
    const y = centerY + radius * Math.sin(angle) - 22;

    let stateClass = '';
    if (i === roscoState.currentIndex) stateClass = 'current';
    else if (roscoState.estados[i] === 'correct') stateClass = 'correct';
    else if (roscoState.estados[i] === 'wrong') stateClass = 'wrong';
    else if (roscoState.estados[i] === 'pasapalabra') stateClass = 'pasapalabra';

    wheelHTML += `<div class="rosco-letter ${stateClass}" style="left:${x}px; top:${y}px;">${pregunta.letra}</div>`;
  });

  // Avatar circle (center of wheel)
  const avatarSrc = (typeof selectedUser !== 'undefined' && selectedUser && selectedUser.file)
    ? '/img/users/' + encodeURIComponent(selectedUser.file)
    : '/img/characters/Canela.png';
  wheelHTML += `<div class="rosco-avatar-circle" style="left:${centerX}px; top:${centerY}px;">
    <img src="${avatarSrc}" alt="avatar" />
  </div>`;

  wheelHTML += '</div>';

  // Counters bar (below wheel, no overlap)
  let countersHTML = `
    <div class="rosco-counters">
      <div class="rosco-counter timer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        <span id="roscoTimerCircle">${roscoState.timeLeft}</span>
      </div>
      <div class="rosco-counter aciertos">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        <span id="roscoAciertos">${roscoState.aciertos}</span>
      </div>
      <div class="rosco-counter fallos">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        <span id="roscoFallos">${roscoState.fallos}</span>
      </div>
    </div>
  `;

  // Input zone with voice button
  let inputHTML = '';
  if (!roscoState.finished) {
    inputHTML = `
      <div class="rosco-input-zone">
        <div class="rosco-input-row">
          <button class="rosco-pasapalabra-btn" onclick="pasapalabraAction()">Pasapalabra</button>
          <input type="text" class="rosco-input" id="roscoInput"
            placeholder="Escribe tu respuesta..."
            autocomplete="off" autofocus>
          <button class="rosco-voice-btn" id="roscoSpeakBtn" onclick="speakDefinition()" title="Escuchar pista">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
          </button>
          <button class="rosco-submit-btn" onclick="submitRoscoAnswer()">Enviar</button>
        </div>
        <div class="rosco-feedback" id="roscoFeedback"></div>
      </div>
    `;
  }

  container.innerHTML = '<div class="rosco-glass-container">' + wheelHTML + countersHTML + inputHTML + '</div>';

  // Focus input
  setTimeout(() => {
    const input = document.getElementById('roscoInput');
    if (input) input.focus();
  }, 100);
}

function getWheelRadius() {
  const w = window.innerWidth;
  if (w <= 480) return 120;
  if (w <= 768) return 145;
  // In the 2/3 column, scale down a bit
  return 190;
}

function submitRoscoAnswer() {
  if (roscoState.finished) return;

  const input = document.getElementById('roscoInput');
  const answer = input.value.trim();
  if (!answer) return;

  const current = roscoState.preguntas[roscoState.currentIndex];
  const isCorrect = normalizeStr(answer) === normalizeStr(current.respuesta);

  if (isCorrect) {
    roscoState.estados[roscoState.currentIndex] = 'correct';
    roscoState.aciertos++;
    const acEl = document.getElementById('roscoAciertos');
    if (acEl) acEl.textContent = roscoState.aciertos;
    showRoscoFeedback(true, 'Correcto!');
    showCanelaAction('correct');
  } else {
    roscoState.estados[roscoState.currentIndex] = 'wrong';
    roscoState.fallos++;
    const faEl = document.getElementById('roscoFallos');
    if (faEl) faEl.textContent = roscoState.fallos;
    showRoscoFeedback(false, `Incorrecto. La respuesta era: ${current.respuesta}`);
    showCanelaAction('wrong');
  }

  // Max fails check
  if (roscoState.fallos >= roscoState.maxFallos) {
    setTimeout(() => finishRosco(), 1500);
    return;
  }

  setTimeout(() => {
    moveToNextRoscoQuestion();
  }, 1500);
}

function pasapalabraAction() {
  if (roscoState.finished) return;

  roscoState.estados[roscoState.currentIndex] = 'pasapalabra';
  showRoscoFeedback(false, 'Pasapalabra!');

  setTimeout(() => {
    moveToNextRoscoQuestion();
  }, 800);
}

function moveToNextRoscoQuestion() {
  const total = roscoState.preguntas.length;
  let found = false;

  for (let i = 1; i <= total; i++) {
    const nextIdx = (roscoState.currentIndex + i) % total;
    if (roscoState.estados[nextIdx] === 'pending' || roscoState.estados[nextIdx] === 'pasapalabra') {
      roscoState.currentIndex = nextIdx;
      found = true;
      break;
    }
  }

  if (!found) {
    finishRosco();
    return;
  }

  // Check if only pasapalabras left
  const hasPending = roscoState.estados.some(s => s === 'pending');
  if (!hasPending) {
    const hasPasapalabra = roscoState.estados.some(s => s === 'pasapalabra');
    if (!hasPasapalabra) {
      finishRosco();
      return;
    }
    roscoState.pasapalabrasRemaining = true;
  }

  renderRosco();
  updateDefinitionPanel();
}

function showRoscoFeedback(isCorrect, message) {
  const feedback = document.getElementById('roscoFeedback');
  if (feedback) {
    feedback.className = 'rosco-feedback ' + (isCorrect ? 'correct' : 'wrong');
    feedback.textContent = message;
  }
}

function finishRosco() {
  stopRoscoGame();
  roscoState.finished = true;

  const total = roscoState.preguntas.length;
  const unanswered = roscoState.estados.filter(s => s === 'pending' || s === 'pasapalabra').length;
  const lostByFails = roscoState.fallos >= roscoState.maxFallos;
  const lostByTime = roscoState.timeLeft <= 0;

  let reason = '';
  if (lostByFails) reason = 'Has alcanzado el maximo de fallos permitidos';
  else if (lostByTime) reason = 'Se acabo el tiempo!';
  else if (roscoState.aciertos === total) reason = 'ROSCO COMPLETO! INCREIBLE!';
  else reason = 'Rosco finalizado';

  const perfectRosco = roscoState.aciertos === total && roscoState.fallos === 0 && unanswered === 0;

  const details = `
    <p>${reason}</p>
    <p>Aciertos: <strong style="color: var(--ac-green-dark);">${roscoState.aciertos}</strong></p>
    <p>Fallos: <strong style="color: var(--ac-red);">${roscoState.fallos}</strong></p>
    <p>Sin responder: <strong>${unanswered}</strong></p>
    <p>Tiempo restante: <strong>${roscoState.timeLeft}s</strong></p>
  `;

  if (perfectRosco) {
    showResults(roscoState.aciertos, total, details, 'rosco', {
      summaryImage: '/img/actions/' + encodeURIComponent('Canela Aprobado.jpg'),
      skipCharacterSpeak: true
    });
    return;
  }

  showResults(roscoState.aciertos, total, details, 'rosco');
}

/* ---------- KEYBOARD SHORTCUTS ---------- */
document.addEventListener('keydown', (e) => {
  // Only active during rosco game
  if (currentGame !== 'rosco' || roscoState.finished) return;

  // Ctrl+Space → pasapalabra
  if (e.ctrlKey && e.code === 'Space') {
    e.preventDefault();
    pasapalabraAction();
    return;
  }

  // Enter → submit answer
  if (e.key === 'Enter') {
    e.preventDefault();
    submitRoscoAnswer();
    return;
  }
});

// Re-render on resize
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (currentGame === 'rosco' && !roscoState.finished) {
      renderRosco();
      initRoscoTabletView();
    }
  }, 250);
});
