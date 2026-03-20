const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Basic CORS for split frontend/backend deployments (GitHub Pages + Render)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(v => v.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.github\.io$/i.test(origin)) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  return false;
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

/* ---------- HELPER: ensure directory ---------- */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/* ---------- LIST FILES ---------- */
function listFiles(dir, filter) {
  try {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(f => !f.startsWith('.') && (!filter || filter(f)));
  } catch { return []; }
}

// Images backgrounds
app.get('/api/images', (req, res) => {
  res.json(listFiles(path.join(__dirname, 'public', 'img', 'backgrounds')));
});

// Video wallpapers
app.get('/api/videos', (req, res) => {
  const files = listFiles(path.join(__dirname, 'public', 'video-wallpaper'), f => /\.(mp4|webm|ogg)$/i.test(f));
  const videos = files.map(f => ({
    file: f,
    name: path.parse(f).name,
    thumb: path.parse(f).name + '.png'
  }));
  res.json(videos);
});

// Characters list (filename without extension as name)
app.get('/api/characters', (req, res) => {
  const dir = path.join(__dirname, 'public', 'img', 'characters');
  const files = listFiles(dir);
  const chars = files.map(f => ({ file: f, name: path.parse(f).name }));
  res.json(chars);
});

// Users list
app.get('/api/users', (req, res) => {
  const dir = path.join(__dirname, 'public', 'img', 'users');
  const files = listFiles(dir);
  const users = files.map(f => ({ file: f, name: path.parse(f).name }));
  res.json(users);
});

// Audios
app.get('/api/audios', (req, res) => {
  res.json(listFiles(path.join(__dirname, 'public', 'audio')));
});

/* ---------- MAIN CONFIG ---------- */
app.get('/api/config', (req, res) => {
  try {
    const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'game-config.json'), 'utf8'));
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: 'Error leyendo la configuración' });
  }
});

app.post('/api/config', (req, res) => {
  try {
    fs.writeFileSync(
      path.join(__dirname, 'data', 'game-config.json'),
      JSON.stringify(req.body, null, 2), 'utf8'
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error guardando la configuración' });
  }
});

/* ---------- DATASETS ---------- */
const datasetsDir = path.join(__dirname, 'data', 'datasets');

// List datasets for a game type
app.get('/api/datasets/:gameType', (req, res) => {
  const dir = path.join(datasetsDir, req.params.gameType);
  ensureDir(dir);
  const files = listFiles(dir, f => f.endsWith('.json'));
  const datasets = files.map(f => {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      return { id: path.parse(f).name, name: data.name || path.parse(f).name, file: f };
    } catch { return { id: path.parse(f).name, name: path.parse(f).name, file: f }; }
  });
  res.json(datasets);
});

// Get a specific dataset
app.get('/api/datasets/:gameType/:id', (req, res) => {
  const file = path.join(datasetsDir, req.params.gameType, req.params.id + '.json');
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    res.json(data);
  } catch {
    res.status(404).json({ error: 'Dataset no encontrado' });
  }
});

// Save (create/update) a dataset
app.post('/api/datasets/:gameType/:id', (req, res) => {
  const dir = path.join(datasetsDir, req.params.gameType);
  ensureDir(dir);
  const file = path.join(dir, req.params.id + '.json');
  try {
    fs.writeFileSync(file, JSON.stringify(req.body, null, 2), 'utf8');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error guardando dataset' });
  }
});

// Delete a dataset
app.delete('/api/datasets/:gameType/:id', (req, res) => {
  const file = path.join(datasetsDir, req.params.gameType, req.params.id + '.json');
  try {
    if (fs.existsSync(file)) fs.unlinkSync(file);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error eliminando dataset' });
  }
});

/* ---------- LEADERBOARD ---------- */
const scoresFile = path.join(__dirname, 'data', 'scores.json');

function loadScores() {
  try {
    if (fs.existsSync(scoresFile)) return JSON.parse(fs.readFileSync(scoresFile, 'utf8'));
  } catch {}
  return [];
}

function saveScores(scores) {
  ensureDir(path.dirname(scoresFile));
  fs.writeFileSync(scoresFile, JSON.stringify(scores, null, 2), 'utf8');
}

app.get('/api/scores', (req, res) => {
  res.json(loadScores());
});

app.get('/api/scores/:gameType', (req, res) => {
  const all = loadScores();
  res.json(all.filter(s => s.gameType === req.params.gameType));
});

app.post('/api/scores', (req, res) => {
  const scores = loadScores();
  const entry = {
    ...req.body,
    date: new Date().toISOString()
  };
  scores.push(entry);
  // Keep last 200 entries
  if (scores.length > 200) scores.splice(0, scores.length - 200);
  saveScores(scores);
  res.json({ success: true });
});

app.delete('/api/scores', (req, res) => {
  saveScores([]);
  res.json({ success: true });
});

app.delete('/api/scores/:gameType', (req, res) => {
  const scores = loadScores();
  const filtered = scores.filter(s => s.gameType !== req.params.gameType);
  saveScores(filtered);
  res.json({ success: true });
});

/* ---------- SONG PROCESSOR (YouTube downloader) ---------- */
app.post('/api/songs/process', (req, res) => {
  const { youtubeUrl, titulo, artista } = req.body;
  const textHintTemplates = Array.isArray(req.body?.textHintTemplates)
    ? req.body.textHintTemplates.map(t => String(t || '').trim()).filter(Boolean).slice(0, 20)
    : [];
  
  if (!youtubeUrl || !titulo || !artista) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos' });
  }

  // Carpeta temporal para descargas
  const carpeta = path.join(__dirname, 'data', 'canciones_temp');
  ensureDir(carpeta);

  // Ejecutar el script Python
  const pythonProcess = spawn('python', [
    path.join(__dirname, 'song_processor.py'),
    youtubeUrl,
    titulo,
    artista,
    carpeta,
    JSON.stringify(textHintTemplates)
  ]);

  let output = '';
  let errorOutput = '';
  let finished = false;

  pythonProcess.stdout.on('data', (data) => {
    output += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });

  pythonProcess.on('close', (code) => {
    if (finished) return;
    finished = true;
    clearTimeout(timeoutId);

    if (code !== 0) {
      const mensajeError = errorOutput || output;
      console.error('Python script error:', mensajeError);
      return res.status(500).json({ error: 'Error procesando canción: ' + mensajeError });
    }

    try {
      const resultado = JSON.parse(output.trim());
      
      if (resultado.error) {
        return res.status(400).json({ error: resultado.error });
      }

      if (resultado.exito) {
        // Mover archivos de audio a carpeta pública
        const audioDir = path.join(__dirname, 'public', 'audio', 'canciones');
        ensureDir(audioDir);
        
        const nombreBase = resultado.archivo_mp3.split(path.sep).pop().replace('.mp3', '');
        const musicaUrl = `/audio/canciones/${nombreBase}.mp3`;
        
        // Copiar archivo mp3 principal
        const origenMp3 = resultado.archivo_mp3;
        const destinoMp3 = path.join(audioDir, `${nombreBase}.mp3`);
        
        if (fs.existsSync(origenMp3)) {
          fs.copyFileSync(origenMp3, destinoMp3);
        }

        // Procesar pistas y copiar archivos de audio
        const pistasProcessadas = resultado.pistas.map(pista => {
          const pistaObj = { ...pista };
          
          // Si hay archivo local, copiarlo a public/audio
          if (pista.archivo_local && fs.existsSync(pista.archivo_local)) {
            const nombreArchivoPista = path.basename(pista.archivo_local);
            const destino = path.join(audioDir, nombreArchivoPista);
            fs.copyFileSync(pista.archivo_local, destino);
            pistaObj.audioUrl = `/audio/canciones/${nombreArchivoPista}`;
          }
          
          // Limpiar campos no necesarios para el cliente
          delete pistaObj.archivo_local;
          return pistaObj;
        });

        res.json({
          exito: true,
          cancion: {
            titulo: resultado.titulo,
            artista: resultado.artista,
            audioUrl: musicaUrl,
            pistas: pistasProcessadas
          }
        });

        // Limpiar archivos temporales
        setTimeout(() => {
          try {
            if (fs.existsSync(origenMp3)) fs.unlinkSync(origenMp3);
            resultado.pistas.forEach(pista => {
              if (pista.archivo_local && fs.existsSync(pista.archivo_local)) {
                fs.unlinkSync(pista.archivo_local);
              }
            });
          } catch (e) { console.error('Error limpiando archivos temporales:', e); }
        }, 1000);
      } else {
        res.status(500).json({ error: 'Error procesando canción' });
      }
    } catch (e) {
      console.error('Error parsing Python output:', e, output);
      res.status(500).json({ error: 'Error procesando respuesta del servidor' });
    }
  });

  // Timeout de 5 minutos
  const timeoutId = setTimeout(() => {
    try {
      if (finished) return;
      finished = true;
      pythonProcess.kill();
      res.status(408).json({ error: 'Timeout procesando canción' });
    } catch (e) { console.error('Error matando proceso:', e); }
  }, 5 * 60 * 1000);
});

/* ---------- START ---------- */
app.listen(PORT, () => {
  console.log(`\nPasapalabra Animal Crossing corriendo en http://localhost:${PORT}\n`);
});
