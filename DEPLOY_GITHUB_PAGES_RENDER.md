# Deploy: GitHub Pages (frontend) + Render (backend)

## 1) Backend en Render

1. Sube este repo a GitHub.
2. En Render crea un **Web Service** conectado al repo.
3. Configura:
- Build Command: `npm install`
- Start Command: `npm start`
4. Variables de entorno recomendadas:
- `ALLOWED_ORIGINS`: `https://TU_USUARIO.github.io`

Render asignara una URL tipo:
- `https://tu-backend.onrender.com`

## 2) Frontend en GitHub Pages

1. Activa GitHub Pages en el repo (Settings -> Pages).
2. Publica desde branch (`main`) y carpeta (`/public`) o desde `gh-pages` segun tu flujo.
3. Define la API del frontend con uno de estos metodos:

### Metodo A (recomendado): localStorage
Abre la web y ejecuta en consola del navegador:

```js
localStorage.setItem('apiBaseUrl', 'https://tu-backend.onrender.com');
location.reload();
```

### Metodo B: variable global
Antes de cargar `js/env.js`, define:

```html
<script>window.__API_BASE__ = 'https://tu-backend.onrender.com';</script>
```

## 3) Verificacion rapida

- Inicio carga configuracion sin errores.
- Editor avanzado abre datasets y guarda.
- Leaderboard y marcadores funcionan.
- Audio de voces se descarga desde backend.

## Notas

- En local (`localhost`) no necesitas configurar nada: usa rutas relativas como hasta ahora.
- Si cambias la URL del backend, actualiza `localStorage.apiBaseUrl`.
