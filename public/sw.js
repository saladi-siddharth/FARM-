const CACHE_NAME = 'farm-central-v3-fresh';

// Install — activate immediately
self.addEventListener('install', event => {
    self.skipWaiting();
});

// Activate — clean ALL previous caches immediately
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// Fetch — Network-first for ALL requests to ensure fresh content
self.addEventListener('fetch', event => {
    const { request } = event;
    if (request.method !== 'GET') return;

    event.respondWith(
        fetch(request)
            .then(response => {
                return response;
            })
            .catch(() => {
                return caches.match(request);
            })
    );
});
