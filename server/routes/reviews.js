const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// Add a review
router.post('/:transaction_id', auth, async (req, res) => {
    try {
        const { rating, comment } = req.body;
        if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });

        const [txn] = await db.execute('SELECT * FROM transactions WHERE id = ?', [req.params.transaction_id]);
        if (txn.length === 0) return res.status(404).json({ error: 'Transaction not found' });
        
        // Only buyer can review seller
        if (txn[0].buyer_id !== req.user.id) {
            return res.status(403).json({ error: 'Only the buyer can leave a review' });
        }

        // Must be delivered
        if (txn[0].escrow_status !== 'released') {
            return res.status(400).json({ error: 'Can only review after delivery is confirmed' });
        }

        await db.execute(
            'INSERT INTO reviews (transaction_id, reviewer_id, reviewee_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
            [req.params.transaction_id, req.user.id, txn[0].seller_id, rating, comment]
        );

        res.json({ message: 'Review submitted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get reviews for a user (farmer)
router.get('/user/:id', async (req, res) => {
    try {
        const [reviews] = await db.execute(
            `SELECT r.*, u.username as reviewer_name 
             FROM reviews r 
             JOIN users u ON r.reviewer_id = u.id 
             WHERE r.reviewee_id = ? 
             ORDER BY r.created_at DESC`,
            [req.params.id]
        );
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
