const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

router.get('/summary', auth, async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch User Info
        const [users] = await db.execute('SELECT username, role, kyc_status, wallet_balance FROM users WHERE id = ?', [userId]);
        const user = users[0] || {};

        // Fetch Inventory Total
        const [inv] = await db.execute(
            'SELECT COALESCE(SUM(quantity * cost), 0) as inventoryValue FROM inventory WHERE user_id = ?',
            [userId]
        );

        // Fetch Expenses Total
        const [exp] = await db.execute(
            'SELECT COALESCE(SUM(amount), 0) as totalExpenses FROM expenses WHERE user_id = ?',
            [userId]
        );

        // Fetch Tasks Count
        const [tasks] = await db.execute(
            'SELECT COUNT(*) as taskCount FROM tasks WHERE user_id = ?',
            [userId]
        );

        // Fetch Satellite Scans Count
        let scanCount = 0;
        try {
            const [scans] = await db.execute(
                'SELECT COUNT(*) as scanCount FROM satellite_scans WHERE user_id = ?',
                [userId]
            );
            scanCount = scans[0]?.scanCount || 0;
        } catch (e) {
            scanCount = 0;
        }

        // Fetch Expenses by Category
        const [expenseBreakdown] = await db.execute(
            'SELECT category, SUM(amount) as total FROM expenses WHERE user_id = ? GROUP BY category',
            [userId]
        );

        // Fetch Total Messages Received / Sent
        let msgCount = 0;
        try {
            const [msgs] = await db.execute(
                'SELECT COUNT(*) as msgCount FROM messages WHERE receiver_id = ? OR sender_id = ?',
                [userId, userId]
            );
            msgCount = msgs[0]?.msgCount || 0;
        } catch (e) {
            msgCount = 0;
        }

        // Fetch Inventory Breakdown (for Pie Chart)
        const [invBreakdown] = await db.execute(
            'SELECT type, SUM(quantity * cost) as value FROM inventory WHERE user_id = ? GROUP BY type',
            [userId]
        );

        // Send a complete real-time payload to frontend
        res.json({
            username: user.username || req.user.username,
            role: user.role || 'farmer',
            kyc_status: user.kyc_status || 'verified',
            walletBalance: user.wallet_balance || 0,
            inventoryValue: inv[0]?.inventoryValue || 0,
            totalExpenses: exp[0]?.totalExpenses || 0,
            taskCount: tasks[0]?.taskCount || 0,
            scanCount: scanCount,
            msgCount: msgCount,
            expenseBreakdown: expenseBreakdown || [],
            inventoryBreakdown: invBreakdown || []
        });
    } catch (err) {
        console.error("Dashboard SQL Error:", err.message);
        res.status(500).json({ error: "Failed to load dashboard data" });
    }
});

module.exports = router;