/* ==========================================
   CANCIONES.JS - Juego de pista musical
   ========================================== */

let cancionesState = {
  pistas: [],
  currentIndex: 0,
  score: 0,
  answered: [],
  scores: [],
  timer: null,
  timeLeft: 0,
  pistaActual: 0
};

function initCancionesGame(config) {
  const normalizadas = normalizeCancionesDataset(config?.pistas || []);

  cancionesState = {
    pistas: normalizadas,
    currentIndex: 0,
    score: 0,
    answered: new Array(normalizadas.length).fill(null),
    scores: new Array(normalizadas.length).fill(0),
    timer: null,
    timeLeft: config?.tiempoSegundos || 30,
    pistaActual: 0
  };

  const scoreEl = document.getElementById('cancionesScore');
  if (scoreEl) scoreEl.textContent = '0';

  renderCancionesQuestion();
}

function stopCancionesGame() {
  if (cancionesState.timer) {
    clearInterval(cancionesState.timer);
    cancionesState.timer = null;
  }
  stopAllAudios();
}

function normalizeCancionesDataset(pistas) {
  return (Array.isArray(pistas) ? pistas : []).map((p, idx) => {
    if (Array.isArray(p.pistasProgresivas) && p.pistasProgresivas.length > 0) {
      return {
        ...p,
        pistasProgresivas: p.pistasProgresivas.map((pp, i) => ({
          numero: pp.numero || (i + 1),
          tipo: pp.tipo || (pp.audioUrl ? 'audio' : 'texto'),
          descripcion: pp.descripcion || '',
          audioUrl: pp.audioUrl || '',
          puntuacion: typeof pp.puntuacion === 'number' ? pp.puntuacion : Math.max(1, 5 - i)
        }))
      };
    }

    // Compatibilidad con datasets antiguos
    const legacy = [];
    if (p.audioUrl) {
      legacy.push({
        numero: 1,
        tipo: 'audio',
        descripcion: 'Escucha esta pista',
        audioUrl: p.audioUrl,
        puntuacion: 5
      });
    }

    legacy.push({
      numero: legacy.length + 1,
      tipo: 'texto',
      descripcion: p.pista || 'Adivina la canción',
      puntuacion: legacy.length === 0 ? 5 : 4
    });

    if (p.artista) {
      legacy.push({
        numero: legacy.length + 1,
        tipo: 'texto',
        descripcion: 'Artista: ' + p.artista,
        puntuacion: 3
      });
    }

    return {
      ...p,
      id: p.id || (idx + 1),
      pistasProgresivas: legacy
    };
  });
}

function renderCancionesQuestion() {
  const container = document.getElementById('cancionesContent');
  const cancion = cancionesState.pistas[cancionesState.currentIndex];

  if (!container) return;

  if (!cancion) {
    finishCanciones();
    return;
  }

  if (cancionesState.pistaActual === 0) cancionesState.pistaActual = 1;

  const pista = cancion.pistasProgresivas[cancionesState.pistaActual - 1];
  const pistaNum = cancionesState.pistaActual;
  const totalPistas = cancion.pistasProgresivas.length;

  if (!pista) {
    finishCanciones();
    return;
  }

  const pistaHtml = pista.tipo === 'audio'
    ? `
      <div style="text-align:center;">
        <p style="margin-bottom:10px;font-weight:700;">Escucha el fragmento:</p>
        <audio id="audioPlayer" autoplay controls style="width:100%;max-width:420px;">
          <source src="${escapeHtml(pista.audioUrl || '')}" type="audio/mpeg">
        </audio>
      </div>
    `
    : `
      <div style="text-align:center;">
        <p style="font-size:1.05rem;font-weight:700;background:#fff;border-radius:10px;padding:12px;border:2px solid var(--ac-orange);">
          ${escapeHtml(pista.descripcion || '')}
        </p>
      </div>
    `;

  container.innerHTML = `
    <div class="canciones-container">
      <div class="cancion-progress">
        ${cancionesState.pistas.map((_, i) => {
          let cls = 'cancion-dot';
          if (i === cancionesState.currentIndex) cls += ' current';
          else if (cancionesState.answered[i] === true) cls += ' correct';
          else if (cancionesState.answered[i] === false) cls += ' wrong';
          return `<div class="${cls}"></div>`;
        }).join('')}
      </div>

      <div class="timer-bar-container">
        <div class="timer-bar" id="cancionesTimerBar"></div>
      </div>

      <div class="cancion-pista" style="text-align:center;">
        <div class="cancion-numero">Canción ${cancionesState.currentIndex + 1} de ${cancionesState.pistas.length}</div>
        <div style="margin:8px 0;color:var(--ac-text-light);">Pista ${pistaNum} de ${totalPistas} (Puntos: ${pista.puntuacion})</div>
      </div>

      <div class="cancion-pista-content" style="background:rgba(124,179,124,0.1);border-radius:14px;padding:16px;margin:14px 0;border:2px solid var(--ac-green-light);">
        ${pistaHtml}
      </div>

      <div style="text-align:center;margin:12px 0;">
        <input
          type="text"
          id="cancionRespuesta"
          placeholder="Escribe el título de la canción"
          style="font-family:'Nunito',sans-serif;font-weight:600;font-size:1rem;width:100%;max-width:520px;padding:12px 15px;border:3px solid var(--ac-brown-light);border-radius:12px;background:var(--ac-white);color:var(--ac-text);outline:none;"
        >
      </div>

      <div class="canciones-actions">
        <button class="ac-button canciones-btn canciones-btn-answer" onclick="submitCancionRespuesta(${pista.puntuacion})">Responder</button>
        ${pistaNum < totalPistas ? '<button class="ac-button canciones-btn canciones-btn-next" onclick="nextCancionHint()">Siguiente pista</button>' : ''}
      </div>

      <div id="cancionFeedback"></div>
    </div>
  `;

  const input = document.getElementById('cancionRespuesta');
  if (input) {
    input.focus();
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') submitCancionRespuesta(pista.puntuacion);
    });
  }

  setTimeout(() => {
    const audio = document.getElementById('audioPlayer');
    if (audio) audio.play().catch(() => {});
  }, 200);

  startCancionesTimer();
}

function nextCancionHint() {
  if (cancionesState.timer) clearInterval(cancionesState.timer);
  stopAllAudios();

  const cancion = cancionesState.pistas[cancionesState.currentIndex];
  if (!cancion) return;

  if (cancionesState.pistaActual < cancion.pistasProgresivas.length) {
    cancionesState.pistaActual += 1;
    renderCancionesQuestion();
  }
}

function submitCancionRespuesta(puntosDisponibles) {
  if (cancionesState.timer) clearInterval(cancionesState.timer);
  stopAllAudios();

  const cancion = cancionesState.pistas[cancionesState.currentIndex];
  if (!cancion) return;

  const input = document.getElementById('cancionRespuesta');
  const respuesta = input ? input.value : '';
  const correcta = normalizeStr(respuesta) === normalizeStr(cancion.respuesta || '');
  const totalPistas = Array.isArray(cancion.pistasProgresivas) ? cancion.pistasProgresivas.length : 0;
  const hayMasPistas = cancionesState.pistaActual < totalPistas;

  if (correcta) {
    cancionesState.answered[cancionesState.currentIndex] = true;
    cancionesState.scores[cancionesState.currentIndex] = puntosDisponibles;
    cancionesState.score += puntosDisponibles;
    const scoreEl = document.getElementById('cancionesScore');
    if (scoreEl) scoreEl.textContent = String(cancionesState.score);
    showCanelaAction('correct');
  } else {
    showCanelaAction('wrong');
    if (!hayMasPistas) {
      cancionesState.answered[cancionesState.currentIndex] = false;
      cancionesState.scores[cancionesState.currentIndex] = 0;
    }
  }

  const feedback = document.getElementById('cancionFeedback');
  if (feedback) {
    feedback.innerHTML = `
      <div class="cancion-resultado ${correcta ? 'correcto' : 'incorrecto'}">
        ${correcta
          ? `Correcto! +${puntosDisponibles} puntos`
          : (hayMasPistas
              ? `Incorrecto. Pasamos a la pista ${cancionesState.pistaActual + 1}.`
              : `Incorrecto. La respuesta era: <strong>${escapeHtml(cancion.respuesta || '')}</strong>`)}
      </div>
    `;
  }

  if (input) input.disabled = true;

  setTimeout(() => {
    if (correcta || !hayMasPistas) {
      cancionesState.currentIndex += 1;
      cancionesState.pistaActual = 0;
    } else {
      cancionesState.pistaActual += 1;
    }
    renderCancionesQuestion();
  }, 1700);
}

function startCancionesTimer() {
  const bar = document.getElementById('cancionesTimerBar');
  let left = cancionesState.timeLeft;

  if (cancionesState.timer) clearInterval(cancionesState.timer);

  cancionesState.timer = setInterval(() => {
    left -= 1;
    if (bar) bar.style.width = ((left / cancionesState.timeLeft) * 100) + '%';

    if (left <= 0) {
      clearInterval(cancionesState.timer);
      submitCancionRespuesta(0);
    }
  }, 1000);
}

function finishCanciones() {
  stopCancionesGame();

  const total = cancionesState.pistas.length;
  const correct = cancionesState.answered.filter(v => v === true).length;
  const totalPoints = cancionesState.score;

  const details = `
    <p>Aciertos: <strong>${correct}</strong> / ${total}</p>
    <p>Porcentaje: <strong>${total ? Math.round((correct / total) * 100) : 0}%</strong></p>
    <p>Puntuacion: <strong>${totalPoints}</strong></p>
  `;

  showResults(correct, total || 1, details, 'canciones');
}

function stopAllAudios() {
  document.querySelectorAll('audio').forEach(a => {
    a.pause();
    a.currentTime = 0;
  });
}

function normalizeStr(str) {
  return String(str || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
