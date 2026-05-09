// ═══════════════════════════════════════════════════════════════════
// FARM CENTRAL — SMART DASHBOARD ENGINE & LIVE WEATHER ALERTS
// ═══════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    initWeatherEngine();
    initOnboardingTour();
});

// --- 1. LIVE WEATHER ALERTS ENGINE ---
async function initWeatherEngine() {
    console.log("🌦️ Initializing Live Weather Engine...");
    
    // Default coords (Central India) if GPS fails
    let lat = 20.59;
    let lon = 78.96;

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                lat = pos.coords.latitude;
                lon = pos.coords.longitude;
                fetchWeatherData(lat, lon);
            },
            (err) => {
                console.warn("GPS Denied/Failed, using default coordinates.");
                fetchWeatherData(lat, lon);
            }
        );
    } else {
        fetchWeatherData(lat, lon);
    }
}

async function fetchWeatherData(lat, lon) {
    try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const data = await res.json();
        
        const temp = data.current_weather.temperature;
        const wind = data.current_weather.windspeed;
        const code = data.current_weather.weathercode;

        document.getElementById('weather-temp').innerText = `${temp}°C`;
        document.getElementById('weather-wind').innerText = `Wind: ${wind} km/h`;

        const weatherMap = { 
            0: '☀️ Clear Sky', 1: '🌤️ Mainly Clear', 2: '⛅ Partly Cloudy', 3: '☁️ Overcast', 
            45: '🌫️ Fog', 48: '🌫️ Freezing Fog', 51: '🌧️ Light Drizzle', 53: '🌧️ Drizzle', 
            55: '🌧️ Heavy Drizzle', 61: '🌧️ Light Rain', 63: '🌧️ Rain', 65: '🌧️ Heavy Rain', 
            71: '❄️ Light Snow', 73: '❄️ Snow', 75: '❄️ Heavy Snow', 77: '❄️ Snow Grains',
            80: '🌦️ Rain Showers', 81: '🌦️ Heavy Showers', 82: '⛈️ Violent Showers',
            95: '⛈️ Thunderstorm', 96: '⛈️ Thunderstorm + Hail', 99: '⛈️ Severe Hailstorm'
        };

        const desc = weatherMap[code] || "Clear";
        document.getElementById('weather-desc').innerText = desc;

        // --- SEVERE WEATHER ALERT SYSTEM ---
        // Severe codes: 65 (Heavy Rain), 75 (Heavy Snow), 82 (Violent Showers), 95, 96, 99 (Thunderstorms/Hail)
        const severeCodes = [65, 75, 82, 95, 96, 99];
        
        if (severeCodes.includes(code)) {
            showSevereWeatherAlert(desc);
        } else if (temp > 40) {
            showSevereWeatherAlert(`Extreme Heat Warning (${temp}°C)`);
        } else if (temp < 0) {
            showSevereWeatherAlert(`Frost / Freeze Warning (${temp}°C)`);
        }

    } catch (e) {
        console.error("Weather Engine failed:", e);
    }
}

function showSevereWeatherAlert(warningType) {
    // Check if user dismissed it recently (within 12 hours)
    const lastDismissed = localStorage.getItem('weatherAlertDismissed');
    if (lastDismissed && (Date.now() - parseInt(lastDismissed)) < 12 * 60 * 60 * 1000) {
        return;
    }

    const alertHtml = `
        <div id="severe-weather-alert" class="bg-red-500/20 border border-red-500/50 rounded-2xl p-4 mb-6 flex items-start gap-4 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.3)]">
            <div class="text-3xl">⚠️</div>
            <div class="flex-1">
                <h3 class="text-red-400 font-black tracking-widest text-sm uppercase mb-1">Severe Weather Alert</h3>
                <p class="text-white font-medium text-sm">Critical conditions detected: <span class="font-bold text-red-300">${warningType}</span>. Please secure livestock and protect sensitive crops.</p>
            </div>
            <button onclick="dismissWeatherAlert()" class="text-slate-400 hover:text-white transition">✕</button>
        </div>
    `;

    // Insert alert at the top of the dashboard content
    const container = document.querySelector('main .max-w-7xl');
    if (container) {
        container.insertAdjacentHTML('afterbegin', alertHtml);
    }
}

window.dismissWeatherAlert = function() {
    const alert = document.getElementById('severe-weather-alert');
    if (alert) {
        alert.style.opacity = '0';
        setTimeout(() => alert.remove(), 300);
        localStorage.setItem('weatherAlertDismissed', Date.now().toString());
    }
};

// --- 2. INTERACTIVE ONBOARDING TOUR ---
function initOnboardingTour() {
    const tourCompleted = localStorage.getItem('tourCompleted');
    if (!tourCompleted) {
        // Wait for dashboard to fully load
        setTimeout(startTour, 1500);
    }
}

function startTour() {
    // Add backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'tour-backdrop';
    backdrop.className = 'fixed inset-0 bg-black/80 z-[100] transition-opacity duration-500';
    document.body.appendChild(backdrop);

    const steps = [
        {
            title: "Welcome to Farm Central! 🚜",
            text: "Let's take a quick 30-second tour of your new smart farming command center.",
            target: null // Center screen
        },
        {
            title: "Financial Overview 💰",
            text: "Here you can track your total revenue, expenses, and calculate ROI in real-time.",
            target: ".grid-cols-2" // The stats grid
        },
        {
            title: "Live Weather Engine 🌦️",
            text: "Real-time, GPS-based weather tracking with automatic severe weather alerts.",
            target: ".bg-gradient-to-br.from-cyan-900" // Weather card
        },
        {
            title: "Smart Navigation 🧭",
            text: "Access the NASA Satellite Scanner, AI Crop Doctor, and Global Trading Market from the bottom bar.",
            target: "#mobile-bottom-nav" // Mobile nav or sidebar
        }
    ];

    let currentStep = 0;

    const tooltip = document.createElement('div');
    tooltip.id = 'tour-tooltip';
    tooltip.className = 'fixed z-[101] bg-white text-slate-900 p-6 rounded-2xl shadow-2xl max-w-sm transition-all duration-500 scale-95 opacity-0';
    document.body.appendChild(tooltip);

    function renderStep() {
        if (currentStep >= steps.length) {
            endTour();
            return;
        }

        const step = steps[currentStep];
        
        // Reset old highlights
        document.querySelectorAll('.tour-highlight').forEach(el => {
            el.classList.remove('tour-highlight', 'relative', 'z-[102]', 'ring-4', 'ring-emerald-400', 'bg-slate-900/50');
        });

        // Setup new highlight
        let targetEl = null;
        if (step.target) {
            targetEl = document.querySelector(step.target);
            if (targetEl) {
                targetEl.classList.add('tour-highlight', 'relative', 'z-[102]', 'ring-4', 'ring-emerald-400', 'bg-slate-900/50', 'rounded-2xl', 'transition-all');
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        // Render Tooltip Content
        tooltip.innerHTML = `
            <h3 class="text-xl font-black mb-2 text-emerald-600">${step.title}</h3>
            <p class="text-slate-600 font-medium mb-6 leading-relaxed">${step.text}</p>
            <div class="flex justify-between items-center">
                <span class="text-xs font-bold text-slate-400 tracking-widest">${currentStep + 1} / ${steps.length}</span>
                <div class="flex gap-2">
                    <button id="tour-skip" class="text-xs font-bold text-slate-400 hover:text-slate-600 px-3 py-2">SKIP</button>
                    <button id="tour-next" class="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black tracking-widest px-5 py-3 rounded-xl shadow-lg shadow-emerald-500/30 transition transform hover:scale-105">${currentStep === steps.length - 1 ? "FINISH" : "NEXT →"}</button>
                </div>
            </div>
        `;

        // Position tooltip
        setTimeout(() => {
            if (targetEl) {
                const rect = targetEl.getBoundingClientRect();
                const isMobile = window.innerWidth < 768;
                
                if (isMobile) {
                    tooltip.style.top = '50%';
                    tooltip.style.left = '50%';
                    tooltip.style.transform = 'translate(-50%, -50%) scale(1)';
                } else {
                    tooltip.style.top = `${Math.max(20, rect.bottom + 20)}px`;
                    tooltip.style.left = `${Math.max(20, rect.left)}px`;
                    tooltip.style.transform = 'scale(1)';
                }
            } else {
                tooltip.style.top = '50%';
                tooltip.style.left = '50%';
                tooltip.style.transform = 'translate(-50%, -50%) scale(1)';
            }
            tooltip.classList.remove('opacity-0');
        }, 300);

        // Bind events
        document.getElementById('tour-next').onclick = () => {
            tooltip.classList.add('opacity-0');
            setTimeout(() => {
                currentStep++;
                renderStep();
            }, 300);
        };
        document.getElementById('tour-skip').onclick = endTour;
    }

    function endTour() {
        backdrop.style.opacity = '0';
        tooltip.style.opacity = '0';
        document.querySelectorAll('.tour-highlight').forEach(el => {
            el.classList.remove('tour-highlight', 'relative', 'z-[102]', 'ring-4', 'ring-emerald-400', 'bg-slate-900/50', 'rounded-2xl', 'transition-all');
        });
        setTimeout(() => {
            backdrop.remove();
            tooltip.remove();
        }, 500);
        localStorage.setItem('tourCompleted', 'true');
    }

    // Start
    renderStep();
}
