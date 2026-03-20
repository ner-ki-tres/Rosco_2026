/* ==========================================
   CHARACTERS.JS — Walking Characters System
   3 characters walk across the bottom of
   the game-select screen, taking turns speaking
   ========================================== */

const characterMessages = {
  idle: [
    'Pulsa Ctrl + Enter para pasar palabra en El Rosco',
    'Buenos días bebuchi, estas preciosa!',
    'Dale tataa que puedes con todooo!!',
    'Pero que hermoso y humilde es Nerik, ejem... que día tan agradable que hace',
    'Puedes escoger los fondos animados en la esquina superior derecha',
    '¿Sabías que el creador de la prueba `El Rosco` es el mismo que dormirá en el sofá si pierdes?',
    'Te quiero mucho, como la trucha al trucho',
    'Buenas soy A turo pero me puedes llamar Carturo, igual puede que no lo sea jajaja',
    'Nuevo estudio revela que salir de compras con la bebi puede aumentar tu estilo hasta en un 90%!!',
    'Queda poquísimo para el viaje a Sevilla! Nos vemos alli hermosos!',
    'Oye que ganas de un buen gofrito con su nutella... estoy disponible cuando quieras',
    'Si al final del día de pierna tu corrieras, no tendrias agujetas lumbreras!',
    'Atrévete con el Gran Desafío y consigue completar El Rosco Final con el tiempo obtenido de las pruebas!!',
    'Para añadir canciones tendrás que copiar el enlace de la canción en YouTube y esperar su descarga con paciencia',
    'Desactiva nuestras voces si te resulta molesto en el menú de configuración',
    'Ay... lo que daría por el boniato frito del Honest Greens...',
    'Hay dos cosas que siempre se cumplen, los años y que Laura tenga razón'
  ],
  correct: [
    '¡Qué barbaridad! ¿No serás ingeniera verdad?',
    'Diooos vaya coco gordo!!',
    'Ni un pelo de tonta, eso es!',
    'Devoraste reina a ti nadie te despeina!',
    'Menuda servida de coño!',
    'Uy a ti te han chivado algo... jajaja',
    'Al saber jugar le llaman suerte!',
    'Uyyy que peloteooo! jajaja'
  ],
  wrong: [
    'Ya no me quieres, ya veo...',
    'A la próxima igual vendría bien prepararse un poco jajaja',
    'Veeenga igual en esta me he pasado, puede ser',
    'Roma no se conquisto en dos dias',
    'Puedes parar de decir que la he cagado? Es que la has cagado tio',
    'BOOOMBOCLAAT!! Menudo cagadón! jajaja'
  ]
};

/* ==========================================
   AUDIO SYSTEM (AC voice)
   ========================================== */

let audioCtx = null;
let audioPoolFiles = [];
const audioBuffers = {};

async function loadAudioPool() {
  try {
    const res = await fetch('/api/audios');
    const files = await res.json();
    audioPoolFiles = Array.isArray(files) ? files : [];
  } catch (err) {
    console.warn('No se pudieron cargar audios:', err);
    audioPoolFiles = [];
  }
}

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

async function fetchAudioBuffer(filename) {
  if (audioBuffers[filename]) return audioBuffers[filename];
  try {
    const resp = await fetch(`/audio/${encodeURIComponent(filename)}`);
    const ab = await resp.arrayBuffer();
    const ctx = getAudioContext();
    const buf = await ctx.decodeAudioData(ab.slice(0));
    audioBuffers[filename] = buf;
    return buf;
  } catch (err) {
    console.warn('Error cargando buffer:', filename, err);
    return null;
  }
}

function findZeroCrossing(channelData, startSample, windowSamples, threshold = 0.002) {
  const len = channelData.length;
  let end = Math.min(len, startSample + windowSamples);
  for (let i = startSample; i < end; i++) {
    if (Math.abs(channelData[i]) < threshold) return i;
  }
  let backStart = Math.max(0, startSample - windowSamples);
  for (let i = startSample; i >= backStart; i--) {
    if (Math.abs(channelData[i]) < threshold) return i;
  }
  return startSample;
}

async function playAudioFragmentFromPool(textLength) {
  if (!audioPoolFiles || audioPoolFiles.length === 0) return false;
  const filename = audioPoolFiles[Math.floor(Math.random() * audioPoolFiles.length)];
  const buf = await fetchAudioBuffer(filename);
  if (!buf) return false;

  const ctx = getAudioContext();
  const desired = Math.min(2.5, Math.max(0.4, (textLength / 12)));
  if (desired >= buf.duration) {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.02);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + buf.duration - 0.02);
    src.connect(g); g.connect(ctx.destination);
    src.start(); src.stop(ctx.currentTime + buf.duration);
    return true;
  }

  const maxStart = Math.max(0, buf.duration - desired - 0.05);
  let start = Math.random() * maxStart;
  const sr = buf.sampleRate;
  const startSample = Math.floor(start * sr);
  const windowSamples = Math.floor(0.05 * sr);
  const channelData = buf.numberOfChannels > 0 ? buf.getChannelData(0) : null;
  let alignedSample = startSample;
  if (channelData) alignedSample = findZeroCrossing(channelData, startSample, windowSamples);
  const alignedStart = alignedSample / sr;

  const src = ctx.createBufferSource();
  src.buffer = buf;
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(1.0, now + 0.02);
  gain.gain.setValueAtTime(1.0, now + desired - 0.03);
  gain.gain.linearRampToValueAtTime(0, now + desired);
  src.connect(gain); gain.connect(ctx.destination);
  try {
    src.start(now, alignedStart, desired);
    src.stop(now + desired + 0.05);
    return true;
  } catch (err) {
    console.warn('Error al leer el fragmento:', err);
    return false;
  }
}

const voiceVariants = [
  { baseFreq: 520, freqRange: 120, syllableDuration: 0.08, pauseDuration: 0.03, waveform: 'square' },
  { baseFreq: 580, freqRange: 100, syllableDuration: 0.07, pauseDuration: 0.025, waveform: 'square' },
  { baseFreq: 490, freqRange: 140, syllableDuration: 0.09, pauseDuration: 0.035, waveform: 'triangle' }
];

let charactersMuted = false;

function playACVoice(textLength) {
  if (charactersMuted) return;
  if (audioPoolFiles && audioPoolFiles.length > 0) {
    playAudioFragmentFromPool(textLength).catch(() => playACVoiceSynthetic(textLength));
    return;
  }
  playACVoiceSynthetic(textLength);
}

function playACVoiceSynthetic(textLength) {
  const ctx = getAudioContext();
  const variant = voiceVariants[Math.floor(Math.random() * voiceVariants.length)];
  const syllables = Math.min(12, Math.max(4, Math.floor(textLength / 5)));
  let time = ctx.currentTime + 0.05;

  for (let i = 0; i < syllables; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = variant.waveform;
    const freq = variant.baseFreq + (Math.random() - 0.5) * variant.freqRange;
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.linearRampToValueAtTime(freq + (Math.random() - 0.5) * 60, time + variant.syllableDuration * 0.7);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800 + Math.random() * 600, time);
    filter.Q.setValueAtTime(2, time);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.15, time + 0.01);
    gain.gain.setValueAtTime(0.12, time + 0.015);
    gain.gain.linearRampToValueAtTime(0, time + variant.syllableDuration);
    osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    osc.start(time); osc.stop(time + variant.syllableDuration + 0.01);
    time += variant.syllableDuration + variant.pauseDuration + (Math.random() * 0.02);
  }
}

/* ==========================================
   WALKER SYSTEM — 3 walking characters
   ========================================== */

const WALKER_COUNT = 3;
const WALKER_SPEED_MIN = 0.4;  // px per frame (~60fps)
const WALKER_SPEED_MAX = 0.8;
const RESPAWN_DELAY = 500; // ms after exiting screen
const MSG_GAP = 800; // ms between one message ending and next starting

let walkers = [];           // array of walker objects
let walkerAnimFrame = null;  // requestAnimationFrame id
let walkerActive = false;
let currentSpeaker = null;   // index of walker currently speaking
let speechBusy = false;      // true while a message is being displayed
let lastMsgTime = 0;         // timestamp when last message ended
let lastUsedMsgIndices = []; // avoid repeating recent messages

// Track which character indices (into availableCharacters) are currently walking
let activeCharIndices = [];
let lastExitedCharIdx = -1;

/**
 * Create a walker DOM element
 */
function createWalkerElement(id) {
  const el = document.createElement('div');
  el.className = 'walker walking';
  el.id = 'walker-' + id;
  el.innerHTML = `
    <div class="walker-bubble" id="walkerBubble-${id}">
      <p id="walkerText-${id}"></p>
    </div>
    <div class="walker-sprite">
      <img id="walkerImg-${id}" src="" alt="" />
    </div>
    <span class="walker-name" id="walkerName-${id}"></span>
    <div class="walker-shadow"></div>
  `;
  return el;
}

/**
 * Pick a character index that is NOT in activeCharIndices and != excludeIdx
 */
function pickNewCharacter(excludeIdx) {
  const chars = typeof availableCharacters !== 'undefined' ? availableCharacters : [];
  if (chars.length === 0) return null;

  const candidates = [];
  for (let i = 0; i < chars.length; i++) {
    if (!activeCharIndices.includes(i) && i !== excludeIdx) {
      candidates.push(i);
    }
  }
  if (candidates.length === 0) {
    for (let i = 0; i < chars.length; i++) {
      if (i !== excludeIdx) candidates.push(i);
    }
  }
  if (candidates.length === 0) return 0;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Initialize a walker object (state + DOM)
 */
function initWalker(idx, container) {
  const el = createWalkerElement(idx);
  container.appendChild(el);

  const chars = typeof availableCharacters !== 'undefined' ? availableCharacters : [];
  const charIdx = pickNewCharacter(-1);
  if (charIdx !== null) activeCharIndices.push(charIdx);

  const char = chars[charIdx] || { name: 'Canela', file: 'Canela.png' };

  // Random direction: 1 = right, -1 = left
  const dir = Math.random() < 0.5 ? 1 : -1;
  const screenW = window.innerWidth;

  // Spread walkers across the screen initially
  const segment = screenW / WALKER_COUNT;
  let startX;
  if (dir === 1) {
    startX = segment * idx * 0.6 + Math.random() * segment * 0.4;
  } else {
    startX = screenW - segment * idx * 0.6 - Math.random() * segment * 0.4 - 90;
  }
  startX = Math.max(-90, Math.min(screenW + 90, startX));

  const speed = WALKER_SPEED_MIN + Math.random() * (WALKER_SPEED_MAX - WALKER_SPEED_MIN);

  const walker = {
    idx,
    el,
    x: startX,
    dir,
    speed,
    charIdx: charIdx !== null ? charIdx : 0,
    charName: char.name,
    charFile: char.file,
    respawning: false,
  };

  // Set character image
  const img = document.getElementById('walkerImg-' + idx);
  const nameEl = document.getElementById('walkerName-' + idx);
  if (img) {
    img.src = '/img/characters/' + encodeURIComponent(char.file);
    img.alt = char.name;
  }
  if (nameEl) nameEl.textContent = char.name;

  // Flip sprite based on direction
  if (dir === -1) el.classList.add('facing-left');

  el.style.transform = `translateX(${startX}px)`;

  return walker;
}

/**
 * Respawn a walker with a new character after delay
 */
function respawnWalker(walker) {
  walker.respawning = true;
  walker.el.style.visibility = 'hidden';

  // Remove old char from active pool
  const oldIdx = activeCharIndices.indexOf(walker.charIdx);
  if (oldIdx !== -1) activeCharIndices.splice(oldIdx, 1);
  lastExitedCharIdx = walker.charIdx;

  // If this walker was speaking, cancel speech
  const bubble = document.getElementById('walkerBubble-' + walker.idx);
  if (bubble) bubble.classList.remove('visible');
  if (currentSpeaker === walker.idx) {
    walker.el.classList.remove('talking');
    walker.el.classList.add('walking');
    currentSpeaker = null;
    speechBusy = false;
  }

  setTimeout(() => {
    if (!walkerActive) return;

    const newCharIdx = pickNewCharacter(lastExitedCharIdx);
    const chars = typeof availableCharacters !== 'undefined' ? availableCharacters : [];
    const char = chars[newCharIdx] || { name: 'Canela', file: 'Canela.png' };

    walker.charIdx = newCharIdx !== null ? newCharIdx : 0;
    walker.charName = char.name;
    walker.charFile = char.file;
    activeCharIndices.push(walker.charIdx);

    // New random direction
    const dir = Math.random() < 0.5 ? 1 : -1;
    walker.dir = dir;
    const screenW = window.innerWidth;
    walker.x = dir === 1 ? -100 : screenW + 100;
    walker.speed = WALKER_SPEED_MIN + Math.random() * (WALKER_SPEED_MAX - WALKER_SPEED_MIN);

    const img = document.getElementById('walkerImg-' + walker.idx);
    const nameEl = document.getElementById('walkerName-' + walker.idx);
    if (img) {
      img.src = '/img/characters/' + encodeURIComponent(char.file);
      img.alt = char.name;
    }
    if (nameEl) nameEl.textContent = char.name;

    walker.el.classList.remove('facing-left');
    if (dir === -1) walker.el.classList.add('facing-left');

    walker.el.style.transform = `translateX(${walker.x}px)`;
    walker.el.style.visibility = 'visible';
    walker.respawning = false;
  }, RESPAWN_DELAY);
}

/**
 * Main animation loop
 */
function walkerAnimLoop() {
  if (!walkerActive) return;

  const screenW = window.innerWidth;
  const now = Date.now();

  for (const w of walkers) {
    if (w.respawning) continue;

    w.x += w.dir * w.speed;
    w.el.style.transform = `translateX(${w.x}px)`;

    // Off-screen check
    if (w.dir === 1 && w.x > screenW + 110) {
      respawnWalker(w);
    } else if (w.dir === -1 && w.x < -130) {
      respawnWalker(w);
    }
  }

  // Speech scheduling
  if (!speechBusy && (now - lastMsgTime > MSG_GAP)) {
    scheduleNextMessage();
  }

  walkerAnimFrame = requestAnimationFrame(walkerAnimLoop);
}

/**
 * Pick an on-screen walker to speak and show a message
 */
function scheduleNextMessage() {
  const screenW = window.innerWidth;
  const candidates = walkers.filter(w =>
    !w.respawning && w.x > 20 && w.x < screenW - 20
  );
  if (candidates.length === 0) return;

  // Prefer a different walker than last speaker
  let speaker;
  if (candidates.length > 1 && currentSpeaker !== null) {
    const filtered = candidates.filter(w => w.idx !== currentSpeaker);
    speaker = filtered.length > 0
      ? filtered[Math.floor(Math.random() * filtered.length)]
      : candidates[Math.floor(Math.random() * candidates.length)];
  } else {
    speaker = candidates[Math.floor(Math.random() * candidates.length)];
  }

  // Pick a non-recent message
  const msgs = characterMessages.idle.filter(m => m && m.length > 0);
  if (msgs.length === 0) return;

  let msgIdx;
  let attempts = 0;
  do {
    msgIdx = Math.floor(Math.random() * msgs.length);
    attempts++;
  } while (lastUsedMsgIndices.includes(msgIdx) && attempts < 10);

  lastUsedMsgIndices.push(msgIdx);
  if (lastUsedMsgIndices.length > 4) lastUsedMsgIndices.shift();

  const message = msgs[msgIdx];

  // Show message on this walker only
  speechBusy = true;
  currentSpeaker = speaker.idx;

  const bubble = document.getElementById('walkerBubble-' + speaker.idx);
  const text = document.getElementById('walkerText-' + speaker.idx);
  if (bubble && text) {
    text.textContent = message;
    bubble.classList.add('visible');
  }

  speaker.el.classList.remove('walking');
  speaker.el.classList.add('talking');

  // Play voice ONLY for this speaker
  playACVoice(message.length);

  // Duration: 2.5s–4s based on message length
  const duration = Math.min(4000, Math.max(2500, message.length * 45));

  setTimeout(() => {
    if (bubble) bubble.classList.remove('visible');
    speaker.el.classList.remove('talking');
    speaker.el.classList.add('walking');
    currentSpeaker = null;
    speechBusy = false;
    lastMsgTime = Date.now();
  }, duration);
}

/**
 * Start the walker system
 */
function startWalkers() {
  if (walkerActive) return;
  walkerActive = true;

  const layer = document.getElementById('walkersLayer');
  if (!layer) return;

  layer.innerHTML = '';
  walkers = [];
  activeCharIndices = [];
  lastExitedCharIdx = -1;
  speechBusy = false;
  currentSpeaker = null;
  lastMsgTime = Date.now() - MSG_GAP; // allow first message soon

  layer.style.display = 'block';

  for (let i = 0; i < WALKER_COUNT; i++) {
    const w = initWalker(i, layer);
    walkers.push(w);
  }

  walkerAnimFrame = requestAnimationFrame(walkerAnimLoop);
}

/**
 * Stop the walker system
 */
function stopWalkers() {
  walkerActive = false;
  if (walkerAnimFrame) {
    cancelAnimationFrame(walkerAnimFrame);
    walkerAnimFrame = null;
  }

  const layer = document.getElementById('walkersLayer');
  if (layer) {
    layer.style.display = 'none';
    layer.innerHTML = '';
  }

  walkers = [];
  activeCharIndices = [];
  speechBusy = false;
  currentSpeaker = null;
}

/* ==========================================
   CANELA ACTION IMAGES (for rosco correct/wrong)
   ========================================== */

let canelaActionTimeout = null;

function showCanelaAction(type) {
  const actionFile = type === 'correct' ? 'Canela Acierto.webp' : 'Canela Fallo.webp';
  const actionSrc = '/img/actions/' + encodeURIComponent(actionFile);
  const canelaTargets = [
    document.getElementById('roscoCanelaImg'),
    document.getElementById('roscoTabletCanelaBtn'),
    document.querySelector('.rosco-tablet-canela-inline')
  ].filter(Boolean);

  if (canelaActionTimeout) clearTimeout(canelaActionTimeout);

  canelaTargets.forEach((img) => {
    if (!img.dataset.originalSrc) img.dataset.originalSrc = img.src;
    if (img.offsetParent !== null) {
      img.style.opacity = '0';
      setTimeout(() => {
        img.src = actionSrc;
        img.style.opacity = '1';
      }, 150);
    }
  });

  canelaActionTimeout = setTimeout(() => {
    canelaTargets.forEach((img) => {
      const prevSrc = img.dataset.originalSrc || '';
      if (!prevSrc || img.offsetParent === null) return;
      img.style.opacity = '0';
      setTimeout(() => {
        img.src = prevSrc;
        img.style.opacity = '1';
      }, 150);
    });
    canelaActionTimeout = null;
  }, 1200);
}

/* ==========================================
   LEGACY COMPAT — characterSpeak for games
   ========================================== */

function characterSpeak(message) {
  if (walkerActive && walkers.length > 0) {
    const screenW = window.innerWidth;
    const onScreen = walkers.filter(w => !w.respawning && w.x > 20 && w.x < screenW - 20);
    if (onScreen.length > 0 && !speechBusy) {
      speechBusy = true;
      const speaker = onScreen[Math.floor(Math.random() * onScreen.length)];
      currentSpeaker = speaker.idx;
      const bubble = document.getElementById('walkerBubble-' + speaker.idx);
      const text = document.getElementById('walkerText-' + speaker.idx);
      if (bubble && text) {
        text.textContent = message;
        bubble.classList.add('visible');
      }
      speaker.el.classList.remove('walking');
      speaker.el.classList.add('talking');
      playACVoice(message.length);
      const duration = Math.min(4000, Math.max(2500, message.length * 45));
      setTimeout(() => {
        if (bubble) bubble.classList.remove('visible');
        speaker.el.classList.remove('talking');
        speaker.el.classList.add('walking');
        currentSpeaker = null;
        speechBusy = false;
        lastMsgTime = Date.now();
      }, duration);
    }
  }
}

/* ==========================================
   INIT
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
  loadAudioPool();
});
