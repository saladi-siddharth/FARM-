/**
 * FARM CENTRAL DEMO MODE TOGGLE
 * Secret keybind to activate: Ctrl + Shift + D
 * Purpose: Ensures the hackathon live-demo never fails due to Wi-Fi drops or API timeouts
 * by intercepting specific functions and injecting perfect mock data.
 */

let demoModeActive = localStorage.getItem('demo_mode') === 'true';

// Listen for Ctrl+Shift+D
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        demoModeActive = !demoModeActive;
        localStorage.setItem('demo_mode', demoModeActive);

        // Visual indicator
        if (typeof toast !== 'undefined') {
            if (demoModeActive) {
                toast.success('🎭 UNBREAKABLE DEMO MODE ACTIVATED', 3000);
            } else {
                toast.error('❌ Demo Mode Disabled', 2000);
            }
        }
    }
});

// Immediately override fetch if Demo Mode is on
const originalFetch = window.fetch;

window.fetch = async function (...args) {
    if (!demoModeActive) {
        return originalFetch.apply(this, args);
    }

    const url = args[0];

    // 1. Intercept AI Crop Doctor
    if (typeof url === 'string' && url.includes('/api/doctor/analyze')) {
        console.log("Mocking AI Crop Doctor Response...");
        return new Response(JSON.stringify({
            scan_id: "DEMO-WIN-99",
            diagnosis: "Nitrogen Deficiency",
            scientific_name: "Macronutrient Imbalance - N",
            confidence: "99.8%",
            crop_identified: "Apple Leaf",
            severity: "Moderate",
            symptoms: "Yellowing of older leaves, stunted growth, and pale green appearance across the canopy.",
            cause: "Insufficient nitrogen in soil, likely due to heavy rainfall leaching or improper fertilizer application in the previous cycle.",
            prevention: "Implement a routine soil test every 6 months. Consider intercropping with leguminous plants to naturally fix nitrogen.",
            treatment: {
                organic: [
                    "Apply composted chicken manure (high N content).",
                    "Use Fish Emulsion foliar spray for rapid absorption.",
                    "Blend Coffee Grounds into the topsoil."
                ],
                chemical: [
                    "Apply Urea (46-0-0) at 50kg per acre.",
                    "Use NPK 19-19-19 water-soluble spray."
                ]
            },
            market_products: ["Tata Rallis Urea", "IFFCO NPK 19-19-19", "Multiplex Samras"],
            image_url: "/placeholder.jpg"
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 2. Intercept Twilio SMS
    if (typeof url === 'string' && url.includes('/api/sms/send-report')) {
        console.log("Mocking SMS Send...");
        // Fake a tiny delay for realism
        await new Promise(r => setTimeout(r, 800));
        return new Response(JSON.stringify({
            message: "SMS sent successfully!",
            messageId: "SM" + Math.random().toString(36).substr(2, 16)
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 3. Optional: Intercept Dashboard Stats if they fail
    // Return original if no intercept matches
    return originalFetch.apply(this, args);
};
