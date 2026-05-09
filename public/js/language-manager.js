// ═══════════════════════════════════════════════════════════════════
// FARM CENTRAL — GLOBAL AUTO-TRANSLATION ENGINE
// ═══════════════════════════════════════════════════════════════════

function injectGoogleTranslate() {
    // Hidden container for Google Translate
    const div = document.createElement('div');
    div.id = "google_translate_element";
    div.style.display = "none";
    document.body.appendChild(div);

    const script = document.createElement('script');
    script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    document.body.appendChild(script);

    window.googleTranslateElementInit = function() {
        new google.translate.TranslateElement({
            pageLanguage: 'en',
            includedLanguages: 'hi,te,es,ml,ta,mr,gu,pa,or,bn,en',
            autoDisplay: false
        }, 'google_translate_element');
    };

    // Hide Google's ugly top bar via CSS
    const style = document.createElement('style');
    style.innerHTML = `
        body { top: 0 !important; }
        .skiptranslate, .goog-te-banner-frame { display: none !important; }
        #goog-gt-tt { display: none !important; }
        .goog-tooltip { display: none !important; }
        .goog-tooltip:hover { display: none !important; }
        .goog-text-highlight { background-color: transparent !important; border: none !important; box-shadow: none !important; }
    `;
    document.head.appendChild(style);
}

function setLanguage(lang) {
    if (!lang) return;
    
    // Set Google Translate cookie
    // Format: /pageLanguage/targetLanguage
    if (lang === 'en') {
        document.cookie = "googtrans=/en/en; path=/; domain=" + window.location.hostname;
        document.cookie = "googtrans=/en/en; path=/";
    } else {
        document.cookie = "googtrans=/en/" + lang + "; path=/; domain=" + window.location.hostname;
        document.cookie = "googtrans=/en/" + lang + "; path=/";
    }

    localStorage.setItem('farm_lang', lang);
    
    // Show premium loading spinner before reload
    if (typeof toast !== 'undefined') {
        toast.success('🌐 Applying Language...');
    }
    
    setTimeout(() => {
        window.location.reload();
    }, 800);
}

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
    injectGoogleTranslate();

    // Sync custom dropdowns with saved language
    const savedLang = localStorage.getItem('farm_lang') || 'en';
    const langSelects = document.querySelectorAll('select');
    langSelects.forEach(select => {
        if (select.innerHTML.includes('Hindi') || select.innerHTML.includes('Telugu')) {
            select.value = savedLang;
            select.setAttribute('onchange', 'changeAppLanguage(this.value)');
        }
    });
});

window.changeAppLanguage = setLanguage;
