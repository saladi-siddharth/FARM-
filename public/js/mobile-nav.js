/**
 * Farm Central — Mobile Bottom Navigation & Hamburger Menu
 * Premium mobile-first navigation system
 */
(function () {
    // 1. Inject CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'css/mobile-core.css';
    document.head.appendChild(link);

    // 2. Define Navigation Items with better SVG icons
    const navItems = [
        {
            name: 'Home',
            icon: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>',
            url: 'dashboard.html'
        },
        {
            name: 'Market',
            icon: '<line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line>',
            url: 'market.html'
        },
        {
            name: 'Scan',
            icon: '<circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>',
            url: 'satellite.html'
        },
        {
            name: 'Chat',
            icon: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>',
            url: 'chat.html'
        },
        {
            name: 'Profile',
            icon: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>',
            url: 'profile.html'
        }
    ];

    // 3. Create Nav Element
    const nav = document.createElement('nav');
    nav.id = 'mobile-bottom-nav';
    nav.setAttribute('aria-label', 'Mobile navigation');

    // 4. Generate Links with proper active detection
    const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';

    navItems.forEach(item => {
        const pageName = item.url.replace('.html', '');
        const isActive = currentPath.includes(pageName);

        const a = document.createElement('a');
        a.href = item.url;
        a.className = `nav-item ${isActive ? 'active' : ''}`;
        a.setAttribute('aria-label', item.name);

        // Add haptic-like feedback on touch
        a.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.9)';
        }, { passive: true });
        a.addEventListener('touchend', function() {
            this.style.transform = '';
        }, { passive: true });

        a.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" 
                 stroke="currentColor" stroke-width="${isActive ? '2.5' : '2'}" 
                 stroke-linecap="round" stroke-linejoin="round">
                ${item.icon}
            </svg>
            <span>${item.name}</span>
        `;
        nav.appendChild(a);
    });

    // 5. Append to Body
    document.body.appendChild(nav);

    // 6. Don't add a spacer div, padding is handled by CSS

    // ============================================
    // 7. HAMBURGER MENU (for landing/login pages)
    // ============================================
    const isLandingOrLogin = currentPath === '' || currentPath === 'index.html' || currentPath === 'login.html';

    // Find the top navigation bar
    const topNav = document.querySelector('nav.fixed, #main-nav');
    if (topNav) {
        // Check if trigger already exists
        let hamburger = document.getElementById('mobile-trigger') || topNav.querySelector('.mobile-menu-btn');
        
        if (!hamburger) {
            const navFlex = topNav.querySelector('.flex.items-center.gap-2, .flex.items-center.gap-3, .flex.items-center.gap-4, .flex.gap-2, .flex.gap-3, .flex.gap-4');
            if (navFlex) {
                // Create hamburger button
                hamburger = document.createElement('button');
                hamburger.className = 'mobile-menu-btn';
                hamburger.id = 'mobile-trigger';
                hamburger.setAttribute('aria-label', 'Open menu');
                hamburger.innerHTML = '<span></span><span></span><span></span>';
                navFlex.appendChild(hamburger);
            }
        }

        if (hamburger) {
            // Create overlay
            const overlay = document.createElement('div');
            overlay.className = 'mobile-menu-overlay';
            document.body.appendChild(overlay);

            // Create slide-out panel
            const panel = document.createElement('div');
            panel.className = 'mobile-menu-panel';

            // Close button
            const closeBtn = document.createElement('button');
            closeBtn.className = 'mobile-menu-close';
            closeBtn.innerHTML = '✕';
            panel.appendChild(closeBtn);

            // Logo
            const logoDiv = document.createElement('div');
            logoDiv.style.cssText = 'display:flex; align-items:center; gap:10px; padding:8px 16px; margin-bottom:16px;';
            logoDiv.innerHTML = `
                <img src="logo.png" alt="Logo" style="width:32px;height:32px;object-fit:contain;">
                <span style="font-size:16px;font-weight:900;color:#fff;letter-spacing:-0.5px;font-family:'Outfit',sans-serif;">FARM CENTRAL</span>
            `;
            panel.appendChild(logoDiv);

            // Divider
            const divider = document.createElement('div');
            divider.style.cssText = 'height:1px;background:rgba(255,255,255,0.08);margin:0 0 12px 0;';
            panel.appendChild(divider);

            const menuItems = [
                { icon: '🏠', text: 'Home', href: 'index.html' },
                { icon: '🚀', text: 'Dashboard', href: 'dashboard.html', action: 'enterDashboard' },
                { icon: '🛰️', text: 'Satellite Scan', href: 'satellite.html' },
                { icon: '📦', text: 'Inventory', href: 'inventory.html' },
                { icon: '📈', text: 'Market Data', href: 'market.html' },
                { icon: '💬', text: 'Community', href: 'community.html' },
                { icon: '💰', text: 'Expenses', href: 'expenses.html' },
                { icon: '🤝', text: 'Trade Hub', href: 'trading.html' },
            ];

            const role = localStorage.getItem('role');
            if (role === 'admin') {
                menuItems.push({ icon: '🛡️', text: 'Admin Control', href: 'admin.html' });
            }

            menuItems.forEach(item => {
                const a = document.createElement('a');
                a.href = item.href;
                a.innerHTML = `<span style="font-size:18px;">${item.icon}</span> ${item.text}`;
                if (item.action) {
                    a.onclick = function(e) {
                        e.preventDefault();
                        if (typeof window[item.action] === 'function') {
                            window[item.action]();
                        } else {
                            // Fallback: check token
                            const t = localStorage.getItem('token');
                            window.location.href = t ? 'dashboard.html' : 'login.html';
                        }
                    };
                }
                panel.appendChild(a);
            });

            // Divider before login
            const divider2 = document.createElement('div');
            divider2.style.cssText = 'height:1px;background:rgba(255,255,255,0.08);margin:12px 0;';
            panel.appendChild(divider2);

            // Login/Logout button
            const token = localStorage.getItem('token');
            const authBtn = document.createElement('a');
            if (token) {
                authBtn.href = '#';
                authBtn.innerHTML = '<span style="font-size:18px;">🛑</span> Logout';
                authBtn.style.color = '#f87171';
                authBtn.onclick = function(e) {
                    e.preventDefault();
                    localStorage.clear();
                    window.location.href = 'index.html';
                };
            } else {
                authBtn.href = 'login.html';
                authBtn.innerHTML = '<span style="font-size:18px;">🔑</span> Login / Sign Up';
                authBtn.style.cssText = 'background:linear-gradient(135deg,#10b981,#06b6d4);color:#fff;border-radius:14px;font-weight:700;';
            }
            panel.appendChild(authBtn);

            document.body.appendChild(panel);

            // Toggle handlers
            function openMenu() {
                overlay.classList.add('active');
                panel.classList.add('active');
                document.body.style.overflow = 'hidden';
            }

            function closeMenu() {
                overlay.classList.remove('active');
                panel.classList.remove('active');
                document.body.style.overflow = '';
            }

            hamburger.addEventListener('click', openMenu);
            closeBtn.addEventListener('click', closeMenu);
            overlay.addEventListener('click', closeMenu);

            // Close on escape
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') closeMenu();
            });
        }
    }

    // ─── Auto-inject Command Palette & PWA on every page ───
    function injectGlobalScript(src) {
        if (!document.querySelector(`script[src="${src}"]`)) {
            const s = document.createElement('script');
            s.src = src;
            s.defer = true;
            document.body.appendChild(s);
        }
    }
    injectGlobalScript('js/command-palette.js');
    injectGlobalScript('js/pwa-init.js');
})();
