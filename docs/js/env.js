/* ==========================================
   ENV.JS - Frontend API base resolver
   ========================================== */

(function initApiEnv() {
  var host = (window.location && window.location.hostname) || '';
  var isGithubPages = /github\.io$/i.test(host);

  // Priority:
  // 1) window.__API_BASE__
  // 2) localStorage.apiBaseUrl
  // 3) same-origin (default for local dev)
  var fromWindow = (typeof window.__API_BASE__ === 'string') ? window.__API_BASE__.trim() : '';
  var fromStorage = '';
  try {
    fromStorage = (localStorage.getItem('apiBaseUrl') || '').trim();
  } catch (_) {
    fromStorage = '';
  }

  var fallback = isGithubPages ? '' : '';
  var base = fromWindow || fromStorage || fallback;

  if (base.endsWith('/')) {
    base = base.slice(0, -1);
  }

  window.API_BASE = base;

  window.apiUrl = function apiUrl(path) {
    if (!path) return window.API_BASE || '';
    if (/^https?:\/\//i.test(path)) return path;
    if (window.API_BASE) return window.API_BASE + path;
    return path;
  };

  window.apiFetch = function apiFetch(path, options) {
    return fetch(window.apiUrl(path), options);
  };

  // Transparent compatibility layer for existing code using fetch('/api/...') and fetch('/audio/...')
  var originalFetch = window.fetch.bind(window);
  window.fetch = function patchedFetch(input, init) {
    if (!window.API_BASE) {
      return originalFetch(input, init);
    }

    if (typeof input === 'string') {
      if (input.indexOf('/api/') === 0 || input.indexOf('/audio/') === 0) {
        return originalFetch(window.apiUrl(input), init);
      }
      return originalFetch(input, init);
    }

    if (input && typeof input.url === 'string') {
      var url = input.url;
      if (url.indexOf('/api/') === 0 || url.indexOf('/audio/') === 0) {
        return originalFetch(window.apiUrl(url), init);
      }
    }

    return originalFetch(input, init);
  };
})();
