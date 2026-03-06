const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../config/db');

// GET /api/admin/users — List all users (admin only)
router.get('/users', auth, async (req, res) => {
    try {
        const [users] = await db.execute(
            'SELECT id, username, email, phone_number, google_id, created_at FROM users ORDER BY created_at DESC'
        );
        res.json(users);
    } catch (err) {
        console.error("Admin Users Error:", err.message);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// GET /api/admin/stats — Platform stats
router.get('/stats', auth, async (req, res) => {
    try {
        const [[userCount]] = await db.execute('SELECT COUNT(*) as count FROM users');
        let listingCount = 0, scanCount = 0;
        try {
            const [[lc]] = await db.execute('SELECT COUNT(*) as count FROM trade_listings');
            listingCount = lc.count;
        } catch (e) { /* table may not exist */ }
        try {
            const [[sc]] = await db.execute('SELECT COUNT(*) as count FROM satellite_scans');
            scanCount = sc.count;
        } catch (e) { /* table may not exist */ }

        res.json({
            users: userCount.count,
            listings: listingCount,
            scans: scanCount
        });
    } catch (err) {
        console.error("Admin Stats Error:", err.message);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
});

module.exports = router;
