let deferredPrompt;

// We do NOT hide the buttons anymore. They stay visible as per senior developer's best practices.
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('Native PWA prompt captured.');
});

window.addEventListener('appinstalled', (event) => {
    console.log('App successfully installed.');
    deferredPrompt = null;
    toast.success('Welcome to the Farm Central Mobile Ecosystem!');
});

async function installPWA() {
    // 1. If native prompt is available, use it (Chrome/Android/Edge)
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User choice: ${outcome}`);
        deferredPrompt = null;
        return;
    }

    // 2. Fallback: Show a premium "How to Install" guide (Critical for iOS Safari)
    showInstallGuide();
}

function showInstallGuide() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    let guideHtml = '';
    if (isIOS) {
        guideHtml = `
            <div class="text-left space-y-4">
                <p class="text-slate-300">To install on your iPhone:</p>
                <div class="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                    <span class="text-xl">1.</span>
                    <span>Tap the <b>'Share'</b> icon (square with upward arrow) at the bottom.</span>
                </div>
                <div class="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                    <span class="text-xl">2.</span>
                    <span>Scroll down and select <b>'Add to Home Screen'</b>.</span>
                </div>
            </div>
        `;
    } else {
        guideHtml = `
            <div class="text-left space-y-4">
                <p class="text-slate-300">To install on your desktop/laptop:</p>
                <div class="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                    <span class="text-xl">1.</span>
                    <span>Look for the <b>Install Icon</b> (computer with arrow) in your browser's address bar.</span>
                </div>
                <div class="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                    <span class="text-xl">2.</span>
                    <span>Alternatively, open browser settings (three dots) and select <b>'Install Farm Central'</b>.</span>
                </div>
            </div>
        `;
    }

    // Create Temporary Modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300';
    modal.innerHTML = `
        <div class="glass-premium p-8 rounded-[2.5rem] max-w-md w-full border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.2)] animate-in zoom-in-95 duration-300">
            <div class="flex justify-between items-start mb-6">
                <div>
                    <h2 class="text-2xl font-black text-white">Install App</h2>
                    <p class="text-emerald-400 text-sm font-bold uppercase tracking-widest">Premium Mobile Experience</p>
                </div>
                <button onclick="this.closest('div.fixed').remove()" class="text-slate-500 hover:text-white transition">✕</button>
            </div>
            ${guideHtml}
            <button onclick="this.closest('div.fixed').remove()" class="w-full mt-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl shadow-lg transition transform hover:scale-[1.02]">
                Got it!
            </button>
        </div>
    `;
    document.body.appendChild(modal);
}

// Network Status Detection
function updateNetworkStatus() {
    // Check if we are running in the standalone "Installed" app
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    // If in standalone mode (the app), hide install buttons to avoid redundancy
    const installBtns = document.querySelectorAll('.pwa-install-btn');
    const installSections = document.querySelectorAll('section:has(.pwa-install-btn)'); // Hero sections or special install sections

    if (isStandalone) {
        installBtns.forEach(btn => btn.style.display = 'none');
        installSections.forEach(sec => sec.style.display = 'none');
        console.log('Running as installed Web App: Hiding download options.');
    }

    const isOnline = navigator.onLine;
    let statusEl = document.getElementById('network-status-indicator');

    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'network-status-indicator';
        statusEl.className = 'fixed top-4 right-4 z-[60] px-4 py-2 rounded-full text-xs font-bold transition-all duration-500 flex items-center gap-2 shadow-2xl';
        document.body.appendChild(statusEl);
    }

    if (isOnline) {
        statusEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> SYSTEM ONLINE';
        statusEl.className = 'fixed top-4 right-4 z-[60] px-4 py-2 rounded-full text-xs font-bold transition-all duration-500 flex items-center gap-2 shadow-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 translate-y-[-100px] opacity-0';
    } else {
        statusEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span> OFFLINE MODE (STABLE)';
        statusEl.className = 'fixed top-4 right-4 z-[60] px-4 py-2 rounded-full text-xs font-bold transition-all duration-500 flex items-center gap-2 shadow-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 translate-y-0 opacity-100';
    }
}

window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);
document.addEventListener('DOMContentLoaded', updateNetworkStatus);

// Global access
window.triggerPWAInstall = installPWA;
