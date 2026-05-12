const express = require('express');
const router = express.Router();
const axios = require('axios');
const RSSParser = require('rss-parser');
const parser = new RSSParser();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// ============================================================
// Government of India — Real Mandi Price API
// Source: data.gov.in (Ministry of Agriculture)
// ============================================================
const MANDI_API_BASE = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
const MANDI_API_KEY = process.env.MANDI_API_KEY || '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';

// ============================================================
// In-Memory Response Cache — Sub-millisecond cached responses
// ============================================================
const apiCache = new Map();
function getCached(key, ttlMs = 600000) {
    const entry = apiCache.get(key);
    if (entry && Date.now() - entry.ts < ttlMs) return entry.data;
    return null;
}
function setCache(key, data) { apiCache.set(key, { data, ts: Date.now() }); }
// Auto-cleanup every 10 minutes
setInterval(() => { const now = Date.now(); for (const [k, v] of apiCache) { if (now - v.ts > 900000) apiCache.delete(k); } }, 600000);

// ============================================================
// 1. GET /api/market/price/:crop — Real Mandi Prices
// ============================================================
router.get('/price/:crop', async (req, res) => {
    try {
        const crop = req.params.crop.trim();
        const city = (req.query.city || '').trim();
        const region = (req.query.region || 'india').toLowerCase();

        // Check cache first (10-minute TTL for price data)
        const cacheKey = `price:${crop}:${city}:${region}`;
        const cached = getCached(cacheKey, 600000);
        if (cached) return res.json(cached);

        // --- INDIA: Use real Government API ---
        if (region === 'india' || region === 'global') {
            const params = {
                'api-key': MANDI_API_KEY,
                'format': 'json',
                'limit': 30,
                'filters[commodity]': capitalize(crop)
            };

            // If city provided, also filter by market/district
            if (city) {
                params['filters[market]'] = capitalize(city);
            }

            let response = await axios.get(MANDI_API_BASE, { params, timeout: 8000 });
            let records = response.data.records || [];

            // If no results with market filter, try district filter
            if (records.length === 0 && city) {
                delete params['filters[market]'];
                params['filters[district]'] = capitalize(city);
                response = await axios.get(MANDI_API_BASE, { params, timeout: 8000 });
                records = response.data.records || [];
            }

            // If still no results with city, fetch all for that commodity
            if (records.length === 0 && city) {
                delete params['filters[district]'];
                response = await axios.get(MANDI_API_BASE, { params, timeout: 8000 });
                records = response.data.records || [];
            }

            if (records.length > 0) {
                // Sort by modal_price descending to show most relevant
                records.sort((a, b) => (b.modal_price || 0) - (a.modal_price || 0));

                // Calculate aggregate stats
                const prices = records.map(r => r.modal_price).filter(Boolean);
                const minPrices = records.map(r => r.min_price).filter(Boolean);
                const maxPrices = records.map(r => r.max_price).filter(Boolean);
                const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
                const overallMin = Math.min(...minPrices);
                const overallMax = Math.max(...maxPrices);

                // Get unique markets for display
                const marketList = records.slice(0, 10).map(r => ({
                    market: r.market,
                    district: r.district,
                    state: r.state,
                    variety: r.variety,
                    grade: r.grade,
                    min_price: r.min_price,
                    max_price: r.max_price,
                    modal_price: r.modal_price,
                    arrival_date: r.arrival_date
                }));

                // Determine trend from price variation
                const trend = prices[0] >= avgPrice ? 'up' : 'down';

                const result = {
                    source: 'Government of India — AGMARKNET',
                    realtime: true,
                    crop: capitalize(crop),
                    price: avgPrice,
                    min_price: overallMin,
                    max_price: overallMax,
                    currency: '₹',
                    unit: 'per Quintal',
                    location: city ? capitalize(city) : records[0].state,
                    trend,
                    total_mandis: response.data.total || records.length,
                    arrival_date: records[0].arrival_date,
                    markets: marketList,
                    analyst_note: `Real prices from ${records.length} mandis. Updated: ${records[0].arrival_date}. Range: ₹${overallMin.toLocaleString()} - ₹${overallMax.toLocaleString()}/Qtl`
                };
                setCache(cacheKey, result);
                return res.json(result);
            }
        }

        // --- INTERNATIONAL / FALLBACK: Use Gemini AI ---
        const locationContext = city ? `specifically in ${city}` : `in ${region}`;
        const prompt = `You are a professional Agricultural Commodity Analyst.
Provide the CURRENT estimated wholesale market price for "${crop}" ${locationContext}.
Use latest available data. Be as accurate as possible.

Return ONLY a valid JSON object (no markdown, no backticks):
{
  "crop": "${crop}",
  "price": <number>,
  "min_price": <number>,
  "max_price": <number>,
  "currency": "<symbol like ₹ $ € £>",
  "unit": "<per Quintal / per MT / per Bushel>",
  "location": "<specific market/city name>",
  "trend": "<up or down>",
  "arrival_date": "<today's date DD/MM/YYYY>",
  "analyst_note": "<brief market context in 1 line>",
  "markets": []
}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Invalid AI response');

        const data = JSON.parse(jsonMatch[0]);
        data.source = 'Gemini AI Market Analysis';
        data.realtime = false;
        data.total_mandis = 0;
        setCache(cacheKey, data);
        res.json(data);

    } catch (err) {
        console.error("Market Price Error:", err.message);
        res.status(500).json({ error: "Failed to fetch price data. Please try again." });
    }
});

// ============================================================
// 2. GET /api/market/search — Search available commodities/markets
// ============================================================
router.get('/search', async (req, res) => {
    try {
        const { q = '', type = 'commodity' } = req.query;
        const params = {
            'api-key': MANDI_API_KEY,
            'format': 'json',
            'limit': 50
        };

        if (type === 'commodity') {
            params['filters[commodity]'] = capitalize(q);
        } else {
            params['filters[market]'] = capitalize(q);
        }

        const response = await axios.get(MANDI_API_BASE, { params, timeout: 8000 });
        const records = response.data.records || [];

        // Extract unique values
        const uniqueSet = new Set();
        records.forEach(r => {
            if (type === 'commodity') uniqueSet.add(r.commodity);
            else uniqueSet.add(`${r.market}, ${r.district}, ${r.state}`);
        });

        res.json({
            total: uniqueSet.size,
            results: [...uniqueSet].slice(0, 20)
        });
    } catch (err) {
        console.error("Market Search Error:", err.message);
        res.status(500).json({ error: "Search failed" });
    }
});

// ============================================================
// 3. GET /api/market/trending — Today's top-moving commodities
// ============================================================
router.get('/trending', async (req, res) => {
    try {
        const topCrops = ['Tomato', 'Onion', 'Potato', 'Wheat', 'Rice', 'Cotton', 'Soyabean', 'Maize'];
        const trending = [];

        for (const crop of topCrops.slice(0, 6)) {
            try {
                const response = await axios.get(MANDI_API_BASE, {
                    params: {
                        'api-key': MANDI_API_KEY,
                        'format': 'json',
                        'limit': 10,
                        'filters[commodity]': crop
                    },
                    timeout: 5000
                });

                const records = response.data.records || [];
                if (records.length > 0) {
                    const prices = records.map(r => r.modal_price).filter(Boolean);
                    const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
                    const min = Math.min(...records.map(r => r.min_price).filter(Boolean));
                    const max = Math.max(...records.map(r => r.max_price).filter(Boolean));

                    trending.push({
                        commodity: crop,
                        avg_price: avg,
                        min_price: min,
                        max_price: max,
                        mandis_reporting: response.data.total || records.length,
                        date: records[0].arrival_date
                    });
                }
            } catch (e) { /* skip failed crop */ }
        }

        res.json(trending);
    } catch (err) {
        console.error("Trending Error:", err.message);
        res.status(500).json({ error: "Failed to fetch trending data" });
    }
});

// ============================================================
// 4. GET /api/market/news — Real Agriculture News (RSS)
// ============================================================
router.get('/news', async (req, res) => {
    try {
        const { region = 'global' } = req.query;
        
        // Cache for 15 minutes
        const cacheKey = `news:${region}`;
        const cached = getCached(cacheKey, 900000);
        if (cached) return res.json(cached);

        let feedUrl;

        if (region === 'india') {
            feedUrl = 'https://news.google.com/rss/search?q=agriculture+OR+mandi+OR+farming+market+india&hl=en-IN&gl=IN&ceid=IN:en';
        } else if (region === 'usa') {
            feedUrl = 'https://news.google.com/rss/search?q=agriculture+commodity+market+usa+farming&hl=en-US&gl=US&ceid=US:en';
        } else {
            feedUrl = 'https://news.google.com/rss/search?q=global+agriculture+commodity+market+food+prices&hl=en-US&gl=US&ceid=US:en';
        }

        const feed = await parser.parseURL(feedUrl);

        const newsItems = feed.items.slice(0, 12).map(item => {
            let cleanTitle = item.title || 'Market Update';
            let finalSource = item.creator || item.source || 'Agri News';

            const lastDashIndex = cleanTitle.lastIndexOf(' - ');
            if (lastDashIndex !== -1) {
                finalSource = cleanTitle.substring(lastDashIndex + 3).trim();
                cleanTitle = cleanTitle.substring(0, lastDashIndex).trim();
            }

            return {
                title: cleanTitle,
                desc: item.contentSnippet || item.content || 'Click to explore the full article.',
                source: finalSource,
                link: item.link,
                pubDate: item.pubDate
            };
        });

        setCache(cacheKey, newsItems);
        res.json(newsItems);
    } catch (err) {
        console.error("RSS Fetch Error:", err.message);
        res.status(500).json({ error: "Failed to fetch news" });
    }
});

// ============================================================
// HELPER: Capitalize first letter of each word
// ============================================================
function capitalize(str) {
    if (!str) return '';
    return str.replace(/\b\w/g, c => c.toUpperCase());
}

module.exports = router;
