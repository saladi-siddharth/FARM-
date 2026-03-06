const CACHE_NAME = 'farm-central-v2';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/login.html',
    '/market.html',
    '/doctor.html',
    '/inventory.html',
    '/calculator.html',
    '/community.html',
    '/expenses.html',
    '/tasks.html',
    '/calendar.html',
    '/profile.html',
    '/trading.html',
    '/chat.html',
    '/reports.html',
    '/manifest.json',
    '/favicon.svg',
    '/css/premium-theme.css',
    '/css/mobile-core.css',
    '/css/mobile-animations.css',
    '/js/toast.js',
    '/js/language-manager.js',
    '/js/global-ticker.js',
    '/js/mobile-nav.js',
    '/js/ai-core.js',
    '/js/pwa-install.js',
    '/js/background-3d.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache to store essential assets');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

self.addEventListener('fetch', event => {
    // Only cache GET requests
    if (event.request.method !== 'GET') return;

    // Skip cross-origin or API caching for now to avoid stale data
    if (!event.request.url.startsWith(self.location.origin) || event.request.url.includes('/api/')) return;

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                return fetch(event.request).then(
                    function (response) {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response because the response stream can only be read once
                        var responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then(function (cache) {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    }
                );
            })
    );
});

// Clean up old caches
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
