const CACHE_NAME = 'farm-central-v4';
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
    '/satellite.html',
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
    '/js/background-3d.js',
    '/js/smart-dashboard.js'
];

// API URLs to cache for offline use (Network-first, then cache)
const API_CACHE_NAME = 'farm-central-api-v1';

self.addEventListener('install', event => {
    self.skipWaiting(); // Force activate immediately
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching app shell...');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // API requests: Network-first strategy (try network, fall back to cache)
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Clone and cache successful API responses
                    if (response.ok) {
                        const cloned = response.clone();
                        caches.open(API_CACHE_NAME).then(cache => {
                            cache.put(event.request, cloned);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Network failed — try cache
                    return caches.match(event.request).then(cached => {
                        if (cached) return cached;
                        // Return empty JSON response for offline
                        return new Response(JSON.stringify({ offline: true, error: 'You are offline' }), {
                            headers: { 'Content-Type': 'application/json' }
                        });
                    });
                })
        );
        return;
    }

    // Skip cross-origin requests
    if (!url.origin.startsWith(self.location.origin)) return;

    // Static assets: Cache-first strategy
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) return response;

                return fetch(event.request).then(response => {
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                    return response;
                });
            })
    );
});

// Clean up old caches
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME, API_CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take control of all pages immediately
    );
});
