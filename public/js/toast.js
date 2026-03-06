/**
 * Farm Central — Toast Notification System
 * Replaces all alert() calls with beautiful animated toasts
 */
(function () {
    // Create toast container
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 99999;
        display: flex; flex-direction: column; gap: 12px;
        pointer-events: none; max-width: 420px; width: calc(100% - 40px);
    `;
    document.body.appendChild(container);

    // Style injection
    const style = document.createElement('style');
    style.textContent = `
        .farm-toast {
            pointer-events: auto;
            display: flex; align-items: flex-start; gap: 12px;
            padding: 16px 20px; border-radius: 16px;
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05);
            color: #f1f5f9; font-family: 'Outfit','Inter',sans-serif;
            font-size: 14px; line-height: 1.5;
            animation: toastSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            transition: all 0.3s ease;
            position: relative; overflow: hidden;
        }
        .farm-toast.removing {
            animation: toastSlideOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .farm-toast .toast-icon { font-size: 20px; flex-shrink: 0; margin-top: 1px; }
        .farm-toast .toast-body { flex: 1; }
        .farm-toast .toast-title { font-weight: 700; font-size: 15px; margin-bottom: 2px; }
        .farm-toast .toast-msg { opacity: 0.8; font-size: 13px; }
        .farm-toast .toast-close {
            flex-shrink: 0; cursor: pointer; opacity: 0.4;
            font-size: 18px; line-height: 1; padding: 2px 4px;
            transition: opacity 0.2s;
        }
        .farm-toast .toast-close:hover { opacity: 1; }
        .farm-toast .toast-progress {
            position: absolute; bottom: 0; left: 0; height: 3px;
            border-radius: 0 0 16px 16px;
            animation: toastProgress var(--toast-duration, 3s) linear forwards;
        }
        .farm-toast.success { border-left: 4px solid #10b981; }
        .farm-toast.success .toast-progress { background: #10b981; }
        .farm-toast.error { border-left: 4px solid #ef4444; }
        .farm-toast.error .toast-progress { background: #ef4444; }
        .farm-toast.warning { border-left: 4px solid #f59e0b; }
        .farm-toast.warning .toast-progress { background: #f59e0b; }
        .farm-toast.info { border-left: 4px solid #3b82f6; }
        .farm-toast.info .toast-progress { background: #3b82f6; }

        @keyframes toastSlideIn {
            from { transform: translateX(120%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes toastSlideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(120%); opacity: 0; }
        }
        @keyframes toastProgress {
            from { width: 100%; }
            to { width: 0%; }
        }
    `;
    document.head.appendChild(style);

    const ICONS = {
        success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️'
    };
    const TITLES = {
        success: 'Success', error: 'Error', warning: 'Warning', info: 'Info'
    };

    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - 'success' | 'error' | 'warning' | 'info'
     * @param {number} duration - Auto-dismiss in ms (default 3500)
     */
    window.showToast = function (message, type = 'info', duration = 3500) {
        const toast = document.createElement('div');
        toast.className = `farm-toast ${type}`;
        toast.style.setProperty('--toast-duration', `${duration}ms`);
        toast.innerHTML = `
            <span class="toast-icon">${ICONS[type] || ICONS.info}</span>
            <div class="toast-body">
                <div class="toast-title">${TITLES[type] || 'Notice'}</div>
                <div class="toast-msg">${message}</div>
            </div>
            <span class="toast-close" onclick="this.parentElement.classList.add('removing'); setTimeout(() => this.parentElement.remove(), 300)">&times;</span>
            <div class="toast-progress"></div>
        `;
        container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.add('removing');
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
    };

    // Convenience helpers
    window.toast = {
        success: (msg, dur) => showToast(msg, 'success', dur),
        error: (msg, dur) => showToast(msg, 'error', dur),
        warning: (msg, dur) => showToast(msg, 'warning', dur),
        info: (msg, dur) => showToast(msg, 'info', dur)
    };
})();
