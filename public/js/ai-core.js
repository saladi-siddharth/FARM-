class FarmVoiceAI {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.synth = window.speechSynthesis;
        this.wakeWord = "farm farm";
        this.lastTranscript = "";
        this.wakeWordCount = 0;
        this.ui = null;
        this.statusEl = null;

        // "Super Intelligence" Knowledge Base
        this.knowledgeBase = {
            "best crop for winter": "For winter (Rabi season), Wheat, Mustard, and Chickpeas are excellent choices for Indian climate.",
            "how to grow tomato": "Tomatoes need plenty of sun and well-drained soil. Water regularly but avoid wetting leaves to prevent fungus.",
            "pesticide for cotton": "For cotton bollworm, use Neem oil or Bacillus thuringiensis (Bt) sprays as eco-friendly options.",
            "market price of onion": "Onion prices fluctuate. Please check the Market Intelligence section for live rates.",
            "government schemes": "PM Kisan Samman Nidhi and KCC are key schemes. Visit the government portal for details.",
            "weather forecast": "I can check the live weather for you. Just say 'Check Weather'."
        };
    }

    init() {
        if (!('webkitSpeechRecognition' in window)) return;
        this.createUI();

        this.recognition = new webkitSpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-IN';

        this.recognition.onstart = () => console.log("FarmAI: Listening...");

        this.recognition.onresult = (event) => {
            const result = event.results[event.results.length - 1];
            const transcript = result[0].transcript.toLowerCase().trim();
            const isFinal = result.isFinal;

            if (isFinal) {
                // Wake Word Logic: "Farm Farm"
                if (!this.isListening) {
                    // Check strict "farm farm" or repetition
                    if (transcript.includes("farm farm") || (transcript.includes("farm") && this.lastTranscript.includes("farm"))) {
                        this.activateAI();
                        this.wakeWordCount = 0;
                    }
                    this.lastTranscript = transcript;
                } else {
                    this.processCommand(transcript);
                }
            }
        };

        this.recognition.onend = () => {
            // Auto-restart
            if (!this.isListening || location.pathname.includes('dashboard')) {
                try { this.recognition.start(); } catch (e) { }
            }
        };

        try { this.recognition.start(); } catch (e) {
            // Might block auto-play, usually needs 1 interaction
            document.body.addEventListener('click', () => {
                try { this.recognition.start(); } catch (e) { }
            }, { once: true });
        }
    }

    createUI() {
        // Create the Overlay UI
        const div = document.createElement('div');
        div.id = 'ai-overlay';
        div.className = 'fixed inset-0 z-[100] hidden bg-black/80 backdrop-blur-md flex flex-col items-center justify-center transition-opacity duration-500';
        div.innerHTML = `
            <div class="relative">
                <canvas id="voice-waves" width="300" height="300" class="rounded-full"></canvas>
                <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div class="w-32 h-32 rounded-full bg-cyan-500/20 animate-pulse flex items-center justify-center border border-cyan-400/30 shadow-[0_0_50px_rgba(34,211,238,0.4)]">
                        <span class="text-4xl">🤖</span>
                    </div>
                </div>
            </div>
            <h2 id="ai-status" class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mt-8 tracking-widest">LISTENING...</h2>
            <p id="ai-transcript" class="text-slate-400 mt-4 text-lg font-mono italic h-8">...</p>
            
            <button onclick="farmAI.deactivateAI()" class="mt-12 text-slate-500 hover:text-white transition uppercase text-xs tracking-widest border border-white/10 px-6 py-2 rounded-full">Close AI</button>
        `;
        document.body.appendChild(div);

        this.ui = div;
        this.statusEl = div.querySelector('#ai-status');
        this.transcriptEl = div.querySelector('#ai-transcript');
    }

    activateAI() {
        this.isListening = true;
        this.ui.classList.remove('hidden');
        this.speak("Hello Farmer. Systems Online.");
        this.startVisualizer();
    }

    deactivateAI() {
        this.isListening = false;
        this.ui.classList.add('hidden');
        this.speak("Standing by.");
    }

    // --- PROCESS COMMAND (SUPER INTELLIGENCE) ---
    async processCommand(cmd) {
        this.transcriptEl.innerText = `"${cmd}"`;

        // 1. Check Keywords (Navigation)
        if (this.checkNavigation(cmd)) return;

        // 2. Language Switching
        if (this.checkLanguageSwitch(cmd)) return;

        // 3. Super Fast LLM Simulation
        const response = await this.mockLLMResponse(cmd);
        this.speak(response);
    }

    checkNavigation(cmd) {
        if (cmd.includes('market') || cmd.includes('price')) { location.href = 'market.html'; return true; }
        if (cmd.includes('inventory') || cmd.includes('stock')) { location.href = 'inventory.html'; return true; }
        if (cmd.includes('weather')) { this.speak("Checking live weather..."); return true; }
        if (cmd.includes('doctor')) { location.href = 'doctor.html'; return true; }
        if (cmd.includes('close') || cmd.includes('exit')) { this.deactivateAI(); return true; }
        return false;
    }

    checkLanguageSwitch(cmd) {
        const langs = {
            'hindi': 'hi-IN', 'telugu': 'te-IN', 'tamil': 'ta-IN', 'kannada': 'kn-IN',
            'malayalam': 'ml-IN', 'marathi': 'mr-IN', 'punjabi': 'pa-IN', 'english': 'en-IN'
        };
        for (let [name, code] of Object.entries(langs)) {
            if (cmd.includes(name)) {
                this.speak(`Switching to ${name} mode.`);
                this.setLang(code);
                return true;
            }
        }
        return false;
    }

    // SIMULATED LLM BACKEND (Local "Knowledge Graph")
    async mockLLMResponse(query) {
        // Delay for realism (super fast 300ms)
        await new Promise(r => setTimeout(r, 300));

        query = query.toLowerCase();

        // Extended Knowledge Base
        if (query.includes('winter') || query.includes('rabi')) return "For winter season, Wheat (HD-2967) and Mustard are highly profitable. Sowing time is Oct-Nov.";
        if (query.includes('summer') || query.includes('zaid')) return "Watermelon, Cucumber, and Moong Dal are best for summer (Zaid) season.";
        if (query.includes('tomato')) return "To grow tomatoes: Use well-drained loamy soil. Stake plants for support. Apply 19:19:19 fertilizer every 15 days.";
        if (query.includes('pesticide') || query.includes('insect')) return "For general pests, Neem Oil (1000ppm) is safe. For bollworms, use Emamectin Benzoate.";
        if (query.includes('subsidy') || query.includes('govt')) return "You can apply for PM-Kisan (₹6000/yr) and Sub-Mission on Agricultural Mechanization for tractor subsidies.";
        if (query.includes('fertilizer')) return "DAP and Urea are common, but organic Vermicompost yields better long-term soil health.";

        return "I am searching the global agricultural database for " + query + ". Please wait...";
    }

    // --- HOLOGRAPHIC VISUALIZER (Back Hologram) ---
    startVisualizer() {
        const container = document.getElementById('voice-waves')?.parentElement;
        if (!container || this.renderer) return;

        const scene = new THREE.Scene();
        // Transparent background
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(400, 400);
        container.innerHTML = '';
        container.appendChild(renderer.domElement);
        this.renderer = renderer;

        // HOLOGRAPHIC SPHERE (Points)
        const geometry = new THREE.SphereGeometry(1.5, 64, 64);
        const material = new THREE.PointsMaterial({
            color: 0x00ffff, // Cyan Hologram
            size: 0.05,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        const hologram = new THREE.Points(geometry, material);
        scene.add(hologram);

        // Inner Core
        const coreGeo = new THREE.IcosahedronGeometry(0.8, 2);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.3 });
        const core = new THREE.Mesh(coreGeo, coreMat);
        scene.add(core);

        camera.position.z = 4.0;

        let time = 0;
        const animate = () => {
            if (!this.isListening) {
                renderer.dispose();
                this.renderer = null;
                container.innerHTML = '<canvas id="voice-waves" width="300" height="300" class="rounded-full"></canvas>';
                return;
            }
            requestAnimationFrame(animate);

            time += 0.02;

            // Hologram Rotation
            hologram.rotation.y += 0.005;
            core.rotation.x -= 0.01;
            core.rotation.y -= 0.01;

            // interference effect (Hologram jitter)
            if (Math.random() > 0.9) hologram.position.x = (Math.random() - 0.5) * 0.05;
            else hologram.position.x = 0;

            renderer.render(scene, camera);
        };
        animate();
    }
}

// Global Instance
const farmAI = new FarmVoiceAI();
// Wait for voices to load
window.speechSynthesis.onvoiceschanged = () => { };
// Auto-init on page load
window.addEventListener('DOMContentLoaded', () => farmAI.init());
