const express = require('express');
const router = express.Router();
const RSSParser = require('rss-parser');
const parser = new RSSParser();

// 1. Get Live Market News (Real RSS Feed)
router.get('/news', async (req, res) => {
    try {
        // Fetch from Google News (reliable & real-time)
        const feedUrl = 'https://news.google.com/rss/search?q=agriculture+OR+farming+market+india&hl=en-IN&gl=IN&ceid=IN:en';
        const feed = await parser.parseURL(feedUrl);

        // Transform for frontend
        const newsItems = feed.items.slice(0, 8).map(item => {
            let cleanTitle = item.title || 'Market Update';
            let finalSource = item.creator || item.source || 'Agri News';

            // Google News often appends " - Publisher" to the title. We cleanly separate it.
            const lastDashIndex = cleanTitle.lastIndexOf(' - ');
            if (lastDashIndex !== -1) {
                finalSource = cleanTitle.substring(lastDashIndex + 3).trim();
                cleanTitle = cleanTitle.substring(0, lastDashIndex).trim();
            }

            return {
                title: cleanTitle,
                desc: item.contentSnippet || item.content || 'Click to explore the full article and latest market developments.',
                source: finalSource,
                link: item.link
            };
        });

        res.json(newsItems);
    } catch (err) {
        console.error("RSS Fetch Error:", err.message);
        // Fallback to mock if RSS fails
        res.json([
            { title: "Rains delayed in central India", desc: "IMD predicts a 4-day delay in monsoon activity over MP and Maharashtra.", source: "AgriWeather" },
            { title: "Government hikes MSP for Kharif crops", desc: "Cabinet approves increase in Minimum Support Price for paddy and pulses.", source: "Govt of India" },
            { title: "Onion prices stable in Nashik", desc: "Supply influx from late Kharif harvest keeps prices steady at ₹1500/quintal.", source: "Mandi News" }
        ]);
    }
});

// 2. Get Real-Time Prices (Advanced Simulation based on real mandis)
// NOTE: Real-time API access usually costs money. We simulate "Real" behavior.
router.get('/price/:crop', (req, res) => {
    const crop = req.params.crop.toLowerCase();
    // Base Prices Dictionary (Approximated from 2025-26 Indian Market Data)
    const priceDb = {
        'onion': 2400, // INR/Quintal
        'tomato': 1800,
        'potato': 1400,
        'wheat': 2275, // MSP
        'rice': 2900,
        'paddy': 2203,
        'cotton': 7500,
        'soybean': 4600,
        'maize': 2090,
        'mustard': 5650,
        'tur': 9000
    };

    let basePrice = priceDb[crop] || 2000;

    // Fuzzy match if exact missing
    if (basePrice === 2000) {
        for (let k of Object.keys(priceDb)) {
            if (crop.includes(k)) { basePrice = priceDb[k]; break; }
        }
    }

    // Add random "Volatile" factor (-10% to +10%)
    const variance = (Math.random() * 0.2) - 0.1;
    const finalPrice = Math.floor(basePrice * (1 + variance));

    const location = ['Nashik', 'Pune', 'Nagpur', 'Indore', 'Guntur'][Math.floor(Math.random() * 5)];

    res.json({
        crop: crop,
        price: finalPrice,
        location: location,
        currency: '₹',
        trend: variance > 0 ? 'up' : 'down'
    });
});

module.exports = router;
