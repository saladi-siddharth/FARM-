/**
 * ============================================================
 * SHIPMENT TRACKING ROUTES
 * ============================================================
 * Farmer creates/updates shipment, buyer tracks & confirms delivery
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../config/db');

// ============================================================
// 1. CREATE SHIPMENT (Farmer initiates after sale)
// ============================================================
router.post('/:txnId/create', auth, async (req, res) => {
    try {
        const txnId = req.params.txnId;
        const userId = req.user.id;

        // Verify the transaction belongs to this seller
        const [txns] = await db.execute(
            'SELECT * FROM transactions WHERE id = ? AND seller_id = ?',
            [txnId, userId]
        );
        if (txns.length === 0) {
            return res.status(404).json({ error: 'Transaction not found or not your sale.' });
        }

        // Check if shipment already exists
        const [existing] = await db.execute(
            'SELECT id FROM shipments WHERE transaction_id = ?',
            [txnId]
        );
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Shipment already created for this order.', shipment_id: existing[0].id });
        }

        const {
            carrier_name, tracking_number, tracking_url,
            estimated_delivery, pickup_address, delivery_address,
            weight_kg, notes
        } = req.body;

        const [result] = await db.execute(`
            INSERT INTO shipments 
            (transaction_id, seller_id, buyer_id, carrier_name, tracking_number, tracking_url,
             estimated_delivery, pickup_address, delivery_address, weight_kg, notes, current_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'preparing')
        `, [
            txnId, userId, txns[0].buyer_id,
            carrier_name || 'Self Delivery', tracking_number || null,
            tracking_url || null, estimated_delivery || null,
            pickup_address || null, delivery_address || null,
            weight_kg || null, notes || null
        ]);

        // Link shipment to transaction
        await db.execute(
            'UPDATE transactions SET shipment_id = ? WHERE id = ?',
            [result.insertId, txnId]
        );

        // Add first event
        await db.execute(`
            INSERT INTO shipment_events (shipment_id, event_type, title, description, created_by)
            VALUES (?, 'preparing', 'Order Received', 'Farmer is preparing your goods for shipment.', ?)
        `, [result.insertId, userId]);

        console.log(`📦 Shipment created: #${result.insertId} for Transaction #${txnId}`);
        res.status(201).json({
            message: 'Shipment created successfully!',
            shipment_id: result.insertId
        });

    } catch (err) {
        console.error('Create Shipment Error:', err.message);
        res.status(500).json({ error: 'Failed to create shipment.' });
    }
});

// ============================================================
// 2. UPDATE SHIPMENT STATUS (Farmer adds tracking events)
// ============================================================
router.post('/:txnId/update', auth, async (req, res) => {
    try {
        const txnId = req.params.txnId;
        const userId = req.user.id;

        // Get shipment for this transaction
        const [shipments] = await db.execute(
            'SELECT * FROM shipments WHERE transaction_id = ? AND seller_id = ?',
            [txnId, userId]
        );

        if (shipments.length === 0) {
            return res.status(404).json({ error: 'Shipment not found.' });
        }

        const shipment = shipments[0];
        const { event_type, title, description, location, tracking_number, carrier_name } = req.body;

        if (!event_type || !title) {
            return res.status(400).json({ error: 'Event type and title are required.' });
        }

        // Determine new shipment status based on event
        const statusMap = {
            'preparing': 'preparing',
            'picked_up': 'shipped',
            'in_transit': 'in_transit',
            'hub_reached': 'in_transit',
            'out_for_delivery': 'out_for_delivery',
            'delivered': 'delivered',
            'issue': 'issue_reported'
        };

        const newStatus = statusMap[event_type] || shipment.current_status;

        // Update shipment status
        let updateQuery = 'UPDATE shipments SET current_status = ?';
        let updateParams = [newStatus];

        if (tracking_number) {
            updateQuery += ', tracking_number = ?';
            updateParams.push(tracking_number);
        }
        if (carrier_name) {
            updateQuery += ', carrier_name = ?';
            updateParams.push(carrier_name);
        }
        if (event_type === 'delivered') {
            updateQuery += ', actual_delivery = CURDATE()';
        }

        updateQuery += ' WHERE id = ?';
        updateParams.push(shipment.id);

        await db.execute(updateQuery, updateParams);

        // Add timeline event
        await db.execute(`
            INSERT INTO shipment_events (shipment_id, event_type, title, description, location, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [shipment.id, event_type, title, description || null, location || null, userId]);

        // Update transaction status
        if (event_type === 'picked_up' || event_type === 'in_transit') {
            await db.execute("UPDATE transactions SET status = 'in_transit' WHERE id = ?", [txnId]);
        } else if (event_type === 'delivered') {
            await db.execute("UPDATE transactions SET status = 'delivered' WHERE id = ?", [txnId]);
        }

        console.log(`🚚 Shipment #${shipment.id} updated: ${event_type}`);
        res.json({ message: 'Shipment updated!', status: newStatus });

    } catch (err) {
        console.error('Update Shipment Error:', err.message);
        res.status(500).json({ error: 'Failed to update shipment.' });
    }
});

// ============================================================
// 3. GET SHIPMENT TRACKING (Full timeline — buyer or seller)
// ============================================================
router.get('/:txnId', auth, async (req, res) => {
    try {
        const txnId = req.params.txnId;
        const userId = req.user.id;

        // Get shipment (accessible by buyer or seller)
        const [shipments] = await db.execute(`
            SELECT s.*, 
                   seller.username AS seller_name, buyer.username AS buyer_name,
                   t.total_amount, t.commission_amount, t.net_farmer_amount,
                   t.order_id, l.crop_name, l.price_per_unit
            FROM shipments s
            JOIN transactions t ON s.transaction_id = t.id
            JOIN trade_listings l ON t.listing_id = l.id
            JOIN users seller ON s.seller_id = seller.id
            JOIN users buyer ON s.buyer_id = buyer.id
            WHERE s.transaction_id = ? AND (s.seller_id = ? OR s.buyer_id = ?)
        `, [txnId, userId, userId]);

        if (shipments.length === 0) {
            return res.status(404).json({ error: 'Shipment not found.' });
        }

        // Get timeline events
        const [events] = await db.execute(`
            SELECT event_type, title, description, location, created_at
            FROM shipment_events
            WHERE shipment_id = ?
            ORDER BY created_at ASC
        `, [shipments[0].id]);

        res.json({
            shipment: shipments[0],
            timeline: events,
            is_seller: shipments[0].seller_id === userId
        });

    } catch (err) {
        console.error('Get Shipment Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch tracking details.' });
    }
});

// ============================================================
// 4. CONFIRM DELIVERY (Buyer confirms — releases escrow)
// ============================================================
router.post('/:txnId/confirm-delivery', auth, async (req, res) => {
    try {
        const txnId = req.params.txnId;
        const userId = req.user.id;

        // Verify buyer
        const [txns] = await db.execute(
            'SELECT * FROM transactions WHERE id = ? AND buyer_id = ?',
            [txnId, userId]
        );
        if (txns.length === 0) {
            return res.status(404).json({ error: 'Transaction not found.' });
        }

        const txn = txns[0];
        if (txn.escrow_status === 'released') {
            return res.status(400).json({ error: 'Payment already released.' });
        }

        // Update transaction
        await db.execute(`
            UPDATE transactions SET 
                status = 'completed', 
                escrow_status = 'released',
                delivery_confirmed_at = NOW()
            WHERE id = ?
        `, [txnId]);

        // Update shipment
        await db.execute(`
            UPDATE shipments SET current_status = 'delivery_confirmed' WHERE transaction_id = ?
        `, [txnId]);

        // Add confirmation event
        const [shipments] = await db.execute(
            'SELECT id FROM shipments WHERE transaction_id = ?', [txnId]
        );
        if (shipments.length > 0) {
            await db.execute(`
                INSERT INTO shipment_events (shipment_id, event_type, title, description, created_by)
                VALUES (?, 'confirmed', 'Delivery Confirmed', 'Buyer confirmed receipt of goods. Payment released to farmer.', ?)
            `, [shipments[0].id, userId]);
        }

        // Credit farmer wallet
        const netAmount = txn.net_farmer_amount || txn.total_amount;
        await db.execute(
            'UPDATE users SET wallet_balance = wallet_balance + ?, total_sales = total_sales + 1 WHERE id = ?',
            [netAmount, txn.seller_id]
        );

        // Update buyer stats
        await db.execute(
            'UPDATE users SET total_purchases = total_purchases + 1 WHERE id = ?',
            [userId]
        );

        console.log(`✅ Delivery confirmed for Txn #${txnId} — ₹${netAmount} released to farmer`);
        res.json({
            message: 'Delivery confirmed! Payment released to farmer.',
            amount_released: netAmount
        });

    } catch (err) {
        console.error('Confirm Delivery Error:', err.message);
        res.status(500).json({ error: 'Failed to confirm delivery.' });
    }
});

// ============================================================
// 5. GET MY SHIPMENTS (As seller — all my active shipments)
// ============================================================
router.get('/my/seller', auth, async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT s.id, s.transaction_id, s.current_status, s.carrier_name, s.tracking_number,
                   s.estimated_delivery, s.created_at,
                   t.total_amount, t.quantity, t.order_id,
                   l.crop_name, buyer.username AS buyer_name
            FROM shipments s
            JOIN transactions t ON s.transaction_id = t.id
            JOIN trade_listings l ON t.listing_id = l.id
            JOIN users buyer ON s.buyer_id = buyer.id
            WHERE s.seller_id = ?
            ORDER BY s.created_at DESC
        `, [req.user.id]);

        res.json(rows);
    } catch (err) {
        console.error('My Seller Shipments Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch shipments.' });
    }
});

// ============================================================
// 6. GET MY SHIPMENTS (As buyer — tracking my purchases)
// ============================================================
router.get('/my/buyer', auth, async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT s.id, s.transaction_id, s.current_status, s.carrier_name, s.tracking_number,
                   s.estimated_delivery, s.actual_delivery, s.created_at,
                   t.total_amount, t.quantity, t.order_id, t.escrow_status,
                   l.crop_name, seller.username AS seller_name
            FROM shipments s
            JOIN transactions t ON s.transaction_id = t.id
            JOIN trade_listings l ON t.listing_id = l.id
            JOIN users seller ON s.seller_id = seller.id
            WHERE s.buyer_id = ?
            ORDER BY s.created_at DESC
        `, [req.user.id]);

        res.json(rows);
    } catch (err) {
        console.error('My Buyer Shipments Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch tracking.' });
    }
});

module.exports = router;
