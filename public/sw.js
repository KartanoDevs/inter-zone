// Service worker mínimo. Existe para que Chrome ofrezca instalar InterZone (su criterio de
// instalabilidad exige un service worker con handler de `fetch` que responda sin conexión),
// no para usar la aplicación sin conexión: eso está fuera de alcance a propósito (ADR 0041).
//
// A propósito NO cachea los bundles con hash ni index.html. Un service worker que precachea
// deja la aplicación congelada en la versión del último despliegue que vio; aquí el único
// objeto en caché es una página estática que no cambia nunca.

const CACHE = 'interzone-shell-v1';
const SIN_CONEXION = 'offline.html';

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(SIN_CONEXION, { cache: 'reload' })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((clave) => clave !== CACHE).map((clave) => caches.delete(clave))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  // Solo las navegaciones. Todo lo demás (bundles, iconos, /api) va a la red sin
  // intermediarios: las cabeceras de caché de nginx ya hacen el trabajo.
  if (evento.request.mode !== 'navigate') {
    return;
  }
  evento.respondWith(fetch(evento.request).catch(() => caches.match(SIN_CONEXION)));
});
