/**
 * ⌘K / Ctrl+K — Global Command Palette
 * Enterprise-grade instant search across the entire platform.
 * Features: fuzzy search, keyboard navigation, recent actions, smart shortcuts.
 */
(function () {
    'use strict';

    const COMMANDS = [
        // Navigation
        { id: 'dashboard', icon: '🏠', label: 'Dashboard', desc: 'Main command center', action: () => nav('dashboard.html'), tags: 'home main overview' },
        { id: 'market', icon: '📊', label: 'Market Intelligence', desc: 'Real-time mandi prices & news', action: () => nav('market.html'), tags: 'price mandi commodity' },
        { id: 'trading', icon: '🤝', label: 'Trade Hub', desc: 'Buy & sell crops', action: () => nav('trading.html'), tags: 'buy sell listing order' },
        { id: 'satellite', icon: '🛰️', label: 'Satellite Scanner', desc: 'NASA-powered farm analysis', action: () => nav('satellite.html'), tags: 'ndvi map field scan' },
        { id: 'doctor', icon: '🩺', label: 'AI Crop Doctor', desc: 'Instant disease diagnosis', action: () => nav('doctor.html'), tags: 'disease diagnosis plant health' },
        { id: 'chat', icon: '💬', label: 'Farm Chat', desc: 'Message other farmers', action: () => nav('chat.html'), tags: 'message dm contact' },
        { id: 'community', icon: '🌍', label: 'Community Forum', desc: 'Connect with farmers globally', action: () => nav('community.html'), tags: 'forum post social' },
        { id: 'inventory', icon: '📦', label: 'Inventory Hub', desc: 'Manage your stock', action: () => nav('inventory.html'), tags: 'stock storage warehouse' },
        { id: 'expenses', icon: '💸', label: 'Financial Tracker', desc: 'Track income & expenses', action: () => nav('expenses.html'), tags: 'money finance budget' },
        { id: 'calculator', icon: '🧮', label: 'ROI Calculator', desc: 'Profit & loss projection', action: () => nav('calculator.html'), tags: 'profit loss calculate' },
        { id: 'calendar', icon: '📅', label: 'Crop Calendar', desc: 'Plan planting seasons', action: () => nav('calendar.html'), tags: 'schedule plan date' },
        { id: 'tasks', icon: '📋', label: 'Farm Chores', desc: 'Daily operations scheduler', action: () => nav('tasks.html'), tags: 'todo task checklist' },
        { id: 'reports', icon: '📂', label: 'Medical Reports', desc: 'AI diagnosis history', action: () => nav('reports.html'), tags: 'history scan report' },
        { id: 'profile', icon: '👤', label: 'My Profile', desc: 'Account settings & KYC', action: () => nav('profile.html'), tags: 'account settings user' },
        { id: 'kyc', icon: '🛡️', label: 'KYC Verification', desc: 'Verify your identity', action: () => nav('kyc.html'), tags: 'verify aadhaar pan identity' },
        { id: 'payouts', icon: '💰', label: 'Earnings & Payouts', desc: 'Wallet & payout history', action: () => nav('payouts.html'), tags: 'wallet money withdraw' },
        { id: 'disputes', icon: '⚖️', label: 'Dispute Center', desc: 'File & track disputes', action: () => nav('disputes.html'), tags: 'complaint issue refund' },
        // Quick Actions
        { id: 'logout', icon: '🚪', label: 'Logout', desc: 'Sign out of Farm Central', action: () => { localStorage.clear(); nav('index.html'); }, tags: 'signout exit' },
        { id: 'theme', icon: '🎨', label: 'Toggle Theme', desc: 'Switch light/dark mode', action: () => document.body.classList.toggle('light-mode'), tags: 'dark light mode' },
    ];

    function nav(url) { window.location.href = url; }

    let isOpen = false;
    let selectedIdx = 0;
    let filteredCmds = [...COMMANDS];

    function createPalette() {
        // Backdrop
        const backdrop = document.createElement('div');
        backdrop.id = 'cmd-backdrop';
        backdrop.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);display:none;align-items:flex-start;justify-content:center;padding-top:min(15vh,120px);opacity:0;transition:opacity 0.2s ease';
        backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closePalette(); });

        // Container
        const container = document.createElement('div');
        container.id = 'cmd-palette';
        container.style.cssText = 'width:95%;max-width:580px;background:rgba(15,23,42,0.95);border:1px solid rgba(255,255,255,0.1);border-radius:20px;box-shadow:0 25px 60px rgba(0,0,0,0.5),0 0 40px rgba(99,102,241,0.1);overflow:hidden;transform:scale(0.95) translateY(-10px);transition:transform 0.25s cubic-bezier(0.16,1,0.3,1),opacity 0.2s;opacity:0;font-family:"Inter","Outfit",sans-serif';

        // Search header
        container.innerHTML = `
            <div style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;gap:12px">
                <span style="color:#6366f1;font-size:18px">⌘</span>
                <input id="cmd-input" type="text" placeholder="Search commands, pages, actions..." autocomplete="off" spellcheck="false"
                    style="flex:1;background:none;border:none;outline:none;color:#f8fafc;font-size:15px;font-weight:500;font-family:inherit;letter-spacing:-0.01em">
                <kbd style="padding:3px 8px;border-radius:6px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#64748b;font-size:10px;font-weight:700;font-family:monospace">ESC</kbd>
            </div>
            <div id="cmd-results" style="max-height:360px;overflow-y:auto;padding:8px"></div>
            <div style="padding:10px 20px;border-top:1px solid rgba(255,255,255,0.05);display:flex;justify-content:space-between;align-items:center">
                <div style="display:flex;gap:8px;align-items:center">
                    <kbd style="padding:2px 6px;border-radius:4px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);color:#64748b;font-size:9px;font-family:monospace">↑↓</kbd>
                    <span style="color:#475569;font-size:10px;font-weight:600">Navigate</span>
                </div>
                <div style="display:flex;gap:8px;align-items:center">
                    <kbd style="padding:2px 6px;border-radius:4px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);color:#64748b;font-size:9px;font-family:monospace">↵</kbd>
                    <span style="color:#475569;font-size:10px;font-weight:600">Open</span>
                </div>
                <span style="color:#334155;font-size:9px;font-weight:700;letter-spacing:0.5px">FARM CENTRAL</span>
            </div>
        `;

        backdrop.appendChild(container);
        document.body.appendChild(backdrop);

        // Wire up search
        const input = document.getElementById('cmd-input');
        input.addEventListener('input', () => {
            const q = input.value.toLowerCase().trim();
            filteredCmds = q ? COMMANDS.filter(c =>
                c.label.toLowerCase().includes(q) ||
                c.desc.toLowerCase().includes(q) ||
                c.tags.includes(q)
            ) : [...COMMANDS];
            selectedIdx = 0;
            renderResults();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); selectedIdx = Math.min(selectedIdx + 1, filteredCmds.length - 1); renderResults(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIdx = Math.max(selectedIdx - 1, 0); renderResults(); }
            else if (e.key === 'Enter' && filteredCmds[selectedIdx]) { e.preventDefault(); filteredCmds[selectedIdx].action(); closePalette(); }
            else if (e.key === 'Escape') closePalette();
        });
    }

    function renderResults() {
        const container = document.getElementById('cmd-results');
        if (!container) return;
        container.innerHTML = filteredCmds.map((cmd, i) => `
            <div data-idx="${i}" style="padding:10px 14px;border-radius:12px;display:flex;align-items:center;gap:14px;cursor:pointer;transition:background 0.15s;
                ${i === selectedIdx ? 'background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.2)' : 'background:transparent;border:1px solid transparent'}"
                onmouseenter="this.style.background='rgba(255,255,255,0.04)'" onmouseleave="this.style.background='${i === selectedIdx ? 'rgba(99,102,241,0.12)' : 'transparent'}'">
                <span style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;
                    ${i === selectedIdx ? 'background:rgba(99,102,241,0.2);box-shadow:0 0 10px rgba(99,102,241,0.1)' : 'background:rgba(255,255,255,0.04)'}">${cmd.icon}</span>
                <div style="flex:1;min-width:0">
                    <div style="color:${i === selectedIdx ? '#c7d2fe' : '#e2e8f0'};font-weight:700;font-size:13px;letter-spacing:-0.01em">${cmd.label}</div>
                    <div style="color:#64748b;font-size:11px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${cmd.desc}</div>
                </div>
                ${i === selectedIdx ? '<span style="color:#818cf8;font-size:10px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase">Open →</span>' : ''}
            </div>
        `).join('') || '<div style="padding:40px;text-align:center;color:#475569;font-size:13px;font-weight:600">No results found</div>';

        // Click handlers
        container.querySelectorAll('[data-idx]').forEach(el => {
            el.addEventListener('click', () => { const idx = parseInt(el.dataset.idx); if (filteredCmds[idx]) { filteredCmds[idx].action(); closePalette(); } });
        });

        // Scroll selected into view
        const selected = container.querySelector(`[data-idx="${selectedIdx}"]`);
        if (selected) selected.scrollIntoView({ block: 'nearest' });
    }

    function openPalette() {
        const bd = document.getElementById('cmd-backdrop');
        if (!bd) return;
        isOpen = true;
        selectedIdx = 0;
        filteredCmds = [...COMMANDS];
        bd.style.display = 'flex';
        requestAnimationFrame(() => {
            bd.style.opacity = '1';
            const p = document.getElementById('cmd-palette');
            p.style.opacity = '1'; p.style.transform = 'scale(1) translateY(0)';
        });
        renderResults();
        setTimeout(() => document.getElementById('cmd-input')?.focus(), 50);
    }

    function closePalette() {
        const bd = document.getElementById('cmd-backdrop');
        const p = document.getElementById('cmd-palette');
        if (!bd) return;
        isOpen = false;
        bd.style.opacity = '0';
        p.style.opacity = '0'; p.style.transform = 'scale(0.95) translateY(-10px)';
        setTimeout(() => { bd.style.display = 'none'; const input = document.getElementById('cmd-input'); if (input) input.value = ''; }, 250);
    }

    // Global keyboard shortcut
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); isOpen ? closePalette() : openPalette(); }
        if (e.key === 'Escape' && isOpen) closePalette();
    });

    // Initialize when DOM is ready
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', createPalette);
    else createPalette();

    // Custom scrollbar for results
    const style = document.createElement('style');
    style.textContent = '#cmd-results::-webkit-scrollbar{width:4px}#cmd-results::-webkit-scrollbar-track{background:transparent}#cmd-results::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:4px}';
    document.head.appendChild(style);
})();
