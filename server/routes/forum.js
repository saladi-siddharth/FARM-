const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// GET Posts
router.get('/', auth, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM forum_posts ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST Post
router.post('/', auth, async (req, res) => {
    try {
        const { content } = req.body;
        // Get username from users table to store in post for simpler display
        const [user] = await db.execute('SELECT username FROM users WHERE id = ?', [req.user.id]);

        await db.execute(
            'INSERT INTO forum_posts (user_id, username, content) VALUES (?, ?, ?)',
            [req.user.id, user[0].username, content]
        );
        res.status(201).json({ message: "Post Shared" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE Post
router.delete('/:id', auth, async (req, res) => {
    try {
        // Only allow deleting own posts
        await db.execute('DELETE FROM forum_posts WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ message: "Post Deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
