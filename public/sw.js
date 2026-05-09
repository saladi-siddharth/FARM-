const CACHE_NAME = 'farm-central-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/login.html',
    '/inventory.html',
    '/tasks.html',
    '/expenses.html',
    '/community.html',
    '/css/premium-theme.css',
    '/css/mobile-core.css',
    '/js/mobile-nav.js',
    '/js/toast.js',
    '/js/language-manager.js',
    '/favicon.svg',
    '/logo.png'
];

// Install Event - Cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch Event - Serve from cache if offline, otherwise network
self.addEventListener('fetch', (event) => {
    // Only intercept GET requests for HTTP/HTTPS
    if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

    // For API requests, try network first, then cache
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match(event.request);
            })
        );
        return;
    }

    // For static assets, try cache first, then network
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then((networkResponse) => {
                    // Don't cache if not a valid response
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }
                    
                    // Clone response to cache it and serve it
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                        
                    return networkResponse;
                }).catch(() => {
                    // If both cache and network fail (offline), fallback to index/dashboard
                    if (event.request.url.includes('.html')) {
                        return caches.match('/dashboard.html');
                    }
                });
            })
    );
});
