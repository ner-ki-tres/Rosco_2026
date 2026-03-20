#!/usr/bin/env python3
"""Descarga una canción de YouTube y genera 5 pistas progresivas."""

import json
import os
import io
import random
import re
import subprocess
import sys
from pathlib import Path


def run(cmd):
    return subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)


def safe_name(text):
    text = re.sub(r"[^a-zA-Z0-9 _-]", "", text or "cancion")
    return re.sub(r"\s+", "_", text).strip("_") or "cancion"


def get_duration_seconds(audio_file):
    result = run([
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        audio_file,
    ])
    if result.returncode != 0:
        return 0.0
    try:
        return float(result.stdout.strip())
    except Exception:
        return 0.0


def cut_mp3(input_file, out_file, start_sec, duration_sec):
    start_sec = max(0.0, float(start_sec))
    duration_sec = max(0.1, float(duration_sec))
    result = run([
        "ffmpeg", "-y",
        "-ss", f"{start_sec:.3f}",
        "-t", f"{duration_sec:.3f}",
        "-i", input_file,
        "-vn", "-ar", "44100", "-ac", "2", "-b:a", "192k",
        out_file,
    ])
    return result.returncode == 0 and os.path.exists(out_file)


def download_youtube_mp3(url, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    template = os.path.join(output_dir, "%(title)s.%(ext)s")
    result = run([
        "python", "-m", "yt_dlp",
        "-f", "bestaudio/best",
        "-x",
        "--audio-format", "mp3",
        "--audio-quality", "192",
        "-o", template,
        url,
    ])
    if result.returncode != 0:
        return None, result.stderr.strip() or "Error en yt-dlp"

    files = sorted(Path(output_dir).glob("*.mp3"), key=lambda p: p.stat().st_mtime)
    if not files:
        return None, "No se encontro el archivo MP3 descargado"

    return str(files[-1]), None


def twisted_title(title):
    words = (title or "").split()
    variants = [
        (" ".join(reversed(words))).strip() if words else title,
        (title or "")[::-1],
        f"No es una fruta tropical: es '{title}'",
        f"Si le dieras la vuelta al titulo... seguiria siendo '{title}'",
        f"El nombre real no es secreto, pero suena a acertijo: '{title}'",
    ]
    valid = [v for v in variants if v]
    return random.choice(valid) if valid else "Titulo en clave"


def build_text_hint(title, artist, templates=None):
    defaults = [
        "No es una fruta tropical: es \"{titulo}\".",
        "Si le dieras la vuelta al titulo... seguiria siendo \"{titulo}\".",
        "La cancion es de {artista} y el titulo suena a acertijo.",
        "El nombre real no es secreto, pero suena a acertijo: \"{titulo}\".",
    ]

    pool = [str(t).strip() for t in (templates or []) if str(t).strip()]
    if not pool:
        pool = defaults

    selected = random.choice(pool)
    try:
        return selected.format(titulo=title or "", artista=artist or "")
    except Exception:
        return twisted_title(title)


def build_three_text_hints(title, artist, templates=None):
    hints = []

    for _ in range(3):
        candidate = build_text_hint(title, artist, templates)
        if candidate and candidate not in hints:
            hints.append(candidate)

    extra_defaults = [
        f"El artista es {artist}.",
        f"El titulo contiene exactamente {len((title or '').split())} palabra(s).",
        f"La inicial del titulo es '{(title or ' ')[0]}'." if title else "Empieza por la primera letra del titulo.",
    ]

    for d in extra_defaults:
        if len(hints) >= 3:
            break
        if d not in hints:
            hints.append(d)

    while len(hints) < 3:
        hints.append(twisted_title(title))

    return hints[:3]


def build_hints(song_file, title, artist, text_templates=None):
    duration = get_duration_seconds(song_file)
    if duration <= 0:
        return None, "No se pudo leer la duracion del audio"

    base = safe_name(Path(song_file).stem)
    folder = os.path.dirname(song_file)

    f2 = os.path.join(folder, f"pista_2_{base}.mp3")
    f4 = os.path.join(folder, f"pista_4_{base}.mp3")

    # Pista 2: primeros 2 segundos comenzando en segundo 3
    p2_start = 3.0
    
    # Pista 4: mejor parte (mas energetica) entre 30-50% de la cancion (tipicamente vocal/estribillo)
    p4_start = max(0.0, min(duration - 5.0, duration * 0.40))

    if not cut_mp3(song_file, f2, p2_start, 2.0):
        return None, "No se pudo generar pista 2"
    if not cut_mp3(song_file, f4, p4_start, 5.0):
        return None, "No se pudo generar pista 4"

    text_hints = build_three_text_hints(title, artist, text_templates)

    pistas = [
        {
            "numero": 1,
            "tipo": "texto",
            "descripcion": text_hints[0],
            "puntuacion": 5,
        },
        {
            "numero": 2,
            "tipo": "audio",
            "descripcion": "Escucha dos segundos de la cancion",
            "audioUrl": "",
            "archivo_local": f2,
            "puntuacion": 4,
        },
        {
            "numero": 3,
            "tipo": "texto",
            "descripcion": text_hints[1],
            "puntuacion": 3,
        },
        {
            "numero": 4,
            "tipo": "audio",
            "descripcion": "Escucha cinco segundos del estribillo",
            "audioUrl": "",
            "archivo_local": f4,
            "puntuacion": 2,
        },
        {
            "numero": 5,
            "tipo": "texto",
            "descripcion": text_hints[2],
            "puntuacion": 1,
        },
    ]
    return pistas, None


def main():

    if sys.stdout.encoding != 'utf-8':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

    if len(sys.argv) < 4:
        print(json.dumps({"error": "Uso: song_processor.py <url> <titulo> <artista> [carpeta] [text_templates_json]"}, ensure_ascii=False))
        return 1

    url = sys.argv[1]
    titulo = sys.argv[2]
    artista = sys.argv[3]
    out_dir = sys.argv[4] if len(sys.argv) > 4 else "./descargas"
    text_templates = []

    if len(sys.argv) > 5:
        try:
            parsed = json.loads(sys.argv[5])
            if isinstance(parsed, list):
                text_templates = [str(v).strip() for v in parsed if str(v).strip()]
        except Exception:
            text_templates = []

    song_file, err = download_youtube_mp3(url, out_dir)
    if err:
        sys.stderr.write(json.dumps({"error": err}, ensure_ascii=False))
        sys.exit(1)

    pistas, err = build_hints(song_file, titulo, artista, text_templates)
    if err:
        sys.stderr.write(json.dumps({"error": err}, ensure_ascii=False))
        sys.exit(1)

    print(json.dumps({
        "exito": True,
        "titulo": titulo,
        "artista": artista,
        "archivo_mp3": song_file,
        "pistas": pistas,
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
