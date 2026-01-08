// Minimal Service Worker to satisfy PWA requirements
self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
    // Simple pass-through for now, can be enhanced for offline support later
    e.respondWith(fetch(e.request));
});
