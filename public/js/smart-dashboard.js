// ═══════════════════════════════════════════════════════════════════
// FARM CENTRAL — SMART DASHBOARD ENGINE
// AI Analytics, Voice Control, & Geo-Mapping
// ═══════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    generateAIReport();
    initVoiceAssistant();
});

// ═══════════════════════════════════════════════════════════════════
// 1. AI PREDICTIVE REPORT
// ═══════════════════════════════════════════════════════════════════
async function generateAIReport() {
    const reportContent = document.getElementById('ai-report-content');
    if (!reportContent) return;
    const token = localStorage.getItem('token');

    try {
        const response = await fetch('/api/ai/predictive-report', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success) {
            const r = data.report;
            reportContent.innerHTML = `
                <div class="space-y-4 animate-fade-in">
                    <div class="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                        <div class="text-3xl">🌾</div>
                        <div>
                            <p class="text-slate-400 text-xs font-bold uppercase">Yield Prediction</p>
                            <p class="text-emerald-400 font-black text-lg">${r.yield_prediction}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                        <div class="text-3xl">💹</div>
                        <div>
                            <p class="text-slate-400 text-xs font-bold uppercase">Financial Health</p>
                            <p class="text-blue-400 font-black text-lg">${r.financial_health} (${r.savings_potential} potential)</p>
                        </div>
                    </div>
                    <div class="bg-white/5 p-4 rounded-2xl border border-white/5">
                         <p class="text-slate-400 text-xs font-bold uppercase mb-3">Actionable Advice</p>
                         <ul class="space-y-2">
                            ${r.advice.map(a => `<li class="text-sm text-slate-200 flex items-start gap-2"><span>✅</span> ${a}</li>`).join('')}
                         </ul>
                    </div>
                    <p class="text-xs text-slate-500 italic mt-2">${r.summary}</p>
                </div>
            `;
        }
    } catch (err) {
        console.error("AI Report Failed:", err);
        if (reportContent) reportContent.innerHTML = `<p class="text-rose-400 text-sm">Failed to generate intelligence report. Please try again.</p>`;
    }
}

// ═══════════════════════════════════════════════════════════════════
// 2. PRECISION GEO-MAPPING
// ═══════════════════════════════════════════════════════════════════
let map;
function initMap() {
    const container = document.getElementById('map-container');
    if (!container) return;

    const farmCoords = [30.9010, 75.8573];

    map = L.map('map-container', {
        zoomControl: false,
        attributionControl: false
    }).setView(farmCoords, 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(map);

    const farmIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="width:40px;height:40px;background:rgba(16,185,129,0.8);border-radius:50%;border:4px solid white;box-shadow:0 4px 15px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:20px;">🏠</div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });

    L.marker(farmCoords, { icon: farmIcon }).addTo(map)
        .bindPopup("<b style='color:black'>My Field 01</b><br>Moisture: 64%<br>Soil pH: 6.8")
        .openPopup();
}

// ═══════════════════════════════════════════════════════════════════
// 3. VOICE-ENABLED AI ASSISTANT (Production-Grade)
//    Supports: 12 Indian Languages + Wake Word "Farm Central"
//    Architecture: Button-Click → Always-On Wake Word → Command Mode
// ═══════════════════════════════════════════════════════════════════

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let voiceState = 'IDLE'; // IDLE | WAKE_LISTENING | COMMAND_LISTENING
let wakeDetected = false;
let restartTimer = null;

const SUPPORTED_LANGS = [
    'en-IN', 'hi-IN', 'pa-IN', 'te-IN', 'ta-IN', 'mr-IN',
    'gu-IN', 'kn-IN', 'ml-IN', 'bn-IN', 'or-IN', 'ur-IN'
];

function getVoiceLang() {
    const browserLang = navigator.language || 'en-IN';
    return SUPPORTED_LANGS.includes(browserLang) ? browserLang : 'en-IN';
}

function initVoiceAssistant() {
    if (!SpeechRecognition) {
        console.warn('Speech Recognition not supported in this browser.');
        return;
    }
    console.log('🎙️ Voice Assistant initialized. Click the mic button or say "Farm Central" twice to activate.');
}

// ─── Start Listening for Wake Word ───
function startWakeWordListening() {
    if (!SpeechRecognition) return;
    if (recognition) {
        try { recognition.abort(); } catch (e) { }
    }
    clearTimeout(restartTimer);

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = getVoiceLang();
    recognition.maxAlternatives = 1;

    voiceState = 'WAKE_LISTENING';
    wakeDetected = false;
    let wakeCount = 0;
    let lastWakeTs = 0;

    recognition.onstart = () => {
        console.log('👂 Wake word listener active...');
        updateVoiceUI('listening');
    };

    recognition.onresult = (event) => {
        // Only check the latest result
        const latest = event.results[event.results.length - 1];
        const text = latest[0].transcript.toLowerCase().trim();
        console.log(`[Wake] Heard: "${text}"`);

        if (text.includes('farm central')) {
            const now = Date.now();
            if (now - lastWakeTs < 4000) {
                wakeCount++;
            } else {
                wakeCount = 1;
            }
            lastWakeTs = now;

            if (wakeCount >= 2 && !wakeDetected) {
                wakeDetected = true;
                console.log('✨ WAKE WORD ACTIVATED!');
                recognition.stop();

                // Check if there's a command after the wake words
                const parts = text.split('farm central');
                const trailingCommand = parts[parts.length - 1].trim();

                if (trailingCommand && trailingCommand.length > 3) {
                    speakAndProcess(trailingCommand);
                } else {
                    // Greet and switch to Command mode
                    speak("Yes Farmer, how can I help?");
                    if (typeof toast !== 'undefined') toast.info("🎙️ Yes, Farmer! Speak your command...");
                    setTimeout(() => startCommandListening(), 1500);
                }
            }
        }
    };

    recognition.onerror = (e) => {
        console.warn('Wake listener error:', e.error);
        if (e.error === 'aborted') return;
    };

    recognition.onend = () => {
        if (voiceState === 'WAKE_LISTENING' && !wakeDetected) {
            // Auto-restart wake word listener after a short delay
            restartTimer = setTimeout(() => {
                if (voiceState === 'WAKE_LISTENING') {
                    startWakeWordListening();
                }
            }, 300);
        }
    };

    try {
        recognition.start();
    } catch (e) {
        console.error('Failed to start wake word listener:', e);
    }
}

// ─── Start Listening for a Single Command ───
function startCommandListening() {
    if (!SpeechRecognition) return;
    if (recognition) {
        try { recognition.abort(); } catch (e) { }
    }
    clearTimeout(restartTimer);

    recognition = new SpeechRecognition();
    recognition.continuous = false; // Single utterance
    recognition.interimResults = false;
    recognition.lang = getVoiceLang();

    voiceState = 'COMMAND_LISTENING';
    updateVoiceUI('command');

    recognition.onstart = () => {
        console.log('🎯 Command listener active — speak now!');
    };

    recognition.onresult = (event) => {
        const command = event.results[0][0].transcript.trim();
        console.log(`[Command] Got: "${command}"`);
        if (command) {
            speakAndProcess(command);
        }
    };

    recognition.onerror = (e) => {
        console.warn('Command listener error:', e.error);
        if (typeof toast !== 'undefined') toast.error("Couldn't hear you. Try again.");
        voiceState = 'IDLE';
        updateVoiceUI('idle');
    };

    recognition.onend = () => {
        if (voiceState === 'COMMAND_LISTENING') {
            // Go back to wake word listening or idle
            voiceState = 'IDLE';
            updateVoiceUI('idle');
        }
    };

    try {
        recognition.start();
    } catch (e) {
        console.error('Failed to start command listener:', e);
    }
}

// ─── Process a Voice Command ───
async function speakAndProcess(text) {
    voiceState = 'IDLE';
    updateVoiceUI('processing');
    if (typeof toast !== 'undefined') toast.info(`Processing: "${text}"`);

    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/ai/voice-action', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ text, language: getVoiceLang() })
        });
        const data = await response.json();

        if (data.success) {
            const reply = data.response_text || "Done!";
            if (typeof toast !== 'undefined') toast.success(reply);
            speak(reply);

            if (data.intent !== 'CHAT') {
                setTimeout(generateAIReport, 2000);
            }
        } else {
            if (typeof toast !== 'undefined') toast.error(data.error || "Failed to process.");
        }
    } catch (err) {
        console.error("Voice processing failed:", err);
        if (typeof toast !== 'undefined') toast.error("Server connection failed.");
    }

    updateVoiceUI('idle');
}

// ─── Text-to-Speech ───
function speak(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); // Cancel any queued speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getVoiceLang();
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);
}

// ─── Toggle Button Handler (called from HTML onclick) ───
function toggleVoiceAssistant() {
    if (!SpeechRecognition) {
        if (typeof toast !== 'undefined') toast.error("Voice not supported. Use Chrome or Edge.");
        return;
    }

    if (voiceState === 'IDLE') {
        // First click → Start in direct command mode (skip wake word)
        speak("Yes Farmer, how can I help?");
        if (typeof toast !== 'undefined') toast.info("🎙️ Listening for your command...");
        setTimeout(() => startCommandListening(), 1200);
    } else if (voiceState === 'WAKE_LISTENING') {
        // Already listening for wake word, switch to command mode
        if (recognition) { try { recognition.abort(); } catch (e) { } }
        speak("I'm listening.");
        if (typeof toast !== 'undefined') toast.info("🎙️ Speak your command...");
        setTimeout(() => startCommandListening(), 1000);
    } else {
        // Currently in command/processing mode — stop everything
        if (recognition) { try { recognition.abort(); } catch (e) { } }
        voiceState = 'IDLE';
        updateVoiceUI('idle');
        if (typeof toast !== 'undefined') toast.info("Voice assistant stopped.");
    }
}

// ─── UI State Machine ───
function updateVoiceUI(state) {
    const btn = document.getElementById('voice-btn');
    const waves = document.getElementById('voice-waves');
    const status = document.getElementById('voice-status');
    if (!btn) return;

    // Reset all classes
    btn.classList.remove('animate-pulse', 'animate-bounce');
    if (waves) waves.classList.remove('scale-150', 'opacity-100');
    if (status) status.classList.remove('opacity-100', 'translate-y-0');

    switch (state) {
        case 'listening':
            btn.innerHTML = '👂';
            btn.style.background = 'linear-gradient(135deg, #0891b2, #3b82f6)';
            if (waves) waves.classList.add('scale-150', 'opacity-100');
            if (status) {
                status.textContent = 'Say "Farm Central" twice...';
                status.classList.add('opacity-100', 'translate-y-0');
            }
            break;
        case 'command':
            btn.innerHTML = '🎯';
            btn.classList.add('animate-pulse');
            btn.style.background = 'linear-gradient(135deg, #10b981, #06b6d4)';
            if (waves) waves.classList.add('scale-150', 'opacity-100');
            if (status) {
                status.textContent = 'Speak your command...';
                status.classList.add('opacity-100', 'translate-y-0');
            }
            break;
        case 'processing':
            btn.innerHTML = '⚡';
            btn.classList.add('animate-bounce');
            btn.style.background = 'linear-gradient(135deg, #f59e0b, #ef4444)';
            if (status) {
                status.textContent = 'Processing with AI...';
                status.classList.add('opacity-100', 'translate-y-0');
            }
            break;
        default: // 'idle'
            btn.innerHTML = '🎙️';
            btn.style.background = 'linear-gradient(135deg, #0891b2, #3b82f6)';
            break;
    }
}
