/**
 * ============================================================
 * FARM CENTRAL NATURAL SCROLL CINEMA ENGINE
 * ============================================================
 * Clean, natural frame sequencing with:
 * - High-resolution natural agricultural photography
 * - Preloader with progress counter
 * - Canvas crossfade blending between adjacent frames
 * - Clear, user-friendly feature chapter overlays
 * - Smooth scroll & progress rail indicator
 * ============================================================
 */

(function () {
    'use strict';

    // ── 9 NATURAL AGRICULTURAL FRAMES ──
    const FRAME_SOURCES = [
        'frames/frame_01_sky.jpg',            // 01: Dawn sky above farmlands
        'frames/frame_02_aerial.jpg',         // 02: Aerial plantation panorama
        'frames/frame_03_grove.jpg',          // 03: Walking through green banana canopy
        'frames/frame_04_fruit.jpg',          // 04: Golden bananas with morning dew
        'frames/frame_05_harvest.jpg',        // 05: Farmer's hands holding harvest
        'frames/frame_06_water.jpg',          // 06: Precision drip irrigation water droplets
        'frames/frame_07_harvest_crates.jpg', // 07: Fresh harvest in wooden crates (Marketplace feature)
        'frames/frame_08_sapling.jpg',        // 08: Young banana sapling in fertile soil (Soil & Crop Care feature)
        'frames/frame_09_sunset.jpg'          // 09: Sunset plantation horizon
    ];

    // Chapter definitions: [elementId, startPct, peakPct, endPct, railLabel]
    const CHAPTERS = [
        ['chapter-eyebrow',      0.00, 0.06, 0.11,  'I · Atmosphere'],
        ['chapter-brand',        0.12, 0.18, 0.24,  'II · Plantation'],
        ['chapter-plantation',   0.25, 0.31, 0.37,  'III · The Canopy'],
        ['chapter-harvest',      0.38, 0.44, 0.49,  'IV · The Harvest'],
        ['chapter-craft',        0.50, 0.56, 0.61,  'V · Farmer Craft'],
        ['chapter-science',      0.62, 0.67, 0.71,  'VI · Water Care'],
        ['chapter-marketplace',  0.72, 0.77, 0.81,  'VII · Marketplace'],
        ['chapter-soilhealth',   0.82, 0.86, 0.89,  'VIII · Soil & Health'],
        ['chapter-closing',      0.90, 0.95, 1.00,  'IX · Horizon']
    ];

    // ── STATE ──
    let images = [];
    let canvas, ctx;
    let isReady = false;
    let lenis = null;

    // ── PRELOADER ──
    function preloadImages(sources) {
        return new Promise((resolve) => {
            const loaded = [];
            let count = 0;
            const fill = document.getElementById('loader-fill');
            const pct = document.getElementById('loader-pct');

            sources.forEach((src, i) => {
                const img = new Image();
                img.onload = img.onerror = () => {
                    loaded[i] = img;
                    count++;
                    const percent = Math.round((count / sources.length) * 100);
                    if (fill) fill.style.width = percent + '%';
                    if (pct) pct.textContent = percent + '%';
                    if (count === sources.length) {
                        resolve(loaded);
                    }
                };
                img.src = src;
            });
        });
    }

    // ── CANVAS DRAWING WITH CROSSFADE ──
    function drawFrame(progress) {
        if (!isReady || !ctx || images.length === 0) return;

        const totalFrames = images.length;
        const rawIndex = progress * (totalFrames - 1);
        const frameA = Math.floor(rawIndex);
        const frameB = Math.min(frameA + 1, totalFrames - 1);
        const blend = rawIndex - frameA;

        const cw = canvas.width;
        const ch = canvas.height;

        function coverFit(img) {
            const iw = img.naturalWidth || img.width;
            const ih = img.naturalHeight || img.height;
            const imgRatio = iw / ih;
            const canvasRatio = cw / ch;
            let dw, dh, dx, dy;
            if (imgRatio > canvasRatio) {
                dh = ch;
                dw = ch * imgRatio;
                dx = (cw - dw) / 2;
                dy = 0;
            } else {
                dw = cw;
                dh = cw / imgRatio;
                dx = 0;
                dy = (ch - dh) / 2;
            }
            return [dx, dy, dw, dh];
        }

        ctx.clearRect(0, 0, cw, ch);

        // Base frame
        if (images[frameA] && images[frameA].complete) {
            ctx.globalAlpha = 1;
            const [dx, dy, dw, dh] = coverFit(images[frameA]);
            ctx.drawImage(images[frameA], dx, dy, dw, dh);
        }

        // Crossfade to next frame
        if (blend > 0.001 && images[frameB] && images[frameB].complete && frameB !== frameA) {
            ctx.globalAlpha = blend;
            const [dx, dy, dw, dh] = coverFit(images[frameB]);
            ctx.drawImage(images[frameB], dx, dy, dw, dh);
        }

        ctx.globalAlpha = 1;
    }

    // ── CHAPTER VISIBILITY ──
    function updateChapters(progress) {
        CHAPTERS.forEach(([id, start, peak, end]) => {
            const el = document.getElementById(id);
            if (!el) return;

            let opacity = 0;
            if (progress >= start && progress <= end) {
                if (progress < peak) {
                    opacity = (progress - start) / (peak - start);
                } else {
                    opacity = 1 - (progress - peak) / (end - peak);
                }
                opacity = Math.max(0, Math.min(1, opacity));
            }

            el.style.opacity = opacity;
            const card = el.querySelector('.chapter-card');
            if (card) {
                const yOffset = (1 - opacity) * 16;
                card.style.transform = `translateY(${yOffset}px)`;
            }
        });

        // Update rail label
        const railLabel = document.getElementById('cinema-rail-label');
        if (railLabel) {
            let currentLabel = '';
            for (const [, start, , end, label] of CHAPTERS) {
                if (progress >= start && progress <= end) {
                    currentLabel = label;
                    break;
                }
            }
            railLabel.textContent = currentLabel;
        }

        // Update rail fill
        const railFill = document.getElementById('cinema-rail-fill');
        if (railFill) {
            railFill.style.height = (progress * 100) + '%';
        }

        // Hide scroll hint after initial scroll
        const hint = document.getElementById('cinema-scroll-hint');
        if (hint) {
            if (progress > 0.03) {
                hint.classList.add('hidden');
            } else {
                hint.classList.remove('hidden');
            }
        }
    }

    // ── SCROLL HANDLER ──
    function onScroll() {
        const section = document.getElementById('cinema-section');
        if (!section) return;

        const rect = section.getBoundingClientRect();
        const sectionHeight = section.offsetHeight - window.innerHeight;
        const scrolled = -rect.top;
        const progress = Math.max(0, Math.min(1, scrolled / (sectionHeight || 1)));

        drawFrame(progress);
        updateChapters(progress);
    }

    // ── RESIZE HANDLER ──
    function onResize() {
        if (!canvas) return;
        canvas.width = window.innerWidth * Math.min(window.devicePixelRatio, 2);
        canvas.height = window.innerHeight * Math.min(window.devicePixelRatio, 2);
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        onScroll();
    }

    // ── LENIS SMOOTH SCROLL ──
    function initLenis() {
        if (typeof Lenis === 'undefined') {
            window.addEventListener('scroll', onScroll, { passive: true });
            return;
        }

        lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            orientation: 'vertical',
            smoothWheel: true,
        });

        lenis.on('scroll', onScroll);

        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
    }

    // ── INITIALIZE ──
    async function init() {
        canvas = document.getElementById('cinema-canvas');
        if (!canvas) return;

        ctx = canvas.getContext('2d');
        onResize();
        window.addEventListener('resize', onResize);

        images = await preloadImages(FRAME_SOURCES);
        isReady = true;

        drawFrame(0);
        updateChapters(0);

        const loader = document.getElementById('cinema-loader');
        if (loader) {
            setTimeout(() => {
                loader.classList.add('hide');
                setTimeout(() => loader.remove(), 900);
            }, 300);
        }

        initLenis();
        if (!lenis) {
            window.addEventListener('scroll', onScroll, { passive: true });
        }
        onScroll();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
