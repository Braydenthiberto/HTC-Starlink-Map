// HTC Signal — offline service worker
const SHELL_CACHE = 'htc-shell-v2';
const TILE_CACHE  = 'htc-tiles';
const FONT_CACHE  = 'htc-fonts-v1';

const SHELL = [
  './', 'index.html', 'manifest.json',
  'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'htc-logo.png'
];

const TILE_HOST = 'server.arcgisonline.com';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => ![SHELL_CACHE, TILE_CACHE, FONT_CACHE].includes(k)).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// cache-first with network fallback, storing into `cacheName`
async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const resp = await fetch(req);
    cache.put(req, resp.clone());
    return resp;
  } catch (err) {
    const alt = await cache.match(req);
    if (alt) return alt;
    return new Response('', { status: 504 });
  }
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.hostname === TILE_HOST) { e.respondWith(cacheFirst(req, TILE_CACHE)); return; }
  if (FONT_HOSTS.includes(url.hostname)) { e.respondWith(cacheFirst(req, FONT_CACHE)); return; }

  // App shell (same-origin): cache-first so it launches offline
  if (url.origin === self.location.origin) {
    e.respondWith((async () => {
      const cache = await caches.open(SHELL_CACHE);
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      try {
        const resp = await fetch(req);
        if (resp.ok) cache.put(req, resp.clone());
        return resp;
      } catch (err) {
        const shell = await cache.match('index.html');
        return shell || new Response('Offline', { status: 504 });
      }
    })());
  }
});
