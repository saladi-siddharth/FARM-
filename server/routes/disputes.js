const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/admin');

// Create a dispute
router.post('/:transaction_id', auth, async (req, res) => {
    try {
        const { reason, description } = req.body;
        const [txns] = await db.execute('SELECT * FROM transactions WHERE id = ?', [req.params.transaction_id]);
        
        if (txns.length === 0) return res.status(404).json({ error: 'Transaction not found' });
        const txn = txns[0];
        
        // Ensure user is either buyer or seller
        let against_user;
        if (txn.buyer_id === req.user.id) {
            against_user = txn.seller_id;
        } else if (txn.seller_id === req.user.id) {
            against_user = txn.buyer_id;
        } else {
            return res.status(403).json({ error: 'Unauthorized to dispute this transaction' });
        }

        const [result] = await db.execute(
            'INSERT INTO disputes (transaction_id, filed_by, against_user, reason, description) VALUES (?, ?, ?, ?, ?)',
            [req.params.transaction_id, req.user.id, against_user, reason, description]
        );

        // Update transaction escrow status
        await db.execute('UPDATE transactions SET escrow_status = ? WHERE id = ?', ['disputed', req.params.transaction_id]);

        res.json({ message: 'Dispute raised successfully', dispute_id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get disputes for user
router.get('/my', auth, async (req, res) => {
    try {
        const [disputes] = await db.execute(
            `SELECT d.*, t.crop_name, t.total_amount 
             FROM disputes d 
             JOIN transactions t ON d.transaction_id = t.id 
             WHERE d.filed_by = ? OR t.buyer_id = ? OR t.seller_id = ?
             ORDER BY d.created_at DESC`,
            [req.user.id, req.user.id, req.user.id]
        );
        res.json(disputes);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// --- ADMIN ROUTES ---

// Get all disputes (Admin only)
router.get('/admin/all', auth, isAdmin, async (req, res) => {
    try {
        const [disputes] = await db.execute(
            `SELECT d.*, t.crop_name, t.total_amount, 
                    u1.username as filer_name, u2.username as against_name
             FROM disputes d
             JOIN transactions t ON d.transaction_id = t.id
             JOIN users u1 ON d.filed_by = u1.id
             JOIN users u2 ON d.against_user = u2.id
             ORDER BY d.created_at DESC`
        );
        res.json(disputes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Resolve a dispute (Admin only)
router.post('/admin/resolve/:id', auth, isAdmin, async (req, res) => {
    try {
        const { resolution_notes, action, refund_amount } = req.body;
        // action can be: 'refund', 'reject', 'partial'
        
        const [disputes] = await db.execute('SELECT * FROM disputes WHERE id = ?', [req.params.id]);
        if (disputes.length === 0) return res.status(404).json({ error: 'Dispute not found' });
        const dispute = disputes[0];

        let status = 'closed';
        let escrow_status = 'released';

        if (action === 'refund') {
            status = 'resolved_refund';
            escrow_status = 'refunded';
            // Logic to refund would go here (e.g. adding back to buyer's wallet)
        } else if (action === 'reject') {
            status = 'resolved_rejected';
            escrow_status = 'released';
        } else if (action === 'partial') {
            status = 'resolved_partial';
            escrow_status = 'released'; // Usually means partially released, partially refunded
        }

        await db.execute(
            'UPDATE disputes SET status = ?, resolution_notes = ?, resolved_by = ?, resolved_at = NOW(), refund_amount = ? WHERE id = ?',
            [status, resolution_notes, req.user.id, refund_amount || 0, req.params.id]
        );

        await db.execute('UPDATE transactions SET escrow_status = ? WHERE id = ?', [escrow_status, dispute.transaction_id]);

        res.json({ message: 'Dispute resolved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
