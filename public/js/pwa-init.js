// PWA Registration and Initialization
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
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
