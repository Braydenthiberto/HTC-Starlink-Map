// HTC coverage map — offline tile cache
const TILE_CACHE = 'htc-tiles';
const TILE_HOST = 'server.arcgisonline.com';

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (url.indexOf(TILE_HOST) === -1) return; // only handle map tiles

  e.respondWith((async () => {
    const cache = await caches.open(TILE_CACHE);
    const hit = await cache.match(e.request);
    if (hit) return hit;                       // cache-first (works offline)
    try {
      const resp = await fetch(e.request);     // else fetch + cache for next time
      cache.put(e.request, resp.clone());
      return resp;
    } catch (err) {
      const alt = await cache.match(e.request);
      if (alt) return alt;
      return new Response('', { status: 504 }); // offline & not cached
    }
  })());
});
