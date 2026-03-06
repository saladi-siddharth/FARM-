const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../config/db');

// ============================================================
// 🛰️ SATELLITE FARM HEALTH SCANNER
// Uses NASA POWER API (free) + Gemini AI for interpretation
// ============================================================

/**
 * Helper: fetch real agricultural data from NASA POWER API
 * Endpoint is free — no API key needed
 */
async function fetchNASAData(lat, lon) {
    // Get last 30 days of data for analysis
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    const fmt = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
    const start = fmt(startDate);
    const end = fmt(endDate);

    const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M,WS2M,ALLSKY_SFC_SW_DWN,T2MDEW,GWETROOT,GWETPROF&community=AG&longitude=${lon}&latitude=${lat}&start=${start}&end=${end}&format=JSON`;

    console.log(`🛰️ Fetching NASA POWER data for (${lat}, ${lon})...`);

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`NASA POWER API returned ${response.status}`);
    }

    const data = await response.json();
    if (!data.properties || !data.properties.parameter) {
        throw new Error('NASA POWER returned unexpected data format');
    }

    const params = data.properties.parameter;

    // Calculate averages from the last 30 days
    const avg = (obj) => {
        const values = Object.values(obj).filter(v => v !== -999);
        return values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length) : null;
    };

    return {
        avg_temperature: avg(params.T2M)?.toFixed(1),
        max_temperature: avg(params.T2M_MAX)?.toFixed(1),
        min_temperature: avg(params.T2M_MIN)?.toFixed(1),
        avg_precipitation: avg(params.PRECTOTCORR)?.toFixed(2),
        avg_humidity: avg(params.RH2M)?.toFixed(1),
        avg_wind_speed: avg(params.WS2M)?.toFixed(1),
        avg_solar_radiation: avg(params.ALLSKY_SFC_SW_DWN)?.toFixed(2),
        dew_point: avg(params.T2MDEW)?.toFixed(1),
        root_zone_wetness: avg(params.GWETROOT)?.toFixed(2),
        profile_soil_moisture: avg(params.GWETPROF)?.toFixed(2),
        data_period: `${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}`,
        total_precip_days: Object.values(params.PRECTOTCORR).filter(v => v > 0.5).length,
        raw_params: params
    };
}

/**
 * Helper: Use Gemini AI to interpret NASA data and produce farm health metrics
 */
async function analyzeWithGemini(nasaData, lat, lon, cropType) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is missing from .env");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `
You are "AgroSat Elite", a world-class satellite remote sensing and precision agriculture expert with 25+ years of experience analyzing satellite imagery, NDVI data, and crop health metrics.

MISSION: Analyze the following REAL NASA POWER satellite-derived data for a farm at coordinates (${lat}, ${lon}) and produce a comprehensive farm health assessment.

NASA SATELLITE DATA (30-day averages):
- Average Temperature: ${nasaData.avg_temperature}°C
- Max Temperature: ${nasaData.max_temperature}°C
- Min Temperature: ${nasaData.min_temperature}°C
- Average Precipitation: ${nasaData.avg_precipitation} mm/day
- Total Rainy Days (>0.5mm): ${nasaData.total_precip_days} days
- Average Relative Humidity: ${nasaData.avg_humidity}%
- Average Wind Speed: ${nasaData.avg_wind_speed} m/s
- Solar Radiation (surface): ${nasaData.avg_solar_radiation} kW-hr/m²/day
- Dew Point Temperature: ${nasaData.dew_point}°C
- Root Zone Soil Wetness: ${nasaData.root_zone_wetness} (0-1 scale)
- Profile Soil Moisture: ${nasaData.profile_soil_moisture} (0-1 scale)
- Data Period: ${nasaData.data_period}
${cropType ? `- Farmer's Crop: ${cropType}` : '- Crop: General/Unknown'}

ANALYSIS PROTOCOL:
1. Calculate an estimated NDVI score (0 to 1) based on temperature, rainfall, humidity, solar radiation patterns. Consider season, location latitude, and climate zone.
2. Assess Crop Stress level based on heat stress, water stress, and radiation patterns.
3. Estimate Soil Moisture percentage from the root zone wetness and profile moisture data.
4. Determine Irrigation Requirement based on precipitation deficit, evapotranspiration estimate, and soil moisture.
5. Provide a Vegetation Health assessment.
6. Give actionable recommendations for the farmer.

Return ONLY a valid JSON object with NO markdown, NO backticks:
{
    "success": true,
    "ndvi_score": 0.72,
    "ndvi_label": "Good Vegetation",
    "crop_stress": "Low",
    "crop_stress_score": 25,
    "soil_moisture_percent": 65,
    "soil_moisture_label": "Adequate",
    "irrigation_need": "Low",
    "irrigation_score": 20,
    "vegetation_health": "Healthy",
    "vegetation_health_score": 78,
    "climate_zone": "Tropical / Sub-tropical / Temperate / Arid",
    "growing_season_status": "Active / Dormant / Pre-Season / Post-Harvest",
    "risk_factors": ["Heat stress risk in afternoon hours", "Monitor for fungal diseases due to humidity"],
    "recommendations": [
        "Specific actionable recommendation 1",
        "Specific actionable recommendation 2",
        "Specific actionable recommendation 3",
        "Specific actionable recommendation 4"
    ],
    "detailed_analysis": "A 2-3 paragraph expert analysis of the farm's current satellite-derived health metrics, discussing what the data reveals about vegetation vigor, water availability, stress indicators, and overall crop prospects.",
    "water_balance": {
        "estimated_daily_et": 4.5,
        "precip_vs_et_ratio": 0.8,
        "status": "Slight deficit"
    }
}
    `;

    const requestBody = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.3,
            topP: 0.85,
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

        const startIndex = aiText.indexOf('{');
        const endIndex = aiText.lastIndexOf('}');

        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            aiText = aiText.substring(startIndex, endIndex + 1);
        } else {
            // Strip any remaining markdown just in case it didn't use braces
            aiText = aiText.replace(/```json/gi, '').replace(/```/gi, '').trim();
        }

        return JSON.parse(aiText);
    } catch (err) {
        console.error("❌ Gemini Satellite Analysis Error:", err.message);
        // Fallback: generate metrics from NASA raw data
        const rootWetness = parseFloat(nasaData.root_zone_wetness) || 0.5;
        const precip = parseFloat(nasaData.avg_precipitation) || 2;
        const temp = parseFloat(nasaData.avg_temperature) || 25;
        const humidity = parseFloat(nasaData.avg_humidity) || 60;

        const ndvi = Math.min(0.95, Math.max(0.1, rootWetness * 0.6 + (precip > 2 ? 0.2 : 0.05) + (temp > 15 && temp < 35 ? 0.15 : 0)));
        const soilMoisture = Math.min(100, rootWetness * 100);
        const stressScore = temp > 35 ? 75 : (temp > 30 ? 50 : (precip < 1 ? 60 : 25));

        return {
            success: true,
            ndvi_score: parseFloat(ndvi.toFixed(2)),
            ndvi_label: ndvi > 0.6 ? "Good Vegetation" : ndvi > 0.4 ? "Moderate" : "Poor",
            crop_stress: stressScore > 60 ? "High" : stressScore > 40 ? "Moderate" : "Low",
            crop_stress_score: stressScore,
            soil_moisture_percent: parseFloat(soilMoisture.toFixed(1)),
            soil_moisture_label: soilMoisture > 60 ? "Adequate" : soilMoisture > 30 ? "Low" : "Critical",
            irrigation_need: soilMoisture < 30 ? "High" : soilMoisture < 50 ? "Moderate" : "Low",
            irrigation_score: Math.max(0, 100 - soilMoisture),
            vegetation_health: ndvi > 0.6 ? "Healthy" : "Stressed",
            vegetation_health_score: Math.round(ndvi * 100),
            climate_zone: "Estimated",
            growing_season_status: "Active",
            risk_factors: ["AI analysis unavailable — showing estimated metrics from NASA raw data"],
            recommendations: [
                "Connect Gemini AI for detailed analysis",
                `Current soil moisture: ${soilMoisture.toFixed(0)}%`,
                `Average temperature: ${temp}°C`,
                `Average precipitation: ${precip} mm/day`
            ],
            detailed_analysis: `Estimated analysis based on NASA POWER raw satellite data. Root zone wetness is ${rootWetness}, average precipitation is ${precip} mm/day, and average temperature is ${temp}°C. For detailed AI-powered interpretation, ensure your GEMINI_API_KEY is valid.`,
            water_balance: {
                estimated_daily_et: parseFloat((temp * 0.15 + 1).toFixed(1)),
                precip_vs_et_ratio: parseFloat((precip / (temp * 0.15 + 1)).toFixed(2)),
                status: precip > (temp * 0.15 + 1) ? "Surplus" : "Deficit"
            }
        };
    }
}

// ============================================================
// ROUTES
// ============================================================

/**
 * POST /api/satellite/analyze
 * Main satellite analysis endpoint (public — no auth needed for demo)
 */
router.post('/analyze', async (req, res) => {
    try {
        const { latitude, longitude, crop_type } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({ error: "Latitude and longitude are required." });
        }

        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);

        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            return res.status(400).json({ error: "Invalid coordinates." });
        }

        console.log(`🛰️ Satellite Scan Request: (${lat}, ${lon}) | Crop: ${crop_type || 'General'}`);

        // Step 1: Fetch real NASA data
        const nasaData = await fetchNASAData(lat, lon);
        console.log(`✅ NASA data received for period: ${nasaData.data_period}`);

        // Step 2: AI analysis
        const analysis = await analyzeWithGemini(nasaData, lat, lon, crop_type);

        // Step 3: Attach metadata
        analysis.scan_id = "SAT-" + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1000);
        analysis.coordinates = { latitude: lat, longitude: lon };
        analysis.crop_type = crop_type || 'General';
        analysis.nasa_data = {
            avg_temperature: nasaData.avg_temperature,
            max_temperature: nasaData.max_temperature,
            min_temperature: nasaData.min_temperature,
            avg_precipitation: nasaData.avg_precipitation,
            avg_humidity: nasaData.avg_humidity,
            avg_wind_speed: nasaData.avg_wind_speed,
            avg_solar_radiation: nasaData.avg_solar_radiation,
            root_zone_wetness: nasaData.root_zone_wetness,
            profile_soil_moisture: nasaData.profile_soil_moisture,
            data_period: nasaData.data_period
        };
        analysis.analyzed_at = new Date().toISOString();

        console.log(`✅ Satellite Analysis Complete: NDVI=${analysis.ndvi_score}, Stress=${analysis.crop_stress}`);
        res.json(analysis);

    } catch (err) {
        console.error("❌ Satellite Analysis Error:", err.message);
        res.status(500).json({
            error: err.message || "Satellite analysis failed.",
            suggestion: "Please check your coordinates and try again."
        });
    }
});

/**
 * POST /api/satellite/save-scan — Save scan result to DB
 */
router.post('/save-scan', auth, async (req, res) => {
    try {
        const {
            scan_id, latitude, longitude, location_name,
            ndvi_score, crop_stress, soil_moisture_percent,
            irrigation_need, vegetation_health, detailed_analysis
        } = req.body;

        await db.execute(`
            INSERT INTO satellite_scans 
            (user_id, scan_id, latitude, longitude, location_name, ndvi_score, crop_stress, soil_moisture, irrigation_need, vegetation_health, analysis_text)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            req.user.id, scan_id, latitude, longitude,
            location_name || `${latitude}, ${longitude}`,
            ndvi_score, crop_stress, soil_moisture_percent,
            irrigation_need, vegetation_health,
            detailed_analysis || ''
        ]);

        res.json({ message: "Satellite scan saved successfully." });
    } catch (err) {
        console.error("Save Satellite Scan Error:", err);
        res.status(500).json({ error: "Failed to save scan." });
    }
});

/**
 * GET /api/satellite/history — Past satellite scans
 */
router.get('/history', auth, async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM satellite_scans WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        console.error("Satellite History Error:", err);
        res.status(500).json({ error: "Failed to load history." });
    }
});

module.exports = router;
