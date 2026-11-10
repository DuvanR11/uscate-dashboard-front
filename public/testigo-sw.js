// Plan hacia la versión estable, Fase 5 (2026-11-10): service worker de la
// pantalla del testigo (`/testigo`), con alcance solo en esa ruta. Guarda la
// pantalla y sus archivos para abrirla sin señal si ya se abrió antes con
// sesión. No guarda nada de la API (otro dominio): los datos y la cola de
// reportes los maneja la página en IndexedDB.
const VERSION = 'testigo-v1';
const SHELL = '/testigo';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.add(new Request(SHELL, { credentials: 'same-origin' })))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Solo lo del mismo panel: la API va siempre por la red.
  if (url.origin !== self.location.origin) return;

  // La pantalla: primero la red (con sesión vigente), y sin señal la copia.
  if (request.mode === 'navigate') {
    if (!url.pathname.startsWith(SHELL)) return;
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Una redirección (sesión vencida) no reemplaza la copia buena.
          if (response.ok && !response.redirected) {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put(SHELL, copy));
          }
          return response;
        })
        .catch(() => caches.match(SHELL).then((cached) => cached || Response.error())),
    );
    return;
  }

  // Archivos del panel con nombre fijo por versión: primero la copia.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/brand/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(VERSION).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
