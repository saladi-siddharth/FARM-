const CACHE_NAME = 'farm-central-v2';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/login.html',
    '/dashboard.html',
    '/manifest.json',
    '/favicon.svg',
    '/logo.png',
    '/css/premium-theme.css',
    '/js/toast.js',
    '/js/mobile-nav.js',
    '/js/pwa-init.js'
];

// Install — cache critical assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate — clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// Fetch — Network-first for API, Cache-first for assets
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // API calls — Network first, fallback to cache
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Cache successful API responses for 5 minutes
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME + '-api').then(cache => {
                            cache.put(request, clone);
                        });
                    }
                    return response;
                })
                .catch(() => caches.match(request).then(r => r || new Response(
                    JSON.stringify({ error: 'Offline', offline: true }),
                    { headers: { 'Content-Type': 'application/json' } }
                )))
        );
        return;
    }

    // Static assets — Cache first, fallback to network
    event.respondWith(
        caches.match(request).then(cached => {
            if (cached) return cached;
            return fetch(request).then(response => {
                // Cache new static assets on the fly
                if (response.ok && (
                    url.pathname.endsWith('.html') ||
                    url.pathname.endsWith('.css') ||
                    url.pathname.endsWith('.js') ||
                    url.pathname.endsWith('.svg') ||
                    url.pathname.endsWith('.png')
                )) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                }
                return response;
            }).catch(() => {
                // Offline fallback for HTML pages
                if (request.headers.get('accept')?.includes('text/html')) {
                    return caches.match('/dashboard.html');
                }
            });
        })
    );
});
