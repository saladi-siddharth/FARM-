const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const db = require('../config/db');
const auth = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

// Helper: Call Gemini Vision API with Groq Fallback
async function callGeminiVision(base64Image, mimeType) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is missing from .env");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `
        You are "Agri-Vision Elite", a world-renowned plant pathologist, agronomist, and crop scientist with 30+ years of field and laboratory experience.
        
        MISSION: Analyze the provided plant/crop image with maximum scientific rigor.
        
        ANALYSIS PROTOCOL:
        1. SPECIES IDENTIFICATION: Identify the exact crop species, variety if possible (e.g., Tomato - Roma, Rice - Basmati 1121).
        2. HEALTH ASSESSMENT: Classify as Healthy, Mild Risk, Moderate Disease, or Severe Infection.
        3. PATHOGEN DETECTION: If diseased, identify the exact pathogen — fungal (e.g., Alternaria solani), bacterial (e.g., Xanthomonas), viral (e.g., Tomato Yellow Leaf Curl Virus), or pest (e.g., Spodoptera litura).
        4. NUTRIENT DEFICIENCY: Check for visual markers of N, P, K, Zn, Fe, Mg, Ca deficiencies.
        5. TREATMENT PLAN: Provide both organic and chemical solutions with EXACT product names and dosages used in Indian agriculture.
        6. PREVENTION: Long-term crop management strategy.
        
        If the image is NOT a plant/crop (e.g., a person, car, random object), return diagnosis as "Not a Plant" with confidence "0%" and empty treatment arrays.
        
        Return ONLY a valid JSON object with NO markdown formatting, NO backticks:
        {
            "success": true,
            "diagnosis": "Exact disease name or Healthy Crop or Not a Plant",
            "scientific_name": "Pathogen scientific name or N/A",
            "crop_identified": "e.g., Tomato, Rice, Wheat",
            "severity": "Healthy / Mild / Moderate / Severe",
            "confidence": "e.g., 94.7%",
            "symptoms": "Detailed clinical observations of what is visible in the image",
            "cause": "Root cause — pathogen name, environmental trigger, or nutrient deficiency",
            "treatment": {
                "organic": ["Step 1 with specific product", "Step 2", "Step 3"],
                "chemical": ["Active ingredient + dose per liter/acre", "Step 2", "Step 3"]
            },
            "prevention": "Comprehensive future prevention strategy",
            "market_products": ["Specific Indian market product name 1", "Product 2"]
        }
    `;

    const requestBody = {
        contents: [{
            parts: [
                { text: prompt },
                { inlineData: { mimeType, data: base64Image } }
            ]
        }],
        generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 2048
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || `Gemini API returned ${response.status}`);
        }

        if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
            throw new Error("Gemini returned an empty or blocked response.");
        }

        let aiText = data.candidates[0].content.parts[0].text;
        // Clean markdown code fences
        aiText = aiText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

        return JSON.parse(aiText);
    } catch (geminiError) {
        console.warn(`⚠️ Gemini Vision failed: ${geminiError.message}. Falling back to Groq Vision...`);
        try {
            const Groq = require('groq-sdk');
            const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
                        ]
                    }
                ],
                model: "llama-3.2-90b-vision-preview",
                temperature: 0.2
            });

            let groqText = chatCompletion.choices[0]?.message?.content || "";
            groqText = groqText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

            return JSON.parse(groqText);

        } catch (groqError) {
            console.error("❌ Both Gemini and Groq Vision Failed:", groqError.message);
            throw new Error("AI Vision Services are currently down. Please try again later.");
        }
    }
}

// POST /api/doctor/analyze — Main Diagnosis Endpoint
router.post('/analyze', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No image provided. Please upload or capture a photo." });
        }

        console.log(`📸 Crop Doctor: Received image — ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)`);

        // Read image to Base64
        const imageBuffer = fs.readFileSync(req.file.path);
        const base64Image = imageBuffer.toString('base64');
        const mimeType = req.file.mimetype;

        // Call Gemini Vision
        const result = await callGeminiVision(base64Image, mimeType);

        // Attach metadata
        result.scan_id = "VIS-" + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1000);
        result.image_url = `/uploads/${req.file.filename}`;
        result.analyzed_at = new Date().toISOString();

        console.log(`✅ Diagnosis: ${result.diagnosis} (${result.confidence})`);
        res.json(result);

    } catch (err) {
        console.error("❌ AI Doctor Analysis Error:", err.message);
        res.status(500).json({
            error: err.message || "AI analysis failed. Please try again.",
            suggestion: "Ensure the image is clear, well-lit, and shows the affected leaf/plant part."
        });
    }
});

// POST /api/doctor/save-report — Save diagnosis to DB
router.post('/save-report', auth, async (req, res) => {
    try {
        const { scan_id, diagnosis, confidence, treatment, image_url } = req.body;
        const treatmentSummary = typeof treatment === 'object'
            ? `Organic: ${(treatment.organic || []).join('; ')} | Chemical: ${(treatment.chemical || []).join('; ')}`
            : String(treatment);

        await db.execute(`
            INSERT INTO medical_reports (user_id, scan_id, diagnosis, confidence, treatment, image_url)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [req.user.id, scan_id, diagnosis, confidence, treatmentSummary, image_url || null]);

        res.json({ message: "Report saved successfully." });
    } catch (err) {
        console.error("Save Report Error:", err);
        res.status(500).json({ error: "Failed to save report" });
    }
});

// GET /api/doctor/history — Past diagnoses
router.get('/history', auth, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM medical_reports WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to load history" });
    }
});

// GET /api/doctor/report/:id — Generate PDF
router.get('/report/:id', auth, async (req, res) => {
    const PDFDocument = require('pdfkit');

    try {
        const [rows] = await db.execute('SELECT * FROM medical_reports WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (rows.length === 0) return res.status(404).send("Report not found");

        const report = rows[0];
        const doc = new PDFDocument();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Crop_Doctor_Report_${report.scan_id}.pdf`);
        doc.pipe(res);

        doc.fontSize(24).fillColor('#10b981').text('FARM CENTRAL VISION', { align: 'center' });
        doc.fontSize(16).fillColor('black').text('AI DIAGNOSTIC REPORT', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Scan ID: ${report.scan_id}`);
        doc.text(`Date: ${new Date(report.created_at).toLocaleString()}`);
        doc.moveDown();

        if (report.image_url) {
            const imagePath = path.join(__dirname, '../../public', report.image_url);
            if (fs.existsSync(imagePath)) {
                try { doc.image(imagePath, { fit: [500, 300], align: 'center' }); doc.moveDown(); } catch (e) { }
            }
        }
        doc.moveDown();

        doc.fontSize(18).fillColor(report.diagnosis === 'Healthy Crop' ? 'green' : 'red')
            .text(`Diagnosis: ${report.diagnosis}`, { underline: true });
        doc.fontSize(12).fillColor('grey').text(`Confidence: ${report.confidence}`);
        doc.moveDown();
        doc.fillColor('black').fontSize(14).text("Treatment Plan:");
        doc.fontSize(11).text(report.treatment);
        doc.moveDown(3);
        doc.fontSize(10).fillColor('grey').text('Generated by Farm Central Agri-Vision Elite Engine.', { align: 'center' });
        doc.end();
    } catch (err) {
        console.error(err);
        res.status(500).send("PDF Generation Failed");
    }
});

module.exports = router;
