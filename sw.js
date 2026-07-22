const CACHE_NAME = 'scholarsync-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/pdf-word.js',
  '/compressor.js',
  '/student-utils.js',
  '/pptx.js',
  '/ats.js',
  '/simplifier.js',
  '/icon.jpg'
];

// Install Event
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching files...');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache...', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// Fetch Event (Cache-first with network fallback)
self.addEventListener('fetch', (e) => {
  // Only intercept standard http/https schemes (ignore chrome-extension, etc.)
  if (e.request.url.startsWith(self.location.origin)) {
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(e.request).then((response) => {
          // If response is valid, clone and put in cache
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, responseClone);
            });
          }
          return response;
        });
      }).catch(() => {
        // Offline fallback if needed
      })
    );
  }
});
