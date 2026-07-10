const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');

const tailwindConfigScript = `
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        base: 'var(--bg-base)',
                        surface: 'var(--bg-surface)',
                        card: 'var(--bg-card)',
                        heading: 'var(--text-heading)',
                        body: 'var(--text-body)',
                        muted: 'var(--text-muted)',
                        border_color: 'var(--border-color)',
                        inverse: 'var(--inverse-color)'
                    }
                }
            }
        }
    </script>
    <script src="https://cdn.tailwindcss.com"></script>
`;

// Toggle button HTML to inject in navbar before the mobile menu button
const themeToggleBtn = `
                <button id="theme-toggle" class="p-2 rounded-full border border-inverse/10 bg-inverse/5 hover:bg-inverse/10 transition flex items-center justify-center mr-2 z-[60] relative">
                    <span id="theme-icon-light" class="hidden">☀️</span>
                    <span id="theme-icon-dark">🌙</span>
                </button>
`;

const toggleLogicScript = `
    <script>
        // Theme Toggle Logic
        document.addEventListener('DOMContentLoaded', () => {
            const toggleBtn = document.getElementById('theme-toggle');
            const iconLight = document.getElementById('theme-icon-light');
            const iconDark = document.getElementById('theme-icon-dark');
            const htmlEl = document.documentElement;
            
            // Default to light theme as requested
            let isDark = localStorage.getItem('theme') === 'dark';
            
            const applyTheme = (dark) => {
                if (dark) {
                    htmlEl.classList.add('dark');
                    iconLight.classList.remove('hidden');
                    iconDark.classList.add('hidden');
                } else {
                    htmlEl.classList.remove('dark');
                    iconLight.classList.add('hidden');
                    iconDark.classList.remove('hidden');
                }
            };
            
            applyTheme(isDark);
            
            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => {
                    isDark = !isDark;
                    localStorage.setItem('theme', isDark ? 'dark' : 'light');
                    applyTheme(isDark);
                });
            }
        });
    </script>
`;

const htmlReplacements = [
    { from: /bg-\[#050505\]/g, to: 'bg-base' },
    { from: /bg-\[#090e17\]/g, to: 'bg-surface' },
    { from: /bg-\[#05080f\]/g, to: 'bg-surface' },
    { from: /bg-\[#0f172a\]/g, to: 'bg-card' },
    
    { from: /text-white/g, to: 'text-heading' },
    { from: /text-slate-300/g, to: 'text-body' },
    { from: /text-slate-400/g, to: 'text-muted' },
    { from: /text-slate-500/g, to: 'text-muted' },
    
    { from: /border-white\/10/g, to: 'border-border_color/10' },
    { from: /border-white\/5/g, to: 'border-border_color/5' },
    { from: /bg-white\/5/g, to: 'bg-inverse/5' },
    { from: /bg-white\/10/g, to: 'bg-inverse/10' },
    { from: /bg-white\/20/g, to: 'bg-inverse/20' },
    
    { from: /from-\[#090e17\]/g, to: 'from-surface' },
    { from: /to-\[#090e17\]/g, to: 'to-surface' },
    { from: /via-\[#090e17\]/g, to: 'via-surface' },
    { from: /to-\[#05080f\]/g, to: 'to-surface' },
    
    // Replace script tags
    { from: /<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>/g, to: tailwindConfigScript },
    
    // Replace hardcoded style tags targeting body background
    { from: /background-color: #050505;/g, to: 'background-color: var(--bg-base);' },
    { from: /color: #f8fafc;/g, to: 'color: var(--text-body);' },
    
    // Replace grid background inline style logic
    { from: /rgba\(255, 255, 255, 0.03\)/g, to: 'var(--grid-color)' },
];

function processHtmlFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'css' && file !== 'js' && file !== 'uploads') {
                processHtmlFiles(fullPath);
            }
        } else if (fullPath.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;
            
            htmlReplacements.forEach(rep => {
                if (rep.from.test(content)) {
                    content = content.replace(rep.from, rep.to);
                    modified = true;
                }
            });
            
            // Inject toggle button inside nav flex container
            if (content.includes('id="mobile-trigger"')) {
                content = content.replace(/<button class="mobile-menu-btn md:hidden/g, themeToggleBtn + '\n                <button class="mobile-menu-btn md:hidden');
                modified = true;
            }
            
            // Inject toggle script before closing body
            if (content.includes('</body>') && !content.includes('id="theme-toggle"')) {
                content = content.replace('</body>', toggleLogicScript + '\n</body>');
                modified = true;
            }
            
            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated HTML: ${file}`);
            }
        }
    }
}

processHtmlFiles(publicDir);

// Update premium-theme.css
const premiumCssPath = path.join(publicDir, 'css', 'premium-theme.css');
if (fs.existsSync(premiumCssPath)) {
    let css = fs.readFileSync(premiumCssPath, 'utf8');
    
    const rootVars = `
:root {
    --bg-base: #f8fafc;
    --bg-surface: #ffffff;
    --bg-card: #f1f5f9;
    --text-heading: #0f172a;
    --text-body: #334155;
    --text-muted: #64748b;
    --border-color: rgba(0, 0, 0, 1); /* will use /10 opacity in tailwind classes */
    --inverse-color: rgba(0, 0, 0, 1);
    --grid-color: rgba(0, 0, 0, 0.05);
    
    --glass-bg: rgba(255, 255, 255, 0.7);
    --glass-border: rgba(0, 0, 0, 0.1);
    --glass-shadow: rgba(0, 0, 0, 0.05);
    --glass-hover-bg: rgba(255, 255, 255, 0.9);
    --glass-hover-border: rgba(0, 0, 0, 0.15);
    --glass-hover-shadow: rgba(0, 0, 0, 0.1);
}

html.dark {
    --bg-base: #050505;
    --bg-surface: #090e17;
    --bg-card: #0f172a;
    --text-heading: #ffffff;
    --text-body: #cbd5e1;
    --text-muted: #94a3b8;
    --border-color: rgba(255, 255, 255, 1);
    --inverse-color: rgba(255, 255, 255, 1);
    --grid-color: rgba(255, 255, 255, 0.03);
    
    --glass-bg: rgba(15, 23, 42, 0.4);
    --glass-border: rgba(255, 255, 255, 0.05);
    --glass-shadow: rgba(0, 0, 0, 0.5);
    --glass-hover-bg: rgba(15, 23, 42, 0.6);
    --glass-hover-border: rgba(255, 255, 255, 0.15);
    --glass-hover-shadow: rgba(0, 0, 0, 0.7);
}
`;
    // Prepend variables
    css = rootVars + '\\n' + css;
    
    // Modify glass premium
    css = css.replace(/background:\s*rgba\(15,\s*23,\s*42,\s*0\.4\);/g, 'background: var(--glass-bg);');
    css = css.replace(/border:\s*1px solid rgba\(255,\s*255,\s*255,\s*0\.05\);/g, 'border: 1px solid var(--glass-border);');
    css = css.replace(/box-shadow:\s*0 8px 32px 0 rgba\(0,\s*0,\s*0,\s*0\.5\);/g, 'box-shadow: 0 8px 32px 0 var(--glass-shadow);');
    
    css = css.replace(/background:\s*rgba\(15,\s*23,\s*42,\s*0\.6\);/g, 'background: var(--glass-hover-bg);');
    css = css.replace(/border-color:\s*rgba\(255,\s*255,\s*255,\s*0\.15\);/g, 'border-color: var(--glass-hover-border);');
    css = css.replace(/box-shadow:\s*0 12px 48px 0 rgba\(0,\s*0,\s*0,\s*0\.7\);/g, 'box-shadow: 0 12px 48px 0 var(--glass-hover-shadow);');

    // Scrollbar
    css = css.replace(/background:\s*#0f172a;/g, 'background: var(--bg-card);');
    
    fs.writeFileSync(premiumCssPath, css, 'utf8');
    console.log('Updated premium-theme.css');
}

// Update mobile-core.css
const mobileCssPath = path.join(publicDir, 'css', 'mobile-core.css');
if (fs.existsSync(mobileCssPath)) {
    let css = fs.readFileSync(mobileCssPath, 'utf8');
    
    // Some hardcoded transparent colors
    css = css.replace(/background:\s*rgba\(9,\s*14,\s*23,\s*0\.92\);/g, 'background: var(--glass-bg);');
    css = css.replace(/background:\s*rgba\(9,\s*14,\s*23,\s*0\.97\);/g, 'background: var(--glass-bg);');
    css = css.replace(/color:\s*#cbd5e1;/g, 'color: var(--text-body);');
    css = css.replace(/color:\s*#fff;/g, 'color: var(--text-heading);');
    
    fs.writeFileSync(mobileCssPath, css, 'utf8');
    console.log('Updated mobile-core.css');
}

console.log('Theme implementation complete.');
