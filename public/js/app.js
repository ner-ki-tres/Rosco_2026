/* ==========================================
   APP.JS - Motor principal del juego
   Pasapalabra Animal Crossing Edition
   ========================================== */

let gameConfig = null;
let currentGame = null;
let availableImages = [];
let currentBackgroundIndex = -1;
let availableCharacters = [];
let availableUsers = [];
let availableVideos = [];
let selectedUser = null;
let characterRotationTimer = null;
let videoWallpaperActive = false;

/* ---------- CONFIG ---------- */
async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    gameConfig = await res.json();
  } catch (err) {
    console.error('Error cargando configuracion:', err);
    showToast('Error cargando la configuracion del juego', true);
  }
}

async function loadImagesList() {
  try {
    const res = await fetch('/api/images');
    const files = await res.json();
    availableImages = Array.isArray(files) ? files : [];
  } catch (err) {
    availableImages = [];
  }
}

async function loadCharacters() {
  try {
    const res = await fetch('/api/characters');
    availableCharacters = await res.json();
  } catch (err) {
    availableCharacters = [];
  }
}

async function loadUsers() {
  try {
    const res = await fetch('/api/users');
    availableUsers = await res.json();
  } catch (err) {
    availableUsers = [];
  }
}

async function loadVideos() {
  try {
    const res = await fetch('/api/videos');
    availableVideos = await res.json();
  } catch (err) {
    availableVideos = [];
  }
}

function setHomeBackgroundFromConfig() {
  const bgContainer = document.querySelector('.ac-background');
  const videoEl = document.getElementById('acVideoBackground');
  if (!bgContainer) return;

  // Check if video wallpaper is active
  const cfg = gameConfig && gameConfig.background ? gameConfig.background : null;
  if (cfg && cfg.videoWallpaper) {
    activateVideoWallpaper(cfg.videoWallpaper);
    return;
  }

  // Hide video if no video wallpaper
  deactivateVideoWallpaper();

  let filename = '';
  if (cfg) {
    if (cfg.autoRotate) {
      if (availableImages.length > 0) {
        let idx = Math.floor(Math.random() * availableImages.length);
        if (availableImages.length > 1 && idx === currentBackgroundIndex) {
          idx = (idx + 1) % availableImages.length;
        }
        currentBackgroundIndex = idx;
        filename = availableImages[idx];
      }
    } else if (cfg.selected) {
      filename = cfg.selected;
    }
  }

  if (filename) {
    bgContainer.style.backgroundImage = `url('/img/backgrounds/${encodeURIComponent(filename)}')`;
    bgContainer.style.backgroundSize = 'cover';
    bgContainer.style.backgroundPosition = 'center';
    bgContainer.style.backgroundRepeat = 'no-repeat';
  } else {
    bgContainer.style.backgroundImage = '';
    bgContainer.style.background = 'linear-gradient(180deg, #87ceeb 0%, #b8e6f7 50%, #a0d8ef 100%)';
  }
}

/* ==========================================
   VIDEO WALLPAPER
   ========================================== */

function activateVideoWallpaper(filename) {
  const videoEl = document.getElementById('acVideoBackground');
  const bgContainer = document.querySelector('.ac-background');
  if (!videoEl) return;

  videoEl.src = '/video-wallpaper/' + encodeURIComponent(filename);
  videoEl.classList.add('active');
  videoEl.play().catch(() => {});
  videoWallpaperActive = true;

  // Hide static background
  if (bgContainer) {
    bgContainer.style.backgroundImage = '';
    bgContainer.style.background = 'transparent';
  }

  // Disable critters
  stopCritterLoop();
  const layer = document.getElementById('crittersLayer');
  if (layer) layer.innerHTML = '';
}

function deactivateVideoWallpaper() {
  const videoEl = document.getElementById('acVideoBackground');
  if (videoEl) {
    videoEl.classList.remove('active');
    videoEl.pause();
    videoEl.src = '';
  }
  videoWallpaperActive = false;
}

/* Video select modal → Full background config */
function openBgConfig() {
  const modal = document.getElementById('bgConfigModal');
  if (!modal) return;

  const cfg = gameConfig?.background || {};

  // Set auto-rotate checkbox
  const autoCheck = document.getElementById('bgAutoRotate');
  if (autoCheck) autoCheck.checked = !!cfg.autoRotate;

  // Set mute checkbox
  const muteCheck = document.getElementById('charMuteToggle');
  if (muteCheck) muteCheck.checked = (typeof charactersMuted !== 'undefined' && charactersMuted);

  // Populate static images
  const imgList = document.getElementById('bgImagesList');
  if (imgList) {
    imgList.innerHTML = '';
    const currentImg = cfg.selected || '';
    availableImages.forEach(img => {
      const item = document.createElement('div');
      const isActive = !cfg.videoWallpaper && !cfg.autoRotate && currentImg === img;
      item.className = 'video-select-item' + (isActive ? ' active' : '');
      item.innerHTML = '<img src="/img/backgrounds/' + encodeURIComponent(img) + '" alt="' + img + '" onerror="this.style.display=\'none\'" />'
        + '<span class="video-select-label">' + img.replace(/\.[^.]+$/, '') + '</span>';
      item.onclick = () => selectStaticBackground(img);
      imgList.appendChild(item);
    });
  }

  // Populate videos
  const vidList = document.getElementById('bgVideosList');
  if (vidList) {
    vidList.innerHTML = '';
    const currentVideo = cfg.videoWallpaper || '';
    availableVideos.forEach(v => {
      const item = document.createElement('div');
      item.className = 'video-select-item' + (v.file === currentVideo ? ' active' : '');
      const thumbSrc = '/video-wallpaper/' + encodeURIComponent(v.thumb || v.name + '.png');
      item.innerHTML = '<img src="' + thumbSrc + '" alt="' + (v.name || v.file) + '" onerror="this.style.display=\'none\'" />'
        + '<span class="video-select-label">' + (v.name || v.file) + '</span>';
      item.onclick = () => selectVideoWallpaper(v.file);
      vidList.appendChild(item);
    });
  }

  // Show general tab by default
  switchBgTab('general');
  modal.style.display = '';
}

function closeBgConfig() {
  document.getElementById('bgConfigModal').style.display = 'none';
}

function openExternalEditor() {
  closeBgConfig();
  window.location.href = '/editor.html';
}

function switchBgTab(tab) {
  document.querySelectorAll('.bg-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('bgTabGeneral').classList.toggle('active', tab === 'general');
  document.getElementById('bgTabImages').classList.toggle('active', tab === 'images');
  document.getElementById('bgTabVideos').classList.toggle('active', tab === 'videos');
}

function toggleCharacterMute(muted) {
  if (typeof charactersMuted !== 'undefined') {
    charactersMuted = muted;
  }
}

async function resetScores(gameType) {
  const names = { canciones: 'La Pista Musical', palabras: 'Las 9 Palabras', rosco: 'El Rosco Final', millon: 'El precio del cariño', all: 'todos los juegos' };
  if (!confirm('¿Borrar los marcadores de ' + (names[gameType] || gameType) + '?')) return;
  try {
    const url = gameType === 'all' ? '/api/scores' : '/api/scores/' + gameType;
    await fetch(url, { method: 'DELETE' });
    showToast('Marcadores borrados');
  } catch (err) {
    showToast('Error borrando marcadores', true);
  }
}

async function selectStaticBackground(filename) {
  if (!gameConfig.background) gameConfig.background = {};
  gameConfig.background.selected = filename;
  gameConfig.background.autoRotate = false;
  gameConfig.background.videoWallpaper = '';
  await saveConfig();
  deactivateVideoWallpaper();
  setHomeBackgroundFromConfig();
  if (!videoWallpaperActive) startCritterLoop();
  closeBgConfig();
}

async function toggleAutoRotate(enabled) {
  if (!gameConfig.background) gameConfig.background = {};
  gameConfig.background.autoRotate = enabled;
  if (enabled) gameConfig.background.videoWallpaper = '';
  await saveConfig();
  if (enabled) {
    deactivateVideoWallpaper();
    setHomeBackgroundFromConfig();
    if (!videoWallpaperActive) startCritterLoop();
    closeBgConfig();
  }
}

async function clearBackground() {
  if (!gameConfig.background) gameConfig.background = {};
  gameConfig.background.videoWallpaper = '';
  gameConfig.background.selected = '';
  gameConfig.background.autoRotate = false;
  await saveConfig();
  deactivateVideoWallpaper();
  setHomeBackgroundFromConfig();
  if (!videoWallpaperActive) startCritterLoop();
  closeBgConfig();
}

async function selectVideoWallpaper(filename) {
  if (!gameConfig.background) gameConfig.background = {};
  gameConfig.background.videoWallpaper = filename;
  await saveConfig();
  activateVideoWallpaper(filename);
  closeBgConfig();
}

async function clearVideoWallpaper() {
  if (!gameConfig.background) gameConfig.background = {};
  gameConfig.background.videoWallpaper = '';
  await saveConfig();
  deactivateVideoWallpaper();
  setHomeBackgroundFromConfig();
  if (!videoWallpaperActive) startCritterLoop();
  closeBgConfig();
}

async function saveConfig() {
  try {
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gameConfig)
    });
  } catch (err) {
    console.error('Error guardando config:', err);
  }
}

/* ==========================================
   CRITTERS (Animal Crossing bugs)
   ========================================== */

const CRITTER_POOL = [
  '🐛', '🐜', '🐞', '🦗', '🐌', '🦋', '🐝', '🪲', '🐾', '🦎', '🐢'
];

let critterTimer = null;

function spawnCritter() {
  if (videoWallpaperActive) return;
  const layer = document.getElementById('crittersLayer');
  if (!layer) return;
  const emoji = CRITTER_POOL[Math.floor(Math.random() * CRITTER_POOL.length)];
  const el = document.createElement('span');
  el.className = 'critter';
  el.textContent = emoji;

  const isFlying = ['🦋', '🐝'].includes(emoji);
  const goRight = Math.random() > 0.5;
  const yPos = isFlying ? (10 + Math.random() * 40) : (55 + Math.random() * 35);
  el.style.top = yPos + '%';
  const duration = 12 + Math.random() * 18;
  el.style.animationDuration = duration + 's';

  if (isFlying) {
    el.style.animationName = 'critterFly';
    el.style.fontSize = (22 + Math.random() * 12) + 'px';
  } else {
    el.style.animationName = goRight ? 'critterWalkLR' : 'critterWalkRL';
    el.style.fontSize = (20 + Math.random() * 10) + 'px';
  }

  layer.appendChild(el);
  setTimeout(() => el.remove(), (duration + 1) * 1000);
}

function startCritterLoop() {
  if (critterTimer || videoWallpaperActive) return;
  for (let i = 0; i < 3; i++) setTimeout(() => spawnCritter(), i * 800);
  critterTimer = setInterval(() => spawnCritter(), 3500 + Math.random() * 4000);
}

function stopCritterLoop() {
  if (critterTimer) { clearInterval(critterTimer); critterTimer = null; }
}

/* Character rotation & showCanelaAction now handled by characters.js (walker system) */

/* ==========================================
   SCREEN NAVIGATION
   ========================================== */

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById(screenId);
  if (screen) screen.classList.add('active');

  // Walkers visible only on home screen
  if (screenId === 'homeScreen') {
    if (typeof startWalkers === 'function') startWalkers();
  } else {
    if (typeof stopWalkers === 'function') stopWalkers();
  }
}

/** Splash -> Game Select */
function goToGameSelect() {
  showScreen('homeScreen');
  setHomeBackgroundFromConfig();
  if (!videoWallpaperActive) startCritterLoop();
  updateTimeEstimates();
  populateGameCardSelects();
}

/** Back to splash */
function goToSplash() {
  stopActiveGame();
  // Reset enter bar so user can re-enter
  const bar = document.getElementById('enterBar');
  if (bar) bar.classList.remove('gold');
  showScreen('splashScreen');
}

/** Home = Game Select */
function goHome() {
  stopActiveGame();
  currentGame = null;
  showScreen('homeScreen');
  setHomeBackgroundFromConfig();
  updateTimeEstimates();
  populateGameCardSelects();
}

function stopActiveGame() {
  if (currentGame === 'canciones' && typeof stopCancionesGame === 'function') stopCancionesGame();
  if (currentGame === 'palabras' && typeof stopPalabrasGame === 'function') stopPalabrasGame();
  if (currentGame === 'rosco' && typeof stopRoscoGame === 'function') stopRoscoGame();
  if (currentGame === 'millon' && typeof stopMillonGame === 'function') stopMillonGame();
}

/** Populate estimated time badges from config */
function updateTimeEstimates() {
  if (!gameConfig) return;
  const c = gameConfig.canciones;
  const p = gameConfig.palabras;
  const r = gameConfig.rosco;
  if (c) {
    const mins = Math.ceil((c.pistas ? c.pistas.length : 5) * (c.tiempoSegundos || 30) / 60);
    const el = document.getElementById('timeCanciones');
    if (el) el.textContent = '\u23F1\uFE0F ~' + mins + ' min';
  }
  if (p) {
    const el = document.getElementById('timePalabras');
    if (el) el.textContent = '\u23F1\uFE0F ~2 min';
  }
  if (r) {
    const secs = r.tiempoSegundos || 180;
    const el = document.getElementById('timeRosco');
    if (el) el.textContent = '\u23F1\uFE0F ~' + Math.ceil(secs / 60) + ' min';
    const sel = document.getElementById('roscoTimeSelect');
    if (sel) sel.value = secs;
  }
}

/** Populate dataset selects inside game cards */
async function populateGameCardSelects() {
  const types = ['canciones', 'palabras', 'rosco', 'millon'];
  for (const gt of types) {
    const sel = document.getElementById('cardDataset' + capitalize(gt));
    if (!sel) continue;
    try {
      const res = await fetch('/api/datasets/' + gt);
      const datasets = await res.json();
      const activeDs = gameConfig?.[gt]?.activeDataset || 'default';
      sel.innerHTML = '';
      datasets.forEach(ds => {
        const dsId = ds.id || ds;
        const dsName = ds.name || ds.id || ds;
        const opt = document.createElement('option');
        opt.value = dsId;
        opt.textContent = dsName;
        sel.appendChild(opt);
      });
      const ids = datasets.map(ds => ds.id || ds);
      sel.value = ids.includes(activeDs) ? activeDs : (ids[0] || 'default');
    } catch (err) { /* ignore */ }
  }
}

/** When user changes dataset in game card, save config */
async function onCardDatasetChange(gameType) {
  const sel = document.getElementById('cardDataset' + capitalize(gameType));
  if (!sel) return;
  if (!gameConfig[gameType]) gameConfig[gameType] = {};
  gameConfig[gameType].activeDataset = sel.value;
  try {
    await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(gameConfig) });
  } catch (err) { /* ignore */ }
}

/* ==========================================
   USER SELECTION
   ========================================== */

let pendingGameType = null;
let pendingGameCallback = null;

function showUserSelect(gameType, callback) {
  pendingGameType = gameType;
  pendingGameCallback = callback;
  const modal = document.getElementById('userSelectModal');
  const row = document.getElementById('userSelectRow');
  if (!modal || !row) { callback(null); return; }

  row.innerHTML = '';
  if (availableUsers.length === 0) {
    callback(null);
    return;
  }

  availableUsers.forEach(u => {
    const card = document.createElement('div');
    card.className = 'user-select-card';
    card.innerHTML = `
      <img src="/img/users/${encodeURIComponent(u.file)}" alt="${u.name}" />
      <span>${u.name}</span>
    `;
    card.onclick = () => {
      selectedUser = u;
      modal.style.display = 'none';
      callback(u);
    };
    row.appendChild(card);
  });

  modal.style.display = '';
}

/* ==========================================
   DATASET SELECTION
   ========================================== */

async function loadDatasetList(gameType) {
  try {
    const res = await fetch('/api/datasets/' + gameType);
    return await res.json();
  } catch (err) {
    return [];
  }
}

async function loadDataset(gameType, datasetId) {
  try {
    const res = await fetch('/api/datasets/' + gameType + '/' + encodeURIComponent(datasetId));
    return await res.json();
  } catch (err) {
    return null;
  }
}

function showDatasetSelect(gameType, datasets, callback) {
  const modal = document.getElementById('datasetSelectModal');
  const list = document.getElementById('datasetList');
  if (!modal || !list) return;

  const activeDataset = gameConfig?.[gameType]?.activeDataset || 'default';
  list.innerHTML = '';

  datasets.forEach(ds => {
    const dsId = ds.id || ds;
    const dsName = ds.name || dsId;
    const btn = document.createElement('button');
    btn.className = 'dataset-item' + (dsId === activeDataset ? ' active' : '');
    btn.textContent = dsName;
    btn.onclick = () => {
      modal.style.display = 'none';
      callback(dsId);
    };
    list.appendChild(btn);
  });

  modal.style.display = '';
}

function closeDatasetModal() {
  document.getElementById('datasetSelectModal').style.display = 'none';
}

/* ==========================================
   LEADERBOARD
   ========================================== */

let leaderboardCurrentGame = null;

async function openLeaderboard(gameType) {
  leaderboardCurrentGame = gameType;
  const modal = document.getElementById('leaderboardModal');
  const content = document.getElementById('leaderboardContent');
  const title = document.getElementById('leaderboardTitle');
  if (!modal || !content) return;

  const names = { canciones: 'La Pista Musical', palabras: 'Las 9 Palabras', rosco: 'El Rosco Final', millon: 'El precio del cariño' };
  title.textContent = 'Clasificacion - ' + (names[gameType] || gameType);

  content.innerHTML = '<p class="leaderboard-empty">Cargando...</p>';
  modal.style.display = '';

  try {
    const res = await fetch('/api/scores/' + gameType);
    const scores = await res.json();

    if (!scores || scores.length === 0) {
      content.innerHTML = '<p class="leaderboard-empty">Aun no hay puntuaciones</p>';
      return;
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    let html = '<table class="leaderboard-table"><thead><tr><th>#</th><th>Jugador</th><th>Puntos</th><th>Fecha</th></tr></thead><tbody>';
    scores.slice(0, 20).forEach((s, i) => {
      const rankClass = i < 3 ? ' class="rank-' + (i + 1) + '"' : '';
      const userImg = s.userFile ? `<img src="/img/users/${encodeURIComponent(s.userFile)}" class="leaderboard-user-img" />` : '';
      const date = s.date ? new Date(s.date).toLocaleDateString('es-ES') : '';
      html += `<tr${rankClass}><td>${i + 1}</td><td>${userImg}${s.userName || 'Anonimo'}</td><td>${s.score}</td><td>${date}</td></tr>`;
    });
    html += '</tbody></table>';
    content.innerHTML = html;
  } catch (err) {
    content.innerHTML = '<p class="leaderboard-empty">Error cargando puntuaciones</p>';
  }
}

function closeLeaderboard() {
  document.getElementById('leaderboardModal').style.display = 'none';
}

async function resetLeaderboardScores() {
  if (!leaderboardCurrentGame) return;
  const names = { canciones: 'La Pista Musical', palabras: 'Las 9 Palabras', rosco: 'El Rosco Final', millon: 'El precio del cariño' };
  if (!confirm('¿Borrar los marcadores de ' + (names[leaderboardCurrentGame] || leaderboardCurrentGame) + '?')) return;
  try {
    await fetch('/api/scores/' + leaderboardCurrentGame, { method: 'DELETE' });
    showToast('Marcadores borrados');
    closeLeaderboard();
  } catch (err) {
    showToast('Error borrando marcadores', true);
  }
}

/* ==========================================
   SCORE SAVING
   ========================================== */

async function saveScore(gameType, score, maxScore, details) {
  if (!selectedUser) return;
  try {
    await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameType,
        userName: selectedUser.name,
        userFile: selectedUser.file,
        score,
        maxScore,
        details: details || '',
        date: new Date().toISOString()
      })
    });
  } catch (err) {
    console.error('Error guardando puntuacion:', err);
  }
}

/* ==========================================
   START GAME FLOW (user -> dataset -> play)
   ========================================== */

async function startGame(gameType) {
  if (!gameConfig) await loadConfig();
  if (!gameConfig) { showToast('No se pudo cargar la configuracion', true); return; }

  const sel = document.getElementById('cardDataset' + capitalize(gameType));
  const dsId = sel ? sel.value : (gameConfig?.[gameType]?.activeDataset || 'default');

  showUserSelect(gameType, async (user) => {
    await launchGame(gameType, dsId);
  });
}

async function launchGame(gameType, datasetId) {
  // Load dataset data
  const dsData = await loadDataset(gameType, datasetId);
  let cfg;
  if (dsData) {
    cfg = { ...gameConfig[gameType], ...dsData };
  } else {
    cfg = gameConfig[gameType];
  }

  currentGame = gameType;

  switch (gameType) {
    case 'canciones':
      showScreen('cancionesScreen');
      initCancionesGame(cfg);
      characterSpeak('Hora de adivinar canciones. Escucha con atencion...');
      break;
    case 'palabras':
      showScreen('palabrasScreen');
      initPalabrasGame(cfg);
      characterSpeak('Memoriza bien las palabras. Concentrate...');
      break;
    case 'rosco':
      showScreen('roscoScreen');
      initRoscoGame(cfg);
      characterSpeak('El Rosco Final. Letra por letra, tu puedes...');
      break;
    case 'millon':
      showScreen('millonScreen');
      initMillonGame(cfg);
      characterSpeak('El precio del cariño. Reparte bien tus fajos...');
      break;
  }
}

/** Start rosco with user-chosen time */
async function startRoscoWithTime() {
  if (!gameConfig) await loadConfig();
  if (!gameConfig) { showToast('No se pudo cargar la configuracion', true); return; }

  const timeSel = document.getElementById('roscoTimeSelect');
  const secs = timeSel ? parseInt(timeSel.value, 10) : 180;

  const dsSel = document.getElementById('cardDatasetRosco');
  const dsId = dsSel ? dsSel.value : (gameConfig?.rosco?.activeDataset || 'default');

  showUserSelect('rosco', async (user) => {
    const dsData = await loadDataset('rosco', dsId);
    const cfg = dsData ? { ...gameConfig.rosco, ...dsData, tiempoSegundos: secs } : { ...gameConfig.rosco, tiempoSegundos: secs };
    currentGame = 'rosco';
    showScreen('roscoScreen');
    initRoscoGame(cfg);
  });
}

// Reintentar el juego actual
function retryGame() {
  if (currentGame) {
    startGame(currentGame);
  }
}

// Mostrar pantalla de resultados
function showResults(score, maxScore, details, gameType, options = {}) {
  showScreen('resultsScreen');

  const percentage = Math.round((score / maxScore) * 100);
  let stars = '';
  let message = '';

  if (percentage >= 90) {
    stars = '***';
    message = 'INCREIBLE! Eres un autentico campeon!';
  } else if (percentage >= 70) {
    stars = '**';
    message = 'Muy bien! Casi perfecto!';
  } else if (percentage >= 50) {
    stars = '*';
    message = 'Buen intento! Sigue practicando!';
  } else {
    stars = '';
    message = 'No te rindas! La proxima vez sera mejor.';
  }

  document.getElementById('resultsFinalScore').textContent = score;
  document.getElementById('resultsDetails').innerHTML = details;

  const starsEl = document.getElementById('resultsStars');
  const resultsContainerEl = document.querySelector('.results-container');
  if (options && options.summaryImage) {
    if (resultsContainerEl) resultsContainerEl.classList.add('results-with-approval');
    starsEl.innerHTML = `<img src="${options.summaryImage}" alt="Resumen rosco" class="results-approval-img" />`;
  } else {
    if (resultsContainerEl) resultsContainerEl.classList.remove('results-with-approval');
    starsEl.textContent = stars;
  }

  document.getElementById('resultsMessage').textContent = message;

  const titles = {
    canciones: 'Pista Musical completada!',
    palabras: 'Las 9 Palabras completadas!',
    rosco: 'Rosco completado!',
    millon: 'El precio del cariño completado!'
  };
  document.getElementById('resultsTitle').textContent = titles[gameType] || 'Resultados';

  if (percentage >= 70) {
    launchConfetti();
  }

  if (!options || !options.skipCharacterSpeak) {
    characterSpeak(message);
  }

  // Save score
  saveScore(gameType, score, maxScore, details);
}

// Efectos visuales
function launchConfetti() {
  const colors = ['#f5d76e', '#7ecb7e', '#87ceeb', '#f5a0c0', '#f0a050', '#e74c3c'];
  for (let i = 0; i < 40; i++) {
    setTimeout(() => {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-piece';
      confetti.style.left = Math.random() * 100 + 'vw';
      confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
      confetti.style.animationDelay = Math.random() * 0.5 + 's';
      document.body.appendChild(confetti);
      setTimeout(() => confetti.remove(), 4000);
    }, i * 50);
  }
}

function showToast(message, isError = false) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast' + (isError ? ' error' : '');
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 50);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// SFX helpers
function playSFX(id) {
  const audio = document.getElementById(id);
  if (audio && audio.src) {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }
}

/* ==========================================
   IN-APP GAME EDITORS
   ========================================== */

let editorDatasets = { canciones: null, palabras: null, rosco: null, millon: null };
let editorDatasetId = { canciones: 'default', palabras: 'default', rosco: 'default', millon: 'default' };
const MAX_CANCIONES_POR_DATASET = 3;

const editorScreenIds = {
  canciones: 'editorCancionesScreen',
  palabras: 'editorPalabrasScreen',
  rosco: 'editorRoscoScreen',
  millon: 'editorMillonScreen'
};

async function openGameEditor(gameType) {
  const screenId = editorScreenIds[gameType];
  if (!screenId) return;
  showScreen(screenId);

  if (gameType === 'rosco') {
    await edRenderRoscoGallery();
    return;
  }

  // Load dataset list
  try {
    const res = await fetch('/api/datasets/' + gameType);
    const datasets = await res.json();
    const select = document.getElementById('edDataset' + capitalize(gameType));
    if (select) {
      select.innerHTML = '';
      datasets.forEach(ds => {
        const opt = document.createElement('option');
        opt.value = ds.id || ds;
        opt.textContent = ds.name || ds.id || ds;
        select.appendChild(opt);
      });
      const activeDs = gameConfig?.[gameType]?.activeDataset || 'default';
      const ids = datasets.map(ds => ds.id || ds);
      if (ids.includes(activeDs)) {
        select.value = activeDs;
        editorDatasetId[gameType] = activeDs;
      } else if (ids.length > 0) {
        editorDatasetId[gameType] = ids[0];
      }
    }
    await edLoadDataset(gameType);
  } catch (err) {
    showToast('Error cargando datasets', true);
  }
}

function closeGameEditor() {
  goHome();
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function edLoadDataset(gameType) {
  const select = document.getElementById('edDataset' + capitalize(gameType));
  if (!select) return;
  const dsId = select.value;
  editorDatasetId[gameType] = dsId;

  try {
    const res = await fetch('/api/datasets/' + gameType + '/' + encodeURIComponent(dsId));
    const data = await res.json();
    editorDatasets[gameType] = data;
    edPopulateEditor(gameType, data);
  } catch (err) {
    showToast('Error cargando dataset ' + dsId, true);
  }
}

async function edNewDataset(gameType) {
  const name = prompt('Nombre del nuevo dataset:');
  if (!name || !name.trim()) return;
  const dsId = name.trim().replace(/[^a-zA-Z0-9_-]/g, '_');

  let defaultData;
  if (gameType === 'canciones') {
    defaultData = { tiempoSegundos: 30, pistas: [] };
  } else if (gameType === 'palabras') {
    defaultData = { tiempoMemorizarSegundos: 30, tiempoResponderSegundos: 60, conjuntos: [{ id: 1, nombre: 'Conjunto 1', palabras: ['PALABRA1','PALABRA2','PALABRA3','PALABRA4','PALABRA5','PALABRA6','PALABRA7','PALABRA8','PALABRA9'] }] };
  } else if (gameType === 'millon') {
    defaultData = { preguntas: [] };
  } else {
    defaultData = { tiempoSegundos: 180, maxFallos: 3, preguntas: ROSCO_LETTERS.map(l => ({ letra: l, tipo: 'empieza', definicion: '', respuesta: '' })) };
  }

  try {
    await fetch('/api/datasets/' + gameType + '/' + encodeURIComponent(dsId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(defaultData)
    });
    showToast('Dataset "' + dsId + '" creado');
    if (gameType === 'rosco') {
      await edRenderRoscoGallery();
      await edOpenRoscoDataset(dsId);
    } else {
      await openGameEditor(gameType);
      const select = document.getElementById('edDataset' + capitalize(gameType));
      if (select) { select.value = dsId; await edLoadDataset(gameType); }
    }
  } catch (err) {
    showToast('Error creando dataset', true);
  }
}

async function edDeleteDataset(gameType) {
  const dsId = editorDatasetId[gameType];
  if (dsId === 'default') {
    showToast('No se puede eliminar el dataset por defecto', true);
    return;
  }
  if (!confirm('Eliminar dataset "' + dsId + '"?')) return;

  try {
    await fetch('/api/datasets/' + gameType + '/' + encodeURIComponent(dsId), { method: 'DELETE' });
    showToast('Dataset eliminado');
    if (gameType === 'rosco') {
      closeRoscoEditModal();
      await edRenderRoscoGallery();
    } else {
      await openGameEditor(gameType);
    }
  } catch (err) {
    showToast('Error eliminando dataset', true);
  }
}

async function edSaveDataset(gameType) {
  const dsId = editorDatasetId[gameType];
  let data;

  if (gameType === 'canciones') {
    edCollectCanciones();
    if ((editorDatasets.canciones.pistas || []).length > MAX_CANCIONES_POR_DATASET) {
      showToast('Solo se permiten 3 canciones por dataset', true);
      return;
    }
    data = { tiempoSegundos: editorDatasets.canciones.tiempoSegundos, pistas: editorDatasets.canciones.pistas };
  } else if (gameType === 'palabras') {
    edCollectPalabras();
    data = { tiempoMemorizarSegundos: editorDatasets.palabras.tiempoMemorizarSegundos, tiempoResponderSegundos: editorDatasets.palabras.tiempoResponderSegundos, conjuntos: editorDatasets.palabras.conjuntos };
  } else if (gameType === 'millon') {
    edCollectMillon();
    if (!Array.isArray(editorDatasets.millon.preguntas) || editorDatasets.millon.preguntas.length !== 8) {
      showToast('El precio del cariño requiere exactamente 8 preguntas', true);
      return;
    }

    const invalidRound = editorDatasets.millon.preguntas.findIndex((q, i) => {
      const round = i + 1;
      const expectedOptions = round <= 4 ? 4 : (round <= 7 ? 3 : 2);
      const optionsValid = Array.isArray(q.opciones) && q.opciones.length === expectedOptions;
      const correctValid = Number.isInteger(q.correctaIndex) && q.correctaIndex >= 0 && q.correctaIndex < expectedOptions;
      return !optionsValid || !correctValid;
    });

    if (invalidRound >= 0) {
      showToast('Revisa la estructura de la pregunta ' + (invalidRound + 1), true);
      return;
    }

    data = { preguntas: editorDatasets.millon.preguntas };
  } else {
    edCollectRosco();
    data = { tiempoSegundos: editorDatasets.rosco.tiempoSegundos, maxFallos: editorDatasets.rosco.maxFallos, preguntas: editorDatasets.rosco.preguntas };
  }

  try {
    await fetch('/api/datasets/' + gameType + '/' + encodeURIComponent(dsId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!gameConfig[gameType]) gameConfig[gameType] = {};
    if (gameType === 'canciones') gameConfig.canciones.tiempoSegundos = data.tiempoSegundos;
    if (gameType === 'palabras') { gameConfig.palabras.tiempoMemorizarSegundos = data.tiempoMemorizarSegundos; gameConfig.palabras.tiempoResponderSegundos = data.tiempoResponderSegundos; }
    if (gameType === 'rosco') { gameConfig.rosco.tiempoSegundos = data.tiempoSegundos; gameConfig.rosco.maxFallos = data.maxFallos; }

    await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(gameConfig) });
    showToast('Dataset "' + dsId + '" guardado');
    if (gameType === 'rosco') {
      closeRoscoEditModal();
      await edRenderRoscoGallery();
    }
  } catch (err) {
    showToast('Error guardando dataset', true);
  }
}

function edPopulateEditor(gameType, data) {
  if (gameType === 'canciones') {
    editorDatasets.canciones = data;
    document.getElementById('edCancionesTiempo').value = data.tiempoSegundos || 30;
    edRenderCanciones();
  } else if (gameType === 'palabras') {
    editorDatasets.palabras = data;
    document.getElementById('edPalabrasTiempoMem').value = data.tiempoMemorizarSegundos || 30;
    document.getElementById('edPalabrasTiempoRes').value = data.tiempoResponderSegundos || 60;
    edRenderPalabras();
  } else if (gameType === 'millon') {
    editorDatasets.millon = data;
    edRenderMillon();
  } else if (gameType === 'rosco') {
    edEnsureAllLetters(data);
    editorDatasets.rosco = data;
    document.getElementById('edRoscoTiempo').value = data.tiempoSegundos || 180;
    document.getElementById('edRoscoMaxFallos').value = data.maxFallos || 3;
    edRenderRosco();
  }
}

/* --- Canciones Editor --- */

function edRenderCanciones() {
  const ds = editorDatasets.canciones;
  if (!ds || !ds.pistas) return;
  const container = document.getElementById('edCancionesList');
  container.innerHTML = ds.pistas.map((pista, i) => `
    <div class="editor-item-card">
      <span class="editor-item-number">Pista ${i + 1}</span>
      <div class="editor-form-group">
        <label>Pista / Descripción</label>
        <textarea id="edCanPista-${i}" rows="2">${escHtml(pista.pista || '')}</textarea>
      </div>
      <div class="editor-form-row">
        <div class="editor-form-group">
          <label>Respuesta Correcta</label>
          <input type="text" id="edCanResp-${i}" value="${escHtml(pista.respuesta || '')}">
        </div>
        <div class="editor-form-group">
          <label>Artista (opcional)</label>
          <input type="text" id="edCanArtista-${i}" value="${escHtml(pista.artista || '')}">
        </div>
      </div>
      <div class="editor-form-group">
        <label>URL de Audio (opcional)</label>
        <input type="text" id="edCanAudio-${i}" value="${escHtml(pista.audioUrl || '')}" placeholder="https://...">
      </div>
      <div class="editor-form-group">
        <label>Opciones de respuesta</label>
        <div class="editor-options-list" id="edCanOps-${i}">
          ${(pista.opciones || []).map((op, j) => `
            <div class="editor-option-row">
              <input type="text" id="edCanOp-${i}-${j}" value="${escHtml(op)}">
              <button class="editor-btn editor-btn-danger editor-btn-sm" onclick="edRemoveCancionOption(${i}, ${j})">✕</button>
            </div>
          `).join('')}
        </div>
        <button class="editor-btn editor-btn-secondary editor-btn-sm" onclick="edAddCancionOption(${i})">+ Opción</button>
      </div>
      <div class="editor-item-actions">
        <button class="editor-btn editor-btn-danger editor-btn-sm" onclick="edRemoveCancion(${i})">Eliminar Pista</button>
      </div>
    </div>
  `).join('');
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function edAddCancion() {
  edCollectCanciones();
  if (editorDatasets.canciones.pistas.length >= MAX_CANCIONES_POR_DATASET) {
    showToast('Este dataset ya tiene 3 canciones', true);
    return;
  }
  editorDatasets.canciones.pistas.push({
    id: editorDatasets.canciones.pistas.length + 1, audioUrl: '', pista: 'Nueva pista...',
    respuesta: 'Respuesta', artista: '', opciones: ['Respuesta', 'Opcion B', 'Opcion C', 'Opcion D']
  });
  edRenderCanciones();
}

function edRemoveCancion(index) {
  edCollectCanciones();
  editorDatasets.canciones.pistas.splice(index, 1);
  edRenderCanciones();
}

function edAddCancionOption(pistaIndex) {
  edCollectCanciones();
  editorDatasets.canciones.pistas[pistaIndex].opciones.push('Nueva opcion');
  edRenderCanciones();
}

function edRemoveCancionOption(pistaIndex, optIndex) {
  edCollectCanciones();
  editorDatasets.canciones.pistas[pistaIndex].opciones.splice(optIndex, 1);
  edRenderCanciones();
}

function edCollectCanciones() {
  const ds = editorDatasets.canciones;
  if (!ds) return;
  ds.tiempoSegundos = parseInt(document.getElementById('edCancionesTiempo').value) || 30;
  ds.pistas.forEach((pista, i) => {
    const pistaEl = document.getElementById('edCanPista-' + i);
    if (pistaEl) {
      pista.pista = pistaEl.value;
      pista.respuesta = document.getElementById('edCanResp-' + i).value;
      pista.artista = document.getElementById('edCanArtista-' + i).value;
      pista.audioUrl = document.getElementById('edCanAudio-' + i).value;
      const opciones = [];
      let j = 0;
      while (document.getElementById('edCanOp-' + i + '-' + j)) {
        opciones.push(document.getElementById('edCanOp-' + i + '-' + j).value);
        j++;
      }
      pista.opciones = opciones;
    }
  });
}

/* --- Palabras Editor --- */

function edRenderPalabras() {
  const ds = editorDatasets.palabras;
  if (!ds || !ds.conjuntos) return;
  const container = document.getElementById('edPalabrasList');
  container.innerHTML = ds.conjuntos.map((set, i) => `
    <div class="editor-item-card">
      <span class="editor-item-number">${escHtml(set.nombre || 'Conjunto ' + (i + 1))}</span>
      <div class="editor-form-group">
        <label>Nombre del conjunto</label>
        <input type="text" id="edPalNombre-${i}" value="${escHtml(set.nombre || '')}">
      </div>
      <div class="editor-form-group">
        <label>9 Palabras (en orden)</label>
        <div class="editor-words-grid">
          ${set.palabras.map((word, j) => `
            <div class="editor-word-wrap">
              <span class="editor-word-num">${j + 1}</span>
              <input type="text" id="edPal-${i}-${j}" value="${escHtml(word)}">
            </div>
          `).join('')}
        </div>
      </div>
      <div class="editor-item-actions">
        <button class="editor-btn editor-btn-danger editor-btn-sm" onclick="edRemoveConjunto(${i})">Eliminar Conjunto</button>
      </div>
    </div>
  `).join('');
}

function edAddConjunto() {
  edCollectPalabras();
  editorDatasets.palabras.conjuntos.push({
    id: editorDatasets.palabras.conjuntos.length + 1, nombre: 'Nuevo Conjunto',
    palabras: ['PALABRA1','PALABRA2','PALABRA3','PALABRA4','PALABRA5','PALABRA6','PALABRA7','PALABRA8','PALABRA9']
  });
  edRenderPalabras();
}

function edRemoveConjunto(index) {
  edCollectPalabras();
  editorDatasets.palabras.conjuntos.splice(index, 1);
  edRenderPalabras();
}

function edCollectPalabras() {
  const ds = editorDatasets.palabras;
  if (!ds) return;
  ds.tiempoMemorizarSegundos = parseInt(document.getElementById('edPalabrasTiempoMem').value) || 30;
  ds.tiempoResponderSegundos = parseInt(document.getElementById('edPalabrasTiempoRes').value) || 60;
  ds.conjuntos.forEach((set, i) => {
    const nameEl = document.getElementById('edPalNombre-' + i);
    if (nameEl) {
      set.nombre = nameEl.value;
      for (let j = 0; j < 9; j++) {
        const wordEl = document.getElementById('edPal-' + i + '-' + j);
        if (wordEl) set.palabras[j] = wordEl.value;
      }
    }
  });
}

/* --- Millon Editor --- */

function edRenderMillon() {
  const ds = editorDatasets.millon;
  if (!ds) return;
  if (!Array.isArray(ds.preguntas)) ds.preguntas = [];
  const container = document.getElementById('edMillonList');
  if (!container) return;

  container.innerHTML = ds.preguntas.map((q, i) => {
    const round = i + 1;
    const expectedOptions = round <= 4 ? 4 : (round <= 7 ? 3 : 2);
    return `
      <div class="editor-item-card">
        <span class="editor-item-number">Pregunta ${round}</span>
        <div class="editor-form-group">
          <label>Enunciado</label>
          <textarea id="edMilPregunta-${i}" rows="2">${escHtml(q.pregunta || '')}</textarea>
        </div>
        <div class="editor-form-group">
          <label>Opciones (esta ronda usa ${expectedOptions})</label>
          ${(q.opciones || []).map((op, j) => `
            <input type="text" id="edMilOp-${i}-${j}" value="${escHtml(op || '')}" style="margin-bottom:6px" />
          `).join('')}
        </div>
        <div class="editor-form-row">
          <div class="editor-form-group">
            <label>Indice correcto (0 a ${Math.max(0, expectedOptions - 1)})</label>
            <input type="number" id="edMilCorrecta-${i}" min="0" max="${Math.max(0, expectedOptions - 1)}" value="${Number.isFinite(parseInt(q.correctaIndex, 10)) ? parseInt(q.correctaIndex, 10) : 0}">
          </div>
          <div class="editor-form-group">
            <label>Tiempo (seg)</label>
            <input type="number" id="edMilTiempo-${i}" min="10" max="90" value="${parseInt(q.tiempoSegundos, 10) || (round === 8 ? 30 : (round <= 4 ? 45 : 40))}">
          </div>
        </div>
        <div class="editor-item-actions">
          <button class="editor-btn editor-btn-danger editor-btn-sm" onclick="edRemoveMillonQuestion(${i})">Eliminar</button>
        </div>
      </div>
    `;
  }).join('');

  const counter = document.getElementById('edMillonCounter');
  if (counter) counter.textContent = `Preguntas: ${ds.preguntas.length} / 8`;
}

function edAddMillonQuestion() {
  edCollectMillon();
  const ds = editorDatasets.millon;
  if (!ds) return;
  if (ds.preguntas.length >= 8) {
    showToast('El precio del cariño requiere 8 preguntas', true);
    return;
  }
  const round = ds.preguntas.length + 1;
  const expectedOptions = round <= 4 ? 4 : (round <= 7 ? 3 : 2);
  ds.preguntas.push({
    id: round,
    pregunta: 'Nueva pregunta',
    opciones: Array.from({ length: expectedOptions }, (_, i) => 'Opcion ' + (i + 1)),
    correctaIndex: 0,
    tiempoSegundos: round === 8 ? 30 : (round <= 4 ? 45 : 40)
  });
  edRenderMillon();
}

function edRemoveMillonQuestion(index) {
  edCollectMillon();
  const ds = editorDatasets.millon;
  if (!ds) return;
  ds.preguntas.splice(index, 1);
  edRenderMillon();
}

function edCollectMillon() {
  const ds = editorDatasets.millon;
  if (!ds || !Array.isArray(ds.preguntas)) return;

  ds.preguntas = ds.preguntas.map((q, i) => {
    const round = i + 1;
    const expectedOptions = round <= 4 ? 4 : (round <= 7 ? 3 : 2);
    const preguntaEl = document.getElementById('edMilPregunta-' + i);
    const correctEl = document.getElementById('edMilCorrecta-' + i);
    const timeEl = document.getElementById('edMilTiempo-' + i);

    const opciones = [];
    for (let j = 0; j < expectedOptions; j++) {
      const opEl = document.getElementById('edMilOp-' + i + '-' + j);
      opciones.push(opEl ? opEl.value : ('Opcion ' + (j + 1)));
    }

    return {
      id: i + 1,
      pregunta: preguntaEl ? preguntaEl.value : (q.pregunta || ''),
      opciones,
      correctaIndex: Math.max(0, Math.min(expectedOptions - 1, parseInt(correctEl?.value, 10) || 0)),
      tiempoSegundos: Math.max(10, parseInt(timeEl?.value, 10) || (round === 8 ? 30 : (round <= 4 ? 45 : 40)))
    };
  });
}

/* --- Rosco Editor --- */

const ROSCO_LETTERS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','Ñ','O','P','Q','R','S','T','U','V','W','X','Y','Z'];

function edEnsureAllLetters(data) {
  if (!data.preguntas) data.preguntas = [];
  const existing = new Map(data.preguntas.map(q => [q.letra, q]));
  data.preguntas = ROSCO_LETTERS.map(letra => existing.get(letra) || { letra, tipo: 'empieza', definicion: '', respuesta: '' });
}

function edRenderRosco() {
  const ds = editorDatasets.rosco;
  if (!ds || !ds.preguntas) return;
  const container = document.getElementById('edRoscoList');
  container.innerHTML = ds.preguntas.map((q, i) => `
    <div class="editor-item-card">
      <span class="editor-item-number">${escHtml(q.letra)}</span>
      <div class="editor-form-row editor-form-row-3">
        <div class="editor-form-group">
          <label>Letra</label>
          <input type="text" id="edRosLetra-${i}" value="${escHtml(q.letra)}" maxlength="2" class="editor-input-center" readonly>
        </div>
        <div class="editor-form-group">
          <label>Tipo</label>
          <select id="edRosTipo-${i}">
            <option value="empieza" ${q.tipo === 'empieza' ? 'selected' : ''}>Empieza por...</option>
            <option value="contiene" ${q.tipo === 'contiene' ? 'selected' : ''}>Contiene la...</option>
          </select>
        </div>
        <div class="editor-form-group">
          <label>Respuesta</label>
          <input type="text" id="edRosResp-${i}" value="${escHtml(q.respuesta)}" class="editor-input-bold">
        </div>
      </div>
      <div class="editor-form-group">
        <label>Definición</label>
        <textarea id="edRosDef-${i}" rows="2">${escHtml(q.definicion)}</textarea>
      </div>
    </div>
  `).join('');
}

function edCollectRosco() {
  const ds = editorDatasets.rosco;
  if (!ds) return;
  ds.tiempoSegundos = parseInt(document.getElementById('edRoscoTiempo').value) || 180;
  ds.maxFallos = parseInt(document.getElementById('edRoscoMaxFallos').value) || 3;
  ds.preguntas.forEach((q, i) => {
    const tipoEl = document.getElementById('edRosTipo-' + i);
    if (tipoEl) {
      q.tipo = tipoEl.value;
      q.respuesta = document.getElementById('edRosResp-' + i).value;
      q.definicion = document.getElementById('edRosDef-' + i).value;
    }
  });
}

/* --- Rosco Gallery + Modal --- */

async function edRenderRoscoGallery() {
  const gallery = document.getElementById('roscoDatasetGallery');
  if (!gallery) return;
  gallery.innerHTML = '<p style="color:#fff;text-align:center">Cargando...</p>';

  try {
    const res = await fetch('/api/datasets/rosco');
    const datasets = await res.json();
    const activeDs = gameConfig?.rosco?.activeDataset || 'default';

    gallery.innerHTML = datasets.map(ds => {
      const dsId = ds.id || ds;
      const dsName = ds.name || ds.id || ds;
      const isActive = dsId === activeDs;
      return `<div class="rosco-gallery-card${isActive ? ' active' : ''}" onclick="edOpenRoscoDataset('${escHtml(dsId)}')">
        <div class="rosco-gallery-icon">📖</div>
        <div class="rosco-gallery-name">${escHtml(dsName)}</div>
        ${isActive ? '<span class="rosco-gallery-badge">Activo</span>' : ''}
      </div>`;
    }).join('');
  } catch (err) {
    gallery.innerHTML = '<p style="color:#fff;text-align:center">Error cargando datasets</p>';
  }
}

async function edOpenRoscoDataset(dsId) {
  editorDatasetId.rosco = dsId;
  try {
    const res = await fetch('/api/datasets/rosco/' + encodeURIComponent(dsId));
    const data = await res.json();
    edEnsureAllLetters(data);
    editorDatasets.rosco = data;
    document.getElementById('edRoscoTiempo').value = data.tiempoSegundos || 180;
    document.getElementById('edRoscoMaxFallos').value = data.maxFallos || 3;
    document.getElementById('roscoEditModalTitle').textContent = 'Editar: ' + dsId;
    edRenderRosco();
    document.getElementById('roscoEditModal').style.display = '';
  } catch (err) {
    showToast('Error cargando dataset', true);
  }
}

function closeRoscoEditModal() {
  document.getElementById('roscoEditModal').style.display = 'none';
}

// Inicializacion
document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  await Promise.all([loadImagesList(), loadCharacters(), loadUsers(), loadVideos()]);
  setHomeBackgroundFromConfig();
  if (!videoWallpaperActive) startCritterLoop();
  populateGameCardSelects();
  showScreen('splashScreen');

  // Splash enter transition logic (shared by key + click)
  function triggerSplashEnter() {
    const splash = document.getElementById('splashScreen');
    if (!splash || !splash.classList.contains('active')) return;
    const bar = document.getElementById('enterBar');
    if (!bar || bar.classList.contains('gold')) return; // already triggered
    bar.classList.add('gold');
    setTimeout(() => {
      splash.style.transition = 'opacity 0.6s ease';
      splash.style.opacity = '0';
      setTimeout(() => {
        splash.style.opacity = '';
        splash.style.transition = '';
        goToGameSelect();
      }, 600);
    }, 1500);
  }

  // Enter key on splash
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    triggerSplashEnter();
  });

  // Click on bar
  const enterBarEl = document.getElementById('enterBar');
  if (enterBarEl) enterBarEl.addEventListener('click', triggerSplashEnter);
});
