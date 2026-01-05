const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

router.get('/summary', auth, async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch Inventory Total
        const [inv] = await db.execute(
            'SELECT COALESCE(SUM(quantity * cost), 0) as inventoryValue FROM inventory WHERE user_id = ?',
            [userId]
        );

        // Fetch Expenses Total (The key is "totalExpenses")
        const [exp] = await db.execute(
            'SELECT COALESCE(SUM(amount), 0) as totalExpenses FROM expenses WHERE user_id = ?',
            [userId]
        );

        // Fetch Tasks Count
        const [tasks] = await db.execute(
            'SELECT COUNT(*) as taskCount FROM tasks WHERE user_id = ?',
            [userId]
        );

        // Fetch Expenses by Category
        const [expenseBreakdown] = await db.execute(
            'SELECT category, SUM(amount) as total FROM expenses WHERE user_id = ? GROUP BY category',
            [userId]
        );

        // Send a clean object to the frontend
        res.json({
            username: req.user.username,
            inventoryValue: inv[0].inventoryValue,
            totalExpenses: exp[0].totalExpenses,
            taskCount: tasks[0].taskCount,
            expenseBreakdown: expenseBreakdown
        });
    } catch (err) {
        console.error("Dashboard SQL Error:", err.message);
        res.status(500).json({ error: "Failed to load dashboard data" });
    }
});

module.exports = router;