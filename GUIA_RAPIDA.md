# 🚀 Guía Rápida - Sistema de Canciones

## Instalación Rápida

### 1. Instalar Dependencias de Python (si no están instaladas)
```bash
cd Rosco_2026
pip install yt-dlp librosa numpy pydub
```

### 2. Instalar Dependencias de Node.js
```bash
npm install
```

### 3. Iniciar el Servidor
```bash
npm start
# o
node server.js
```

El servidor estará disponible en: **http://localhost:3000**

---

## 🎵 Agregar tu Primera Canción

### Paso 1: Abre el Editor
1. Ve a tu navegador: `http://localhost:3000/editor.html`
2. Asegúrate de estar en la pestaña **"Canciones"**

### Paso 2: Completa el Formulario
```
Enlace de YouTube: https://www.youtube.com/watch?v=...
Título: "Nombre de tu canción"
Artista: "Nombre del artista"
```

### Paso 3: ¡Procesa!
Haz clic en **"Descargar y Procesar"** y espera a que:
- Se descargue la canción
- Se analice el audio
- Se generen las 5 pistas automáticamente
- Se guarden los archivos

### Paso 4: Guarda
Haz clic en **"Guardar Dataset"** al final

---

## 🎮 Jugar

### En Juego Normal
1. Ve a `http://localhost:3000`
2. Selecciona "Prueba de Canciones"
3. Elige el dataset donde guardaste tu canción
4. ¡Comienza el juego!

### Cómo Funcionan las Pistas
1. **Primera pista (5 pts)**: 1 segundo del estribillo 🎵
2. **Segunda pista (4 pts)**: Título enrevesado 💡
3. **Tercera pista (3 pts)**: 2 segundos de la canción 🎵
4. **Cuarta pista (2 pts)**: 4 segundos del estribillo 🎵
5. **Quinta pista (1 pt)**: 5 segundos completos 🎵

---

## ⚙️ Configuración Avanzada

### Cambiar Tiempo por Pista
En el editor, modifica "Tiempo por pista (segundos)" a tu preferencia.

### Combinar Canciones Automáticas + Manuales
Puedes hacer clic en **"Agregar Pista Manual"** para agregar pistas tradicionales junto con las automáticas.

---

## ❓ Preguntas Frecuentes

### ¿Qué formatos de YouTube funcionan?
- ✅ Videos normales de YouTube
- ✅ Playlists (procesa la primera canción)
- ✅ Directs / Shorts (si tienen audio)
- ❌ Videos muy largos (pueden tardarse)

### ¿Cuánto tiempo tarda procesar una canción?
- Canciones cortas: ~30 segundos
- Canciones normales: 1-2 minutos
- Canciones largas: 2-5 minutos

### ¿Dónde se guardan los archivos?
- Canciones: `public/audio/canciones/`
- Propiedades: `data/datasets/canciones/`

### ¿Puedo editar las pistas después?
Las canciones automáticas tienen campos protegidos para evitar errores. Si necesitas cambiar algo, elimina y vuelve a agregar.

### ¿Se pierden si reinicio el servidor?
No, todo está guardado en archivos JSON y MP3 en el servidor.

---

## 🐛 Si Algo Sale Mal

### "Timeout al descargar"
- Intenta con un video más corto
- Verifica tu conexión a Internet

### "El audio no se reproduce"
- Recarga la página
- Intenta en otro navegador
- Verifica que no haya bloqueadores de contenido

### "Error procesando"
- Algunos videos pueden estar restringidos
- Intenta con otra canción

---

## 📱 Características del Sistema

✨ **Automático**
- Descarga de YouTube integrada
- Detección de estribillo inteligente
- Generación automática de 5 pistas

🎯 **Inteligente**
- Sistema de puntuación progresivo
- Pistas de audio de calidad
- Títulos enrevesados para depistar

📊 **Completo**
- Compatible con pistas manuales
- Datasets ilimitados
- Guardado automático

---

## 🎁 Ejemplo de Uso

```
1. Abre el editor
2. Pega: https://www.youtube.com/watch?v=fJ9rUzIMt7o
3. Título: "Bohemian Rhapsody"
4. Artista: "Queen"
5. Procesa
6. ¡Guarda!
7. Juega
```

---

**¿Listo para comenzar? ¡Bienvenido al nuevo juego de canciones! 🎵**
