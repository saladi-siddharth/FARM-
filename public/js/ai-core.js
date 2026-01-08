class FarmVoiceAI {
    constructor() {
        this.recognition = null;
        this.isListening = false; // "Active" state (interacting)
        this.isStandby = false;   // "Standby" state (waiting for wake word)
        this.synth = window.speechSynthesis;
        this.ui = null;
        this.statusEl = null;
        this.transcriptEl = null;
        this.currentLang = 'en-IN';
        this.isProcessing = false;

        // Website Navigation Map
        this.navMap = {
            'dashboard': 'dashboard.html',
            'home': 'dashboard.html',
            'doctor': 'doctor.html',
            'crop doctor': 'doctor.html',
            'market': 'market.html',
            'news': 'market.html',
            'inventory': 'inventory.html',
            'stock': 'inventory.html',
            'tasks': 'tasks.html',
            'todo': 'tasks.html',
            'planner': 'calendar.html',
            'calendar': 'calendar.html',
            'chat': 'chat.html',
            'community': 'chat.html',
            'profile': 'profile.html',
            'settings': 'profile.html',
            'login': 'login.html',
            'logout': 'LOGOUT_ACTION',
            'trade': 'trading.html'
        };
    }

    init() {
        if (!('webkitSpeechRecognition' in window)) {
            console.error("Web Speech API not supported.");
            return;
        }
        this.createUI();
        this.createStandbyUI();

        this.recognition = new webkitSpeechRecognition();
        this.recognition.continuous = true; // Use continuous to catch wake word without stopping
        this.recognition.interimResults = true;
        this.recognition.lang = this.currentLang;

        this.recognition.onstart = () => {
            console.log("FarmAI: Listening Loop Started");
        };

        this.recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join('').toLowerCase();

            // Update UI if active
            if (this.isListening && this.transcriptEl) {
                // Get only the latest result for display to avoid clutter
                const latest = event.results[event.results.length - 1][0].transcript;
                this.transcriptEl.innerText = `"${latest}"`;
            }

            // Final Result Logic
            const lastResult = event.results[event.results.length - 1];
            if (lastResult.isFinal) {
                const command = lastResult[0].transcript.trim();
                console.log("Heard:", command);

                if (this.isListening) {
                    // Already active? Process command
                    this.processCommand(command);
                } else {
                    // In standby? Check for Wake Word
                    if (command.toLowerCase().includes('hello farm central') || command.toLowerCase().includes('hello farm') || command.toLowerCase().includes('farm central')) {
                        this.wakeUp();
                    }
                }
            }
        };

        this.recognition.onend = () => {
            // Auto-restart for "Always On" capability
            if (this.isStandby || this.isListening) {
                setTimeout(() => {
                    try { this.recognition.start(); } catch (e) { }
                }, 500);
            }
        };

        this.recognition.onerror = (event) => {
            console.warn("Speech Error:", event.error);
            if (event.error === 'not-allowed') {
                this.isStandby = false;
                this.updateStandbyVisuals();
            }
        };

        // Attempt to start in Standby Mode on load (might fail due to autoplay policy, user needs to click once)
        // We rely on the global mic button to "Enable" the AI for the session.
    }

    // --- STATES ---

    enableStandby() {
        this.isStandby = true;
        this.updateStandbyVisuals();
        try { this.recognition.start(); } catch (e) { }
        this.speak("Voice Assistant Activating. Say 'Hello Farm Central' to wake me up.");
    }

    wakeUp() {
        if (this.isListening) return;
        this.isListening = true;
        this.ui.classList.remove('hidden');
        document.getElementById('mic-pulse').classList.add('animate-ping');
        this.speak("I am listening. How can I help?", this.currentLang);
        this.updateStandbyVisuals();
    }

    goToSleep() {
        this.isListening = false;
        this.ui.classList.add('hidden');
        document.getElementById('mic-pulse').classList.remove('animate-ping');
        this.updateStandbyVisuals();
        // Stays in standby (loop continues)
    }

    // --- LOGIC ---

    async processCommand(cmd) {
        if (this.isProcessing) return;
        this.isProcessing = true;
        const lowerCmd = cmd.toLowerCase();

        // 1. Local Actions & Navigation
        if (lowerCmd.includes('exit') || lowerCmd.includes('close') || lowerCmd.includes('sleep') || lowerCmd.includes('stop')) {
            this.speak("Going to sleep.");
            this.goToSleep();
            this.isProcessing = false;
            return;
        }

        // Navigation
        if (lowerCmd.includes('go to') || lowerCmd.includes('open') || lowerCmd.includes('show')) {
            for (const [key, url] of Object.entries(this.navMap)) {
                if (lowerCmd.includes(key)) {
                    if (url === 'LOGOUT_ACTION') {
                        this.speak("Logging you out.");
                        localStorage.clear();
                        window.location.href = 'index.html';
                        return;
                    }
                    this.speak(`Opening ${key}.`);
                    setTimeout(() => window.location.href = url, 1000);
                    this.isProcessing = false;
                    return;
                }
            }
        }

        // Actions
        if (lowerCmd.includes('scroll down')) {
            window.scrollBy({ top: 500, behavior: 'smooth' });
            this.isProcessing = false;
            return;
        }
        if (lowerCmd.includes('scroll up')) {
            window.scrollBy({ top: -500, behavior: 'smooth' });
            this.isProcessing = false;
            return;
        }
        if (lowerCmd.includes('click')) {
            // Fuzzy clicker
            const words = lowerCmd.split(' ');
            const targetWord = words[words.indexOf('click') + 1];
            if (targetWord) {
                // Try to find a button or link with this text
                const elements = [...document.querySelectorAll('button, a')];
                const match = elements.find(el => el.innerText.toLowerCase().includes(targetWord));
                if (match) {
                    this.speak(`Clicking ${targetWord}.`);
                    match.click();
                    this.isProcessing = false;
                    return;
                }
            }
        }

        // 2. AI Knowledge Base (Backend)
        try {
            this.statusEl.innerText = "THINKING...";
            const token = localStorage.getItem('token');
            const res = await fetch('/api/ai/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': token },
                body: JSON.stringify({ query: cmd, language: this.currentLang })
            });

            const data = await res.json();

            if (data.success) {
                this.transcriptEl.innerText = data.answer;
                await this.speak(data.answer, data.language_detected);
            } else {
                await this.speak("I didn't catch that. Could you repeat?");
            }

        } catch (e) {
            console.error(e);
            await this.speak("I am having trouble connecting to the cloud.");
        }

        this.isProcessing = false;
        this.statusEl.innerText = "LISTENING...";
    }

    // --- UI ---

    createStandbyUI() {
        if (document.getElementById('ai-standby-btn')) return;
        const btn = document.createElement('button');
        btn.id = 'ai-standby-btn';
        btn.className = 'fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-slate-900 border border-cyan-500/50 shadow-lg shadow-cyan-500/20 flex items-center justify-center transition-all hover:scale-110 group';
        btn.onclick = () => {
            if (this.isStandby) {
                this.wakeUp(); // Manual wake
            } else {
                this.enableStandby(); // First time activation
            }
        };
        btn.innerHTML = `
            <div id="standby-pulse" class="absolute inset-0 rounded-full border border-cyan-400 opacity-0 transition-opacity duration-500"></div>
            <span class="text-3xl filter drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">🎙️</span>
        `;
        document.body.appendChild(btn);
    }

    updateStandbyVisuals() {
        const pulse = document.getElementById('standby-pulse');
        const btn = document.getElementById('ai-standby-btn');
        if (!pulse) return;

        if (this.isStandby && !this.isListening) {
            pulse.className = 'absolute inset-0 rounded-full border-2 border-cyan-400 animate-ping opacity-75';
            btn.classList.add('shadow-[0_0_20px_rgba(34,211,238,0.4)]');
        } else if (this.isListening) {
            pulse.className = 'absolute inset-0 rounded-full bg-cyan-500 opacity-20'; // Solid when active overlay is up
        } else {
            pulse.className = 'hidden';
            btn.classList.remove('shadow-[0_0_20px_rgba(34,211,238,0.4)]');
        }
    }

    createUI() {
        if (document.getElementById('ai-overlay')) return;

        const div = document.createElement('div');
        div.id = 'ai-overlay';
        div.className = 'fixed inset-0 z-[100] hidden bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center transition-all duration-500';
        div.innerHTML = `
            <!-- Header -->
            <div class="absolute top-10 w-full flex justify-between px-10 items-center">
                <div class="flex items-center gap-2">
                    <span class="text-2xl">🌱</span>
                    <h1 class="text-white font-bold tracking-widest text-lg">KISAN CENTRAL <span class="text-cyan-400 text-xs px-2 py-1 bg-cyan-900/30 rounded border border-cyan-500/30">V2.0</span></h1>
                </div>
                <div class="relative group">
                    <button class="flex items-center gap-2 text-slate-300 hover:text-white transition bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                        <span>🌐</span> <span id="current-lang-label">English</span>
                    </button>
                    <!-- Language Dropdown -->
                    <div class="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden hidden group-hover:block z-50">
                        <div class="max-h-64 overflow-y-auto">
                            <button onclick="farmAI.setLang('en-IN', 'English')" class="block w-full text-left px-4 py-3 text-slate-300 hover:bg-emerald-600 hover:text-white border-b border-white/5 transition">🇺🇸 English</button>
                            <button onclick="farmAI.setLang('hi-IN', 'Hindi')" class="block w-full text-left px-4 py-3 text-slate-300 hover:bg-emerald-600 hover:text-white border-b border-white/5 transition">🇮🇳 Hindi</button>
                            <button onclick="farmAI.setLang('pa-IN', 'Punjabi')" class="block w-full text-left px-4 py-3 text-slate-300 hover:bg-emerald-600 hover:text-white border-b border-white/5 transition">🇮🇳 Punjabi</button>
                            <button onclick="farmAI.setLang('mr-IN', 'Marathi')" class="block w-full text-left px-4 py-3 text-slate-300 hover:bg-emerald-600 hover:text-white border-b border-white/5 transition">🇮🇳 Marathi</button>
                            <button onclick="farmAI.setLang('gu-IN', 'Gujarati')" class="block w-full text-left px-4 py-3 text-slate-300 hover:bg-emerald-600 hover:text-white border-b border-white/5 transition">🇮🇳 Gujarati</button>
                            <button onclick="farmAI.setLang('ta-IN', 'Tamil')" class="block w-full text-left px-4 py-3 text-slate-300 hover:bg-emerald-600 hover:text-white border-b border-white/5 transition">🇮🇳 Tamil</button>
                            <button onclick="farmAI.setLang('te-IN', 'Telugu')" class="block w-full text-left px-4 py-3 text-slate-300 hover:bg-emerald-600 hover:text-white border-b border-white/5 transition">🇮🇳 Telugu</button>
                            <button onclick="farmAI.setLang('kn-IN', 'Kannada')" class="block w-full text-left px-4 py-3 text-slate-300 hover:bg-emerald-600 hover:text-white border-b border-white/5 transition">🇮🇳 Kannada</button>
                            <button onclick="farmAI.setLang('ml-IN', 'Malayalam')" class="block w-full text-left px-4 py-3 text-slate-300 hover:bg-emerald-600 hover:text-white border-b border-white/5 transition">🇮🇳 Malayalam</button>
                            <button onclick="farmAI.setLang('bn-IN', 'Bengali')" class="block w-full text-left px-4 py-3 text-slate-300 hover:bg-emerald-600 hover:text-white transition">🇮🇳 Bengali</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Central Visualizer -->
            <div class="relative mb-12 transform scale-125">
                <canvas id="voice-waves" width="400" height="400" class="rounded-full opacity-80 mix-blend-screen"></canvas>
                
                <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div id="ai-core" class="w-40 h-40 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 opacity-20 blur-xl animate-pulse"></div>
                    <div id="mic-pulse" class="absolute w-32 h-32 rounded-full border-2 border-cyan-400/50 flex items-center justify-center shadow-[0_0_100px_rgba(34,211,238,0.5)] bg-black/40 backdrop-blur-sm transition-all duration-300">
                        <span class="text-5xl drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">🎙️</span>
                    </div>
                </div>
            </div>

            <!-- Status & Transcript -->
            <div class="text-center space-y-4 max-w-2xl px-6 relative z-10">
                <h2 id="ai-status" class="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-cyan-300 tracking-[0.2em] animate-pulse drop-shadow-lg">ONLINE</h2>
                
                <div class="bg-gradient-to-b from-white/10 to-transparent p-px rounded-2xl">
                    <div class="bg-black/40 backdrop-blur-xl rounded-2xl p-6 border border-white/10 min-h-[120px] flex items-center justify-center">
                        <p id="ai-transcript" class="text-emerald-300 text-2xl font-medium font-sans leading-relaxed transition-all">"Say 'Go to Market' or 'Price of Wheat'..."</p>
                    </div>
                </div>
            </div>
            
            <!-- Close -->
            <button onclick="farmAI.goToSleep()" class="mt-16 group flex flex-col items-center gap-2 text-slate-500 hover:text-white transition">
                <span class="text-sm tracking-widest uppercase opacity-70">Tap to Sleep</span>
            </button>
        `;
        document.body.appendChild(div);

        this.ui = div;
        this.statusEl = div.querySelector('#ai-status');
        this.transcriptEl = div.querySelector('#ai-transcript');
        this.startVisualizer();
    }

    setLang(lang, label) {
        this.currentLang = lang;
        this.recognition.lang = lang;
        if (this.isStandby) {
            this.recognition.stop(); // Triggers onend -> restart with new lang
        }
        document.getElementById('current-lang-label').innerText = label;
        this.speak(`Language switched to ${label}.`, lang);
    }

    speak(text, lang) {
        return new Promise((resolve) => {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang || this.currentLang;
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.onend = () => resolve();
            window.speechSynthesis.speak(utterance);
        });
    }

    startVisualizer() {
        const canvas = document.getElementById('voice-waves');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let time = 0;

        const animate = () => {
            if (this.ui.classList.contains('hidden')) {
                // Keep animation loop alive but lightweight if hidden or just pause?
                // Better to request frame only if visible to save battery
            }
            requestAnimationFrame(animate);
            if (this.ui.classList.contains('hidden')) return;

            ctx.clearRect(0, 0, 400, 400);
            ctx.beginPath();
            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 2;

            for (let i = 0; i < 400; i++) {
                const amp = this.isProcessing ? 40 : (this.isListening ? 20 : 2);
                const y = 200 + Math.sin(i * 0.02 + time) * amp * Math.sin(i * 0.01 + time);
                if (i === 0) ctx.moveTo(i, y);
                else ctx.lineTo(i, y);
            }
            ctx.stroke();
            time += 0.1;
        };
        animate();
    }
}

const farmAI = new FarmVoiceAI();
window.speechSynthesis.onvoiceschanged = () => { };
window.addEventListener('DOMContentLoaded', () => farmAI.init());
