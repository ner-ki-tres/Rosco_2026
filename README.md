# 🎵 Pasapalabra Animal Crossing - Sistema de Canciones Automático

## Despliegue Web (GitHub Pages + Render)

Si quieres publicar el frontend en GitHub Pages y el backend en Render, revisa:

- [DEPLOY_GITHUB_PAGES_RENDER.md](DEPLOY_GITHUB_PAGES_RENDER.md)

## 📚 Documentación Completa

Bienvenido al sistema de canciones mejorado para el juego Pasapalabra Animal Crossing. Este documento contiene toda la información que necesitas para utilizar el nuevo sistema de descarga automática de YouTube y generación de pistas inteligentes.

---

## 🎯 Descripción General

Este sistema permite:

✅ **Descargar canciones** directamente desde YouTube
✅ **Generar automáticamente** 5 pistas progresivas por canción
✅ **Sistema de puntuación** dinámico (5, 4, 3, 2, 1 puntos)
✅ **Análisis inteligente** de audio para detectar estribillo
✅ **Pistas de audio/texto** mezcladas para mayor diversidad
✅ **Interfaz visual** intuitiva en el editor

---

## 🚀 Instalación y Configuración

### Requisitos Previos

- **Node.js** 14+ (incluye npm)
- **Python** 3.7+
- **ffmpeg** (necesario para yt-dlp)

### Paso 1: Instalar Dependencias Python

```bash
# Windows (PowerShell)
pip install -r requirements.txt

# O manualmente
pip install yt-dlp librosa numpy pydub
```

### Paso 2: Instalar Dependencias Node.js

```bash
npm install
```

### Paso 3: Iniciar el Servidor

```bash
npm start
```

Accede a: **http://localhost:3000**

---

## 🎵 Sistema de 5 Pistas Progresivas

### ¿Cómo Funciona?

Cuando agregas una canción desde YouTube, el sistema automáticamente:

1. **Descarga** la canción en formato MP3
2. **Analiza** el audio usando librosa
3. **Detecta** la ubicación del estribillo
4. **Genera** 5 fragmentos de audio
5. **Crea** una pista de texto enrevesada
6. **Organiza** todo en estructura progresiva

### Las 5 Pistas

| Número | Tipo | Contenido | Puntos | Dificultad |
|--------|------|-----------|--------|-----------|
| 1️⃣ | 🔊 Audio | Primer segundo del estribillo | **5** | 🟥 Muy Difícil |
| 2️⃣ | 💡 Texto | Título expresado de forma enrevesada | **4** | 🟧 Difícil |
| 3️⃣ | 🔊 Audio | 2 segundos aleatorios de la canción | **3** | 🟨 Normal |
| 4️⃣ | 🔊 Audio | 4 segundos del estribillo (o canción) | **2** | 🟩 Fácil |
| 5️⃣ | 🔊 Audio | 5 segundos completos del estribillo | **1** | 🟩 Muy Fácil |

### Sistema de Puntuación

```
Respuesta correcta en Pista 1 → +5 puntos (¡Excelente!)
Respuesta correcta en Pista 2 → +4 puntos
Respuesta correcta en Pista 3 → +3 puntos
Respuesta correcta en Pista 4 → +2 puntos
Respuesta correcta en Pista 5 → +1 punto
Respuesta incorrecta/Tiempo agotado → 0 puntos
```

---

## 📖 Guía de Uso - Paso a Paso

### Agregar una Canción Nueva

#### Paso 1: Abre el Editor
```
URL: http://localhost:3000/editor.html
Pestaña: "Canciones"
```

#### Paso 2: Busca el Formulario de YouTube
```
🎵 Descargar Canción desde YouTube
```

#### Paso 3: Completa los Campos
```
Enlace de YouTube: https://www.youtube.com/watch?v=...
Título: "Nombre Exacto de la Canción"
Artista: "Nombre del Artista"
```

#### Paso 4: Procesa
Haz clic en **"Descargar y Procesar"**

El sistema mostrará:
- Barra de progreso: situación actual
- Tiempo estimado: depende del tamaño de la canción

#### Paso 5: Verifica el Resultado
Deberías ver una tarjeta con fondo amarillento:
```
🎵 Auto - Pista 1
✨ Pistas Automáticas Generadas (5 pistas progresivas)
```

#### Paso 6: Guarda
Haz clic en **"Guardar Dataset"** al final

---

## 🎮 Jugar con Canciones Automáticas

### En la Pantalla Principal

1. Inicia el juego: `http://localhost:3000`
2. Selecciona **"Prueba de Canciones"**
3. Elige el dataset con tus canciones
4. Comienza a jugar

### Interfaz de Juego

```
🎵 ARTISTA - TÍTULO
Pista 1 de 5 (Puntos posibles: 5)

[🔊 Audio Player] o [💡 Texto con Pista]

¿Cuál es el título de la canción?
[Input de texto]

[Responder] [Siguiente Pista]
```

### Mecánica del Juego

1. Se muestra la **Pista 1** (más difícil)
2. Escuchas 1 segundo del estribillo
3. Intentas adivinar el título
4. Si aciertas: +5 puntos
5. Si fallas: Puedes ver la **Pista 2**
6. Repites hasta acertar o agotar pistas
7. Última pista: 5 segundos completos (casi imposible fallar)

---

## 🛠️ Estructura de Archivos

```
Rosco_2026/
├── 📄 package.json              # Configuración Node.js
├── 📄 server.js                 # Servidor Express
├── 🐍 song_processor.py         # Procesador de audio
├── 📄 GUIA_RAPIDA.md            # Guía para usuarios
├── 📄 SISTEMA_CANCIONES.md      # Documentación técnica
│
├── 📁 public/
│   ├── 📄 editor.html           # Editor del contenido
│   ├── 📄 index.html            # Pantalla principal
│   ├── 📁 js/
│   │   ├── app.js               # Lógica principal
│   │   ├── canciones.js         # Juego de canciones (ACTUALIZADO)
│   │   ├── palabras.js
│   │   └── rosco.js
│   ├── 📁 css/
│   │   ├── canciones.css        # Estilos (ACTUALIZADO)
│   │   └── styles.css
│   └── 📁 audio/
│       └── 📁 canciones/        # 🆕 Audios de canciones descargadas
│
├── 📁 data/
│   ├── 📁 datasets/
│   │   ├── 📁 canciones/        # Datasets de canciones
│   │   ├── 📁 palabras/
│   │   └── 📁 rosco/
│   ├── 📁 canciones_temp/       # 🆕 Archivos temporales
│   └── 📄 game-config.json
```

---

## 📊 Formato de Datos

### Estructura de una Canción Automática

```json
{
  "id": 1,
  "respuesta": "Bohemian Rhapsody",
  "artista": "Queen",
  "audioUrl": "/audio/canciones/Bohemian_Rhapsody.mp3",
  "pista": "Nueva canción - con pistas automáticas",
  "pistasProgresivas": [
    {
      "numero": 1,
      "tipo": "audio",
      "descripcion": "Escucha el primer segundo del estribillo",
      "audioUrl": "/audio/canciones/pista_1_Bohemian_Rhapsody.mp3",
      "puntuacion": 5
    },
    {
      "numero": 2,
      "tipo": "texto",
      "descripcion": "Lo opuesto a algo que NO es 'Bohemian Rhapsody'",
      "puntuacion": 4
    },
    {
      "numero": 3,
      "tipo": "audio",
      "descripcion": "Escucha este fragmento de 2 segundos",
      "audioUrl": "/audio/canciones/pista_3_Bohemian_Rhapsody.mp3",
      "puntuacion": 3
    },
    {
      "numero": 4,
      "tipo": "audio",
      "descripcion": "Escucha 4 segundos de cualquier parte de la canción",
      "audioUrl": "/audio/canciones/pista_4_Bohemian_Rhapsody.mp3",
      "puntuacion": 2
    },
    {
      "numero": 5,
      "tipo": "audio",
      "descripcion": "Escucha 5 segundos del estribillo",
      "audioUrl": "/audio/canciones/pista_5_Bohemian_Rhapsody.mp3",
      "puntuacion": 1
    }
  ]
}
```

### Canción Manual (Tradicional)

```json
{
  "id": 2,
  "audioUrl": "",
  "pista": "Esta canción de los 80 habla de...",
  "respuesta": "Título de la Canción",
  "artista": "Nombre del Artista",
  "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"]
}
```

---

## 🔌 API del Servidor

### Endpoint de Procesamiento

```http
POST /api/songs/process
Content-Type: application/json

{
  "youtubeUrl": "https://www.youtube.com/watch?v=...",
  "titulo": "Nombre de la Canción",
  "artista": "Nombre del Artista"
}
```

**Respuesta (Éxito):**
```json
{
  "exito": true,
  "cancion": {
    "titulo": "...",
    "artista": "...",
    "audioUrl": "/audio/canciones/...",
    "pistas": [...]
  }
}
```

**Respuesta (Error):**
```json
{
  "error": "Descripción del error"
}
```

---

## ⚙️ Configuración Avanzada

### Variables Ajustables

#### En `song_processor.py`:

```python
# Duración de fragmentos (en segundos)
pista_1_duracion = 1      # Primer segundo del estribillo
pista_3_duracion = 2      # Dos segundos aleatorios  
pista_4_duracion = 4      # Cuatro segundos
pista_5_duracion = 5      # Cinco segundos completos

# Umbral de detección de estribillo
umbral_minuto = 0.5       # Adjust para mejorar detección
```

#### En `server.js`:

```javascript
const PORT = 3000;                    // Puerto del servidor
app.use(express.json({ limit: '50mb' })); // Límite de tamaño
// Timeout de 5 minutos
timeout: 5 * 60 * 1000
```

#### En `public/js/canciones.js`:

```javascript
// Modificar tiempo por defecto de pista
timeLeft: config.tiempoSegundos || 30  // Segundos
```

---

## 🐛 Solución de Problemas

### Problema: "No puedo descargar de YouTube"

**Causas Posibles:**
- Enlace inválido o video no disponible
- Sin conexión a Internet
- yt-dlp desactualizado
- Video con restricciones de derechos

**Soluciones:**
```bash
# Actualizar yt-dlp
pip install --upgrade yt-dlp

# Verificar que funciona
yt-dlp --version
```

### Problema: "Error procesando canción"

**Causas Posibles:**
- Archivo MP3 corrupto
- Problemas de permisos
- Falta de espacio en disco
- librosa no detectó audio válido

**Soluciones:**
```bash
# Reinstalar librosa
pip install --force-reinstall librosa

# Verificar permisos
chmod 755 public/audio/canciones/
```

### Problema: "Timeout - se quedó colgado"

**Causas Posibles:**
- Canción muy larga (>10 minutos)
- Conexión lenta
- Servidor sobrecargado

**Soluciones:**
- Intenta con una canción más corta
- Revisa tu conexión
- Reinicia el servidor

### Problema: "No se reproduce el audio"

**Causas Posibles:**
- Navegador no soporta MP3
- Archivo incompleto
- Ruta incorrecta

**Soluciones:**
```bash
# Verificar que exista el archivo
ls public/audio/canciones/

# Reinicia el servidor
npm start

# Intenta en otro navegador (Chrome, Firefox)
```

---

## 📝 Log de Errores

Para ver errores detallados, revisa la consola del servidor:

```bash
# En PowerShell
npm start

# Busca líneas que comiencen con "Error"
# "Python script error:"
# "Error parsing Python output:"
```

---

## 📚 Recursos Adicionales

### Documentación del Proyecto

- **GUIA_RAPIDA.md** - Guía para comenzar rápidamente
- **SISTEMA_CANCIONES.md** - Documentación técnica detallada

### Librerías Utilizadas

- **yt-dlp** - Descarga desde YouTube
- **librosa** - Análisis de audio
- **numpy** - Cálculos numéricos
- **pydub** - Procesamiento de audio
- **Express.js** - Servidor Node.js

---

## ✨ Características Especiales

### 🎯 Detección Inteligente de Estribillo

El sistema usa análisis de características cromáticas para detectar:
- Patrones repetidos en la música
- Similitud entre secciones
- Ubicación probable del estribillo

### 🔀 Títulos Enrevesados

La pista 2 inteligentemente genera variaciones del título:
- Orden invertido de palabras
- Títulos palindrómicos
- Referencias contextuales engañosas

### 📊 Puntuación Justa

El sistema premia:
- ✅ Aciertos tempranos: Más puntos
- ✅ Progresión lógica: Ayuda gradual
- ✅ Habilidad: Recompensa el reconocimiento rápido

---

## 🎁 Ejemplos de Uso

### Ejemplo 1: Canción Clásica

```
URL: https://www.youtube.com/watch?v=fJ9rUzIMt7o
Título: "Bohemian Rhapsody"
Artista: "Queen"
Resultado: ✅ 5 pistas generadas
```

### Ejemplo 2: Pop Moderno

```
URL: https://www.youtube.com/watch?v=kffacr...
Título: "Blinding Lights"
Artista: "The Weeknd"
Resultado: ✅ Procesado en ~1 minuto
```

### Ejemplo 3: Canción Local

```
URL: https://youtu.be/dQw4w9WgXcQ
Título: "Never Gonna Give You Up"
Artista: "Rick Astley"
Resultado: ✅ 5 pistas en espera...
```

---

## 🔐 Privacidad y Seguridad

- ✅ Los archivos se guardan localmente
- ✅ No se envía información a terceros
- ✅ Los audios se almacenan en `public/audio/canciones/`
- ✅ Puedes eliminar canciones en cualquier momento

---

## 🚀 Próximas Mejoras

Características planeadas:

```
□ Interfaz de administración de canciones
□ Estadísticas de reproducción
□ Ranking de canciones más jugadas
□ Importación de Spotify
□ Caché de canciónesprocesadas
□ Modo offline
```

---

## ❓ Preguntas Frecuentes

**¿Puedo eliminar una canción?**
Sí, en el editor, selecciona el dataset y usa "Eliminar".

**¿Se pierden los datos al reiniciar?**
No, todo está guardado en JSON y archivos de audio.

**¿Funciona offline?**
No para descargar, pero sí para jugar (si ya están descargar).

**¿Puedo usar otros formatos de video?**
Actualmente solo YouTube, yt-dlp puede extensionarse.

**¿Límite de canciones?**
No, tantas como espacio tengas en disco.

---

## 📞 Soporte

Para problemas específicos:

1. Revisa la **Solución de Problemas** arriba
2. Consulta los logs del servidor
3. Verifica que Python y ffmpeg estén instalados
4. Intenta reiniciar el servidor

---

## 📄 Licencia

Este sistema utiliza software de código abierto bajo las siguientes licencias:

- **yt-dlp**: Unlicense
- **librosa**: ISC
- **Express.js**: MIT

---

## 🎊 ¡Bienvenido!

¡Que disfrutes del nuevo sistema de canciones! Esperamos que sea una experiencia divertida y educativa.

**Hecha un vistazo a GUIA_RAPIDA.md para comenzar inmediatamente.** 🚀

---

**Versión:** 1.0 | **Última actualización:** Marzo 2026
