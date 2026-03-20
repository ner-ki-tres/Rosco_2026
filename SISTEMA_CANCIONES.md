# 🎵 Sistema de Canciones Automático - Documentación

## Descripción General

El juego de canciones ahora soporta descargas automáticas desde YouTube con un sistema inteligente de 5 pistas progresivas que se generan automáticamente.

## Características

### 1. **Descarga desde YouTube** 
- Integración con yt-dlp para descargar canciones directamente
- Conversión automática a MP3
- Almacenamiento en servidor

### 2. **Sistema de 5 Pistas Progresivas**

Cada canción generada automáticamente ofrece 5 pistas en progresión:

| # | Tipo | Descripción | Puntos | Condición |
|---|------|-------------|--------|-----------|
| **1** | Audio | Primer segundo del estribillo | **5** | Para ganar puntuación máxima |
| **2** | Texto | Título enrevesado/confuso | **4** | Referencia indirecta |
| **3** | Audio | 2 segundos aleatorios de la canción | **3** | Fragmento intermedio |
| **4** | Audio | 4 segundos del estribillo O canción | **2** | Más contexto ofrecido |
| **5** | Audio | 5 segundos completos del estribillo | **1** | Máxima ayuda |

### 3. **Sistema de Puntuación**

- **Respuesta correcta en Pista 1**: +5 puntos (acertaste de inmediato)
- **Respuesta correcta en Pista 2**: +4 puntos
- **Respuesta correcta en Pista 3**: +3 puntos
- **Respuesta correcta en Pista 4**: +2 puntos
- **Respuesta correcta en Pista 5**: +1 punto
- **Respuesta incorrecta**: 0 puntos

### 4. **Detección de Estribillo**

El script Python analiza automáticamente:
- Características cromáticas para detectar patrones repetidos
- Similitud entre secciones de la canción
- Ubicación probable del estribillo

## Cómo Usar

### Agregar una Nueva Canción

1. **Abre el Editor**
   - Ve a `http://localhost:3000/editor.html`
   - Selecciona la pestaña "Canciones"

2. **Completa el Formulario**
   - **Enlace de YouTube**: Pega un enlace válido (youtube.com o youtu.be)
   - **Título de la Canción**: Ej: "Bohemian Rhapsody"
   - **Artista**: Ej: "Queen"

3. **Descarga y Procesa**
   - Haz clic en "Descargar y Procesar"
   - El sistema:
     - Descarga la canción de YouTube
     - Detecta el estribillo
     - Genera 5 fragmentos de audio
     - Crea la pista 2 enrevesada
     - Guarda todo en la base de datos

4. **Guarda el Dataset**
   - Haz clic en "Guardar Dataset" al final

### Editar una Canción Automática

Las canciones descargadas de YouTube muestran un indicador especial "🎵 Auto" y tienen campos readonly protegidos. Los datos se generan automáticamente y no deben ser modificados manualmente.

### Agregar Pistas Manuales

Puedes seguir agregando pistas tradicionales usando el botón "Agregar Pista Manual" si lo deseas combinar con contenido manual.

## Estructura de Datos

### Canción Descargada (con pistas automáticas)

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
    // ... más pistas
  ]
}
```

### Canción Manual (tradicional)

```json
{
  "id": 2,
  "audioUrl": "",
  "pista": "Esta canción habla de...",
  "respuesta": "Título de la Canción",
  "artista": "Artista",
  "opciones": ["Opción 1", "Opción 2", "Opción 3", "Opción 4"]
}
```

## Requisitos del Sistema

### Instalados Automáticamente

- `yt-dlp` - Descarga de videos de YouTube
- `librosa` - Análisis de audio
- `numpy` - Cálculos numéricos
- `pydub` - Procesamiento de audio

### Node.js/Express

- `express` - Servidor web
- `child_process` (built-in) - Ejecución de scripts Python

## Configuración del Servidor

El servidor escucha en: **http://localhost:3000**

Endpoints principales:

```
POST /api/songs/process
Body: {
  youtubeUrl: "https://...",
  titulo: "Nombre de la canción",
  artista: "Nombre del artista"
}
Response: {
  exito: true,
  cancion: {
    titulo: "...",
    artista: "...",
    audioUrl: "...",
    pistas: [...]
  }
}
```

## Carpetas Importantes

```
Rosco_2026/
├── song_processor.py           # Script Python de procesamiento
├── server.js                   # Servidor Express
├── public/
│   ├── editor.html            # Editor de contenido
│   ├── audio/
│   │   └── canciones/         # Canciones descargadas
│   └── js/
│       └── canciones.js       # Lógica del juego
├── data/
│   ├── datasets/
│   │   └── canciones/         # Datasets guardados
│   └── canciones_temp/        # Archivos temporales
```

## Solución de Problemas

### "Error descargando de YouTube"

- Verifica que el enlace sea válido
- Comprueba tu conexión a Internet
- Algunos videos pueden estar bloqueados por derecha de autor

### "Error procesando canción"

- El archivo MP3 puede estar dañado
- Intenta con otra canción
- Verifica que haya espacio en disco

### Los audios no se reproducen

- Verifica que los archivos existan en `public/audio/canciones/`
- Comprueba que el formato MP3 sea válido
- Intenta en otro navegador

### Timeout al procesar

- Las canciones muy largas pueden tardar más
- El timeout está configurado a 5 minutos
- Intenta con un video más corto

## Notas de Desarrollo

### Personalizar Detección de Estribillo

En `song_processor.py`, función `detectar_estribillo()`:

```python
def detectar_estribillo(archivo_audio, umbral_minuto=0.8):
    # Modificar lógica de detección aquí
```

### Cambiar Formato de Título Enrevesado

En `song_processor.py`, función `generar_titulo_enrevesado()`:

```python
def generar_titulo_enrevesado(titulo):
    si_no = [
        # Agregar más estrategias aquí
    ]
```

### Ajustar Duración de Fragmentos

En `song_processor.py`, función `generar_pistas()`:

```python
# Modificar estos valores:
# Pista 1: 1 segundo
# Pista 3: 2 segundos
# Pista 4: 4 segundos
# Pista 5: 5 segundos
```

## Versión

Sistema de Canciones Automático v1.0
Compatibilidad: Node.js 14+, Python 3.7+

## Licencia

Este sistema utiliza:
- yt-dlp (bajo licencia Unlicense)
- librosa (bajo licencia ISC)
- Express.js (bajo licencia MIT)
