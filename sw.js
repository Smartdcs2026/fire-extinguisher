const CACHE_NAME = 'fire-extinguisher-cache-v1';

const CORE_ASSETS = [
  '/fire-extinguisher/',
  '/fire-extinguisher/index.html',
  '/fire-extinguisher/check.html',
  '/fire-extinguisher/qrcode.html',
  '/fire-extinguisher/report.html',
  '/fire-extinguisher/css/styles.css',
  '/fire-extinguisher/js/config.js',
  '/fire-extinguisher/js/api.js',
  '/fire-extinguisher/js/utils.js',
  '/fire-extinguisher/js/scanner.js',
  '/fire-extinguisher/manifest.json',
  '/fire-extinguisher/icons/icon-192.png',
  '/fire-extinguisher/icons/icon-512.png',
  '/fire-extinguisher/icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CORE_ASSETS).catch(() => null);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (!url.pathname.startsWith('/fire-extinguisher/')) return;

  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request).then(cached => {
        return cached || caches.match('/fire-extinguisher/index.html');
      });
    })
  );
});
