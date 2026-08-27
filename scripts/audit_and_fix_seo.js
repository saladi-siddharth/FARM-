const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public');
const htmlFiles = fs.readdirSync(publicDir).filter(f => f.endsWith('.html') && f !== '404.html' && f !== 'googlee5dcf402c26ac289.html');

console.log(`Found ${htmlFiles.length} HTML pages to optimize for Google Indexing.`);

const pageTitles = {
    'index.html': 'Farm Central — Natural Agricultural Intelligence & Escrow Trading Platform',
    'blog.html': 'Farm Central — The #1 AI-Powered Agriculture Intelligence & Escrow Trading Platform',
    'dashboard.html': 'Command Dashboard — Farm Central Real-Time Operations',
    'market.html': 'Live Mandi Prices & Commodity Trends — Farm Central',
    'trading.html': 'Escrow Produce Marketplace — 0% Fraud Risk Agricultural Trading — Farm Central',
    'satellite.html': 'NASA Satellite NDVI Field Health Scanner — Farm Central',
    'doctor.html': 'AI Crop Doctor — Plant Pathology Diagnostics — Farm Central',
    'inventory.html': 'Produce & Crop Stock Inventory Manager — Farm Central',
    'tasks.html': 'Agricultural Field Work Scheduler & Task Tracker — Farm Central',
    'expenses.html': 'Farm Financial Ledger & Expense Tracker — Farm Central',
    'calculator.html': 'Smart Agricultural ROI & Fertilizer Calculator — Farm Central',
    'community.html': 'Growers Community Forum & Agronomy Q&A — Farm Central',
    'reports.html': 'Audit-Ready Farm Statements & Financial Reports — Farm Central',
    'login.html': 'Sign In to Farm Central — Farmer & Buyer Portal',
    'admin.html': 'System Administration & KYC Verification — Farm Central',
    'weather.html': 'Hyper-Local Agroclimatology & Precipitation Forecast — Farm Central',
    'fertilizer.html': 'NPK Precision Fertilizer Recommendations — Farm Central',
    'calendar.html': 'Seasonal Crop Calendar & Harvest Planning — Farm Central',
    'kyc.html': 'Farmer & Trader Identity KYC Verification — Farm Central',
    'chat.html': '24/7 AI Agronomist Voice & Chat Assistant — Farm Central',
    'disputes.html': 'Escrow Arbitration & Dispute Resolution — Farm Central',
    'payouts.html': 'Escrow Wallet Settlements & Payout Logs — Farm Central'
};

const pageDescriptions = {
    'index.html': 'The all-in-one platform for modern farmers. Trade securely with 0% risk, track finances, and leverage AI satellite health scans.',
    'blog.html': 'Discover Farm Central (farmcentral.online) — NASA satellite NDVI scans, AI Crop Doctor, live APMC mandi rates, and zero-fraud escrow marketplace.',
    'dashboard.html': 'Access real-time microclimate readings, crop valuations, categorized expenses, and agronomy tools on Farm Central.',
    'market.html': 'Explore real-time APMC Mandi commodity rates, daily price trends, and trading volumes across Indian markets.',
    'trading.html': 'Trade agricultural commodities with zero fraud risk. Buyer funds locked in escrow until verified delivery.',
    'satellite.html': 'Instant NASA POWER satellite remote sensing. Compute NDVI vegetation health, solar radiation, and soil moisture by GPS coordinates.',
    'doctor.html': 'Upload leaf photos to diagnose crop diseases and fungal infections with Google Gemini Vision AI recommendations.',
    'inventory.html': 'Manage farm produce batches, seed stocks, fertilizer bags, and calculate live asset valuations.',
    'tasks.html': 'Schedule and track daily agricultural operations, irrigation schedules, and field labor tasks.',
    'expenses.html': 'Track categorized farm expenses, labor costs, fuel, and generate monthly financial ledger audits.',
    'calculator.html': 'Calculate crop yields, fertilizer requirements, and investment returns tailored to your farm acreage.',
    'community.html': 'Connect with fellow growers, agronomists, and experts to discuss crop management and pest solutions.',
    'reports.html': 'Download official PDF financial audit reports, inventory valuation summaries, and farm balance sheets.',
    'login.html': 'Sign in or create a verified account on Farm Central to access your personalized agronomy command center.',
    'admin.html': 'Administrative control console for KYC verification, user management, and platform analytics.',
    'weather.html': 'Get 7-day predictive weather telemetry, rainfall accumulation, and frost warnings for your farm coordinates.',
    'fertilizer.html': 'Calculate optimal NPK fertilizer dosages and organic compost blends based on soil test results.',
    'calendar.html': 'Plan your sowing, weeding, fertilizer application, and harvesting schedules across seasonal crop cycles.',
    'kyc.html': 'Submit Aadhaar and bank details for verified trader status on the Farm Central escrow marketplace.',
    'chat.html': 'Get instant answers to agronomy, crop pathology, and market pricing questions from the AI assistant.',
    'disputes.html': 'Official escrow dispute resolution portal ensuring fair trade settlements for farmers and buyers.',
    'payouts.html': 'Track completed escrow trade payouts, bank transfers, and wallet withdrawals on Farm Central.'
};

let modifiedCount = 0;

htmlFiles.forEach(fileName => {
    const filePath = path.join(publicDir, fileName);
    let content = fs.readFileSync(filePath, 'utf8');

    const canonicalUrl = fileName === 'index.html' 
        ? 'https://farmcentral.online/' 
        : `https://farmcentral.online/${fileName}`;

    const title = pageTitles[fileName] || 'Farm Central — Agricultural Intelligence & Trading Platform';
    const description = pageDescriptions[fileName] || 'Farm Central provides AI satellite scans, escrow produce trading, and live mandi market prices.';

    // 1. Remove existing canonical tag if present
    content = content.replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '');

    // 2. Remove existing title and meta description if present
    content = content.replace(/<title>.*?<\/title>/gi, '');
    content = content.replace(/<meta\s+name=["']description["'][^>]*>/gi, '');
    content = content.replace(/<meta\s+name=["']robots["'][^>]*>/gi, '');

    // 3. Construct clean SEO header block
    const seoBlock = `
    <!-- Google Search Console Indexing & Canonicalization -->
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
    <link rel="canonical" href="${canonicalUrl}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Farm Central">
    <meta property="og:image" content="https://farmcentral.online/frames/frame_01_sky.jpg">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="https://farmcentral.online/frames/frame_01_sky.jpg">
`;

    // Insert right after <head>
    if (content.includes('<head>')) {
        content = content.replace('<head>', `<head>${seoBlock}`);
    } else if (content.includes('<HEAD>')) {
        content = content.replace('<HEAD>', `<HEAD>${seoBlock}`);
    }

    fs.writeFileSync(filePath, content, 'utf8');
    modifiedCount++;
    console.log(`✅ Optimized SEO & Canonical for: ${fileName} -> ${canonicalUrl}`);
});

console.log(`\n🎉 Successfully optimized ${modifiedCount} HTML files with exact Canonical tags!`);
