/* PipePro Service Worker — offline caching */
const CACHE = 'pipepro-v10';
const CDN_CACHE = 'pipepro-cdn-v10';

const LOCAL = [
  './PipePro.html',
  './pipepro-data.js',
  './pipepro-iso.js',
  './pipepro-tabs.jsx',
  './pipepro-sheet.jsx',
  './pipepro-draw.jsx',
  './pipepro-valve.jsx',
  './tweaks-panel.jsx',
  './help.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-apple.png',
  './assets/logo-chrome.jpg',
];

const CDN = [
  'https://unpkg.com/react@18.3.1/umd/react.development.js',
  'https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone@7.29.0/babel.min.js',
  'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(LOCAL.map(u => new Request(u, {cache:'reload'}))))
      .catch(() => {}) // don't fail install if an asset 404s
      .then(() => caches.open(CDN_CACHE))
      .then(c => c.addAll(CDN))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== CDN_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const local = url.origin === self.location.origin;

  if (local) {
    // Stale-while-revalidate for local files: instant from cache, refresh in background.
    // cache:'no-cache' forces revalidation with the server — without it the refresh can
    // read the browser's HTTP cache and re-store the same stale copy forever.
    e.respondWith(
      caches.match(e.request).then(hit => {
        const net = fetch(e.request, {cache: 'no-cache'}).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        }).catch(() => hit || new Response('Offline', {status: 503}));
        return hit || net;
      })
    );
  } else {
    // Network-first for CDN (React, Babel, Fonts) — cache as fallback
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CDN_CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  }
});
