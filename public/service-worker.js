// Self-Purging Service Worker (Force Clears all mobile & desktop caches)
self.addEventListener('install', event => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.map(k => caches.delete(k)))
        ).then(() => {
            return self.registration.unregister();
        }).then(() => {
            return self.clients.claim();
        }).then(() => {
            return self.clients.matchAll().then(clients => {
                clients.forEach(client => client.navigate(client.url));
            });
        })
    );
});

// Always fetch directly from network — never serve stale cache
self.addEventListener('fetch', event => {
    event.respondWith(fetch(event.request, { cache: 'no-store' }).catch(() => caches.match(event.request)));
});
