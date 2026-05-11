// PWA Registration and Initialization
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
                
                // Check for updates
                registration.onupdatefound = () => {
                    const installingWorker = registration.installing;
                    if (installingWorker == null) return;
                    
                    installingWorker.onstatechange = () => {
                        if (installingWorker.state === 'installed') {
                            if (navigator.serviceWorker.controller) {
                                // New content is available; please refresh.
                                console.log('New content is available; please refresh.');
                                if (typeof toast !== 'undefined') {
                                    toast.info('New update available! Reloading...', 3000);
                                    setTimeout(() => window.location.reload(), 2000);
                                } else {
                                    window.location.reload();
                                }
                            } else {
                                // Content is cached for offline use.
                                console.log('Content is cached for offline use.');
                            }
                        }
                    };
                };
            }, (err) => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

// Add manifest to head dynamically if not present
if (!document.querySelector('link[rel="manifest"]')) {
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = '/manifest.json';
    document.head.appendChild(manifestLink);
}

// Add theme color meta
if (!document.querySelector('meta[name="theme-color"]')) {
    const themeMeta = document.createElement('meta');
    themeMeta.name = 'theme-color';
    themeMeta.content = '#10b981';
    document.head.appendChild(themeMeta);
}
