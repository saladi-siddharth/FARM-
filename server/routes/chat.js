const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// 1. Search Users
router.get('/search', auth, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);

        // Explicitly exclude the requesting user from results
        const [users] = await db.execute(
            'SELECT id, username FROM users WHERE username LIKE ? AND id != ? LIMIT 10',
            [`%${q}%`, req.user.id]
        );
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Get Conversation with specific user
router.get('/:userId', auth, async (req, res) => {
    try {
        const otherId = req.params.userId;
        const myId = req.user.id;

        if (otherId == myId) return res.status(400).json({ error: "Cannot chat with self" });

        const [rows] = await db.execute(`
            SELECT * FROM messages 
            WHERE (sender_id = ? AND receiver_id = ?) 
            OR (sender_id = ? AND receiver_id = ?)
            ORDER BY messaged_at ASC
        `, [myId, otherId, otherId, myId]);

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to load chat" });
    }
});

// 3. Send Message
router.post('/:userId', auth, async (req, res) => {
    try {
        const receiverId = req.params.userId;
        const senderId = req.user.id;
        const { content } = req.body;
        const senderName = req.user.username;

        if (receiverId == senderId) return res.status(400).json({ error: "Sending message to self is not allowed" });

        // Fetch receiver username for record keeping
        const [receiver] = await db.execute('SELECT username FROM users WHERE id = ?', [receiverId]);
        if (!receiver.length) return res.status(404).json({ error: "User not found" });

        await db.execute(
            'INSERT INTO messages (sender_id, receiver_id, sender_username, receiver_username, content) VALUES (?, ?, ?, ?, ?)',
            [senderId, receiverId, senderName, receiver[0].username, content]
        );

        res.json({ message: "Sent", timestamp: new Date() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to send" });
    }
});

module.exports = router;
