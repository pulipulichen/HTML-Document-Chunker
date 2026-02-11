const CACHE_NAME = 'html-chunker-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/styles.css',
  './js/scripts.js',
  './manifest.json',
  './assets/favicon/favicon.png',
  './assets/favicon/apple-touch-icon.png',
  './lib/jszip.min.js',
  './lib/pdf.min.js',
  './lib/mammoth.browser.min.js',
  './lib/xlsx.full.min.js',
  './lib/tailwindcss.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
