const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/admin');

// Request payout
router.post('/request', auth, async (req, res) => {
    try {
        const { amount, method } = req.body; // method: 'upi' or 'bank_transfer'
        if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

        // Verify balance
        const [users] = await db.execute('SELECT wallet_balance, upi_id, bank_account, ifsc_code FROM users WHERE id = ?', [req.user.id]);
        if (users[0].wallet_balance < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        const user = users[0];
        const payoutMethod = method || (user.upi_id ? 'upi' : 'bank_transfer');

        // Create payout request
        const [result] = await db.execute(
            'INSERT INTO payout_requests (user_id, amount, payout_method, bank_account, ifsc_code, upi_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, amount, payoutMethod, user.bank_account, user.ifsc_code, user.upi_id, 'pending']
        );

        // Deduct from wallet
        await db.execute('UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?', [amount, req.user.id]);

        res.json({ message: 'Payout requested successfully', request_id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user payouts
router.get('/my', auth, async (req, res) => {
    try {
        const [payouts] = await db.execute(
            'SELECT * FROM payout_requests WHERE user_id = ? ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json(payouts);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// --- ADMIN ROUTES ---

// Get all pending payouts (Admin only)
router.get('/admin/pending', auth, isAdmin, async (req, res) => {
    try {
        const [payouts] = await db.execute(
            `SELECT p.*, u.username, u.email 
             FROM payout_requests p
             JOIN users u ON p.user_id = u.id
             WHERE p.status = 'pending'
             ORDER BY p.created_at ASC`
        );
        res.json(payouts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Approve payout (Admin only)
router.post('/admin/approve/:id', auth, isAdmin, async (req, res) => {
    try {
        const { reference_id, notes } = req.body;
        await db.execute(
            'UPDATE payout_requests SET status = ?, processed_at = NOW(), reference_id = ?, notes = ? WHERE id = ?',
            ['completed', reference_id || null, notes || null, req.params.id]
        );
        res.json({ message: 'Payout marked as completed' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Reject payout (Admin only)
router.post('/admin/reject/:id', auth, isAdmin, async (req, res) => {
    try {
        const { notes } = req.body;
        
        // Find payout to get amount and user_id
        const [payouts] = await db.execute('SELECT * FROM payout_requests WHERE id = ?', [req.params.id]);
        if (payouts.length === 0) return res.status(404).json({ error: 'Payout request not found' });
        const payout = payouts[0];

        if (payout.status !== 'pending') {
            return res.status(400).json({ error: 'Can only reject pending payouts' });
        }

        // Mark as failed/rejected
        await db.execute(
            'UPDATE payout_requests SET status = ?, processed_at = NOW(), notes = ? WHERE id = ?',
            ['failed', notes || 'Rejected by admin', req.params.id]
        );

        // Refund the wallet
        await db.execute('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?', [payout.amount, payout.user_id]);

        res.json({ message: 'Payout rejected and funds refunded to wallet' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
