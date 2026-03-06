const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../config/db');

// Real Gemini Integration Helper with Groq Fallback
async function askGemini(prompt) {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const requestBody = {
        contents: [{
            parts: [{ text: prompt }]
        }]
    };

    try {
        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || "Gemini API Error");
        return data.candidates[0].content.parts[0].text;
    } catch (err) {
        console.warn("⚠️ Gemini failed, falling back to Groq:", err.message);
        try {
            const Groq = require('groq-sdk');
            const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

            const chatCompletion = await groq.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: "llama3-70b-8192", // High accuracy model
                temperature: 0.2, // Match gemini setting
            });

            return chatCompletion.choices[0]?.message?.content || null;
        } catch (groqErr) {
            console.error("❌ Both Gemini and Groq Failed:", groqErr);
            return null;
        }
    }
}

// 1. Predictive Analytics: Generate yield & financial report
router.get('/predictive-report', auth, async (req, res) => {
    try {
        // Fetch User Data for context
        const [inventory] = await db.execute('SELECT * FROM inventory WHERE user_id = ?', [req.user.id]);
        const [expenses] = await db.execute('SELECT * FROM expenses WHERE user_id = ?', [req.user.id]);
        const [user] = await db.execute('SELECT username FROM users WHERE id = ?', [req.user.id]);

        const context = `
            User: ${user[0].username}
            Inventory: ${JSON.stringify(inventory)}
            Expenses: ${JSON.stringify(expenses)}
        `;

        const prompt = `
            Analyze this agricultural data for ${user[0].username}. 
            Provide a "Predictive Yield & Financial Stability Report".
            Include:
            1. Yield Prediction (based on seeds/fertilizers in stock)
            2. Financial Alert (potential savings or overspending)
            3. Actionable Advice (Next 3 steps)
            
            Return ONLY a valid JSON object:
            {
                "yield_prediction": "e.g. 15% Increase expected",
                "financial_health": "Stable / Warning",
                "savings_potential": "₹ Amount",
                "advice": ["Step 1", "Step 2", "Step 3"],
                "summary": "Brief 2-sentence summary"
            }
        `;

        const aiResponse = await askGemini(prompt);
        let cleanedJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const report = JSON.parse(cleanedJson);

        res.json({ success: true, report });
    } catch (err) {
        console.error("Predictive Report Error:", err);
        res.status(500).json({ error: "Failed to generate AI report" });
    }
});

// 2. Voice Command Processor: Parse natural language into DB actions
router.post('/voice-action', auth, async (req, res) => {
    try {
        const { text, language } = req.body;

        const prompt = `
            Act as a Tier-1 agricultural voice assistant intent parser for a professional farming ecosystem.
            The user spoke this: "${text}" in the language code: ${language}.
            
            Languages supported: English, Hindi, Punjabi, Telugu, Tamil, Marathi, Gujarati, Kannada, Malayalam, Bengali, Odia, Urdu.
            
            Identify if the user wants to:
            A) LOG_EXPENSE: Recording money spent on fuel, seeds, labor, etc.
            B) ADD_INVENTORY: Recording new stock arrival of fertilizers, pesticides, seeds.
            C) CHAT: General agricultural advice, weather queries, or casual talk.
            
            RESPONSE RULES:
            - If LOG_EXPENSE: Extract "category" (Fuel/Labor/Seeds/Fertilizer), "amount" (numeric), "description".
            - If ADD_INVENTORY: Extract "category" (Seeds/N/P/K/Pesticide), "amount" (numeric), "description" (name of product).
            - response_text: Should be a warming, helpful, and professional confirmation in the SAME language as the input (${language}).
            
            Return ONLY a JSON object:
            {
                "intent": "LOG_EXPENSE | ADD_INVENTORY | CHAT",
                "data": {
                    "category": "string",
                    "amount": number,
                    "description": "string",
                    "unit": "kg/liters/bags",
                    "type": "Capital/Operational"
                },
                "response_text": "Confirmation message in ${language}"
            }
        `;

        const aiResponse = await askGemini(prompt);
        let cleanedJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedJson);

        // Execute DB Actions based on intent
        if (parsed.intent === 'LOG_EXPENSE') {
            await db.execute(
                'INSERT INTO expenses (user_id, category, amount, description, expense_date) VALUES (?, ?, ?, ?, CURDATE())',
                [req.user.id, parsed.data.category, parsed.data.amount, parsed.data.description]
            );
        } else if (parsed.intent === 'ADD_INVENTORY') {
            await db.execute(
                'INSERT INTO inventory (user_id, name, type, quantity, cost) VALUES (?, ?, ?, ?, ?)',
                [req.user.id, parsed.data.description, parsed.data.category, parsed.data.amount, 0]
            );
        }

        res.json({ success: true, ...parsed });
    } catch (err) {
        console.error("Voice Action Error:", err);
        res.status(500).json({ error: "Failed to process voice command" });
    }
});

// 3. High-Precision Chat Support (12+ Languages)
router.post('/ask', auth, async (req, res) => {
    try {
        const { query, language } = req.body;
        const prompt = `
            You are "Kisan Friend Premium AI", the world's leading agricultural expert.
            The farmer asks: "${query}" in language: ${language}.
            
            Provide the MOST accurate, scientifically backed, and practical advice possible.
            If asking for crop advice, include specific fertilizer doses (NPK), irrigation schedules, and pest control names.
            Match the tone and language of the user (${language}).
            Keep the response structured and easy to understand.
        `;
        const answer = await askGemini(prompt);
        res.json({ success: true, answer, language_detected: language });
    } catch (err) {
        res.status(500).json({ error: "AI Chat failed" });
    }
});

module.exports = router;
