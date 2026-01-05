const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// GET Events
router.get('/', auth, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM calendar_events WHERE user_id = ?', [req.user.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST Event
router.post('/', auth, async (req, res) => {
    try {
        const { title, start, end, color } = req.body;
        await db.execute(
            'INSERT INTO calendar_events (user_id, title, start_date, end_date, color) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, title, start, end || null, color || '#3B82F6']
        );
        res.status(201).json({ message: "Event Saved" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE Event
router.delete('/:id', auth, async (req, res) => {
    try {
        await db.execute('DELETE FROM calendar_events WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ message: "Event Deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
