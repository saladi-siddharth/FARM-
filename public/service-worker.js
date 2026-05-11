const CACHE_NAME = 'farm-central-v5';
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

// API URLs to cache for offline use
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

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

    const url = new URL(event.request.url);

    // 1. API requests or HTML pages: Network-First strategy
    // We want the latest version of data and pages if online
    if (url.pathname.includes('/api/') || url.pathname.endsWith('.html') || url.pathname === '/') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Clone and cache successful responses
                    if (response && response.status === 200 && response.type === 'basic') {
                        const responseToCache = response.clone();
                        const targetCache = url.pathname.includes('/api/') ? API_CACHE_NAME : CACHE_NAME;
                        caches.open(targetCache).then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Fallback to cache if offline
                    return caches.match(event.request);
                })
        );
        return;
    }

    // 2. Static assets (CSS, JS, Images): Cache-First strategy
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) return response;

                return fetch(event.request).then(networkResponse => {
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                    return networkResponse;
                });
            })
    );
});
