const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireKYC } = require('../middleware/kyc');
const db = require('../config/db');

// ============================================================
// TRADE HUB — Full Marketplace API with Commission & KYC
// ============================================================

const COMMISSION_RATE = 0.05; // 5% platform commission

// Helper: Generate Order ID
function generateOrderId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `FC-${timestamp}-${random}`;
}

// Helper: Time ago
function timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' min ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hrs ago';
    return Math.floor(seconds / 86400) + ' days ago';
}

// ============================================================
// 1. GET ALL ACTIVE LISTINGS (Public Marketplace)
// ============================================================
router.get('/listings', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT t.id, t.crop_name AS crop, t.quantity AS qty, t.price_per_unit AS price, 
                   t.description AS desc, t.location, t.grade, t.type, t.image,
                   t.min_order_qty, t.delivery_time_days, t.is_organic, t.certification,
                   t.views_count, t.category, t.created_at,
                   u.username AS seller, u.id AS seller_id,
                   u.kyc_status AS seller_kyc, u.trust_score AS seller_rating,
                   u.total_sales AS seller_sales
            FROM trade_listings t 
            JOIN users u ON t.seller_id = u.id 
            WHERE t.status = 'active' 
            ORDER BY t.created_at DESC
        `);

        const formatted = rows.map(r => ({
            ...r,
            date: timeAgo(r.created_at),
            commission_rate: COMMISSION_RATE,
            estimated_commission: Math.round(r.price * r.qty * COMMISSION_RATE * 100) / 100,
            total_with_commission: Math.round(r.price * r.qty * (1 + COMMISSION_RATE) * 100) / 100,
            seller_verified: r.seller_kyc === 'verified'
        }));

        res.json(formatted);
    } catch (err) {
        console.error("Fetch Listings Error:", err.message);
        res.status(500).json({ error: "Failed to fetch listings" });
    }
});

// ============================================================
// 2. GET MY LISTINGS (Requires Auth)
// ============================================================
router.get('/listings/my', auth, async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT id, crop_name AS crop, quantity AS qty, price_per_unit AS price, 
                   description AS desc, location, grade, type, image, status,
                   min_order_qty, delivery_time_days, is_organic, views_count,
                   category, created_at
            FROM trade_listings 
            WHERE seller_id = ? 
            ORDER BY created_at DESC
        `, [req.user.id]);
        res.json(rows);
    } catch (err) {
        console.error("My Listings Error:", err.message);
        res.status(500).json({ error: "Failed to fetch your listings" });
    }
});

// ============================================================
// 3. CREATE A NEW LISTING (Requires KYC)
// ============================================================
router.post('/listings', auth, requireKYC, async (req, res) => {
    try {
        const {
            crop_name, quantity, price, description, location,
            grade, type, image, category, min_order_qty,
            delivery_time_days, is_organic, certification
        } = req.body;

        if (!crop_name || !quantity || !price) {
            return res.status(400).json({ error: "Crop name, quantity, and price are required." });
        }

        const [result] = await db.execute(`
            INSERT INTO trade_listings 
            (seller_id, crop_name, quantity, price_per_unit, description, location, 
             grade, type, image, category, min_order_qty, delivery_time_days, 
             is_organic, certification) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            req.user.id, crop_name, quantity, price,
            description || '', location || '', grade || 'A',
            type || 'grain', image || null, category || 'grain',
            min_order_qty || 1, delivery_time_days || 3,
            is_organic ? 1 : 0, certification || null
        ]);

        res.status(201).json({ message: "Listing created successfully!", id: result.insertId });
    } catch (err) {
        console.error("Create Listing Error:", err.message);
        res.status(500).json({ error: "Failed to create listing" });
    }
});

// ============================================================
// 4. DELETE MY LISTING
// ============================================================
router.delete('/listings/:id', auth, async (req, res) => {
    try {
        const [result] = await db.execute(
            "DELETE FROM trade_listings WHERE id = ? AND seller_id = ?",
            [req.params.id, req.user.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Listing not found or not yours." });
        }
        res.json({ message: "Listing removed." });
    } catch (err) {
        console.error("Delete Listing Error:", err.message);
        res.status(500).json({ error: "Failed to remove listing" });
    }
});

// ============================================================
// 5. BUY A LISTING — 5% Commission + KYC Enforced + Escrow
// ============================================================
router.post('/buy/:id', auth, requireKYC, async (req, res) => {
    try {
        const listingId = req.params.id;
        const buyerId = req.user.id;
        const { order_qty } = req.body;

        // Validate listing
        const [listings] = await db.execute(
            "SELECT * FROM trade_listings WHERE id = ? AND status = 'active'",
            [listingId]
        );
        if (listings.length === 0) {
            return res.status(404).json({ error: "Listing not found or already sold." });
        }

        const listing = listings[0];

        // Cannot buy own crop
        if (listing.seller_id === buyerId) {
            return res.status(400).json({ error: "Cannot buy your own crop." });
        }

        // Verify seller KYC
        const [seller] = await db.execute(
            'SELECT kyc_status FROM users WHERE id = ?', [listing.seller_id]
        );
        if (seller[0]?.kyc_status !== 'verified') {
            return res.status(400).json({ error: "Seller's KYC is not verified. Trade blocked." });
        }

        const qty = parseFloat(order_qty) || listing.quantity;

        // Validate quantity
        if (qty > listing.quantity) {
            return res.status(400).json({ error: "Quantity exceeds available stock." });
        }
        if (listing.min_order_qty && qty < listing.min_order_qty) {
            return res.status(400).json({ error: `Minimum order quantity is ${listing.min_order_qty} kg.` });
        }

        // ===== COMMISSION CALCULATION =====
        const subtotal = Math.round(qty * listing.price_per_unit * 100) / 100;
        const commissionAmount = Math.round(subtotal * COMMISSION_RATE * 100) / 100;
        const totalPayable = Math.round((subtotal + commissionAmount) * 100) / 100;
        const netFarmerAmount = subtotal; // Farmer gets full subtotal

        const orderId = generateOrderId();

        // Update listing stock
        if (qty >= listing.quantity) {
            await db.execute("UPDATE trade_listings SET status = 'sold' WHERE id = ?", [listingId]);
        } else {
            await db.execute("UPDATE trade_listings SET quantity = quantity - ? WHERE id = ?", [qty, listingId]);
        }

        // Record transaction with commission
        const [txnResult] = await db.execute(`
            INSERT INTO transactions 
            (listing_id, buyer_id, seller_id, total_amount, quantity, status,
             commission_rate, commission_amount, net_farmer_amount, escrow_status, 
             order_id, buyer_kyc_verified, seller_kyc_verified) 
            VALUES (?, ?, ?, ?, ?, 'processing', ?, ?, ?, 'held', ?, 1, 1)
        `, [
            listingId, buyerId, listing.seller_id, totalPayable, qty,
            COMMISSION_RATE, commissionAmount, netFarmerAmount, orderId
        ]);

        // Record in commission ledger
        await db.execute(`
            INSERT INTO platform_commission_ledger 
            (transaction_id, order_id, subtotal, commission_rate, commission_amount, total_charged)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [txnResult.insertId, orderId, subtotal, COMMISSION_RATE, commissionAmount, totalPayable]);

        console.log(`💰 Trade: ${qty}kg from listing ${listingId}`);
        console.log(`   Subtotal: ₹${subtotal} | Commission (5%): ₹${commissionAmount} | Total: ₹${totalPayable}`);
        console.log(`   Order ID: ${orderId}`);

        // Emit live social proof
        if (req.io) {
            req.io.emit('live-activity', {
                type: 'trade',
                message: `✅ A secure escrow trade for ${qty}kg of ${listing.crop_name} was just processed!`,
                time: new Date()
            });
        }

        res.json({
            message: "Purchase successful!",
            order_id: orderId,
            transaction_id: txnResult.insertId,
            breakdown: {
                quantity: qty,
                price_per_unit: listing.price_per_unit,
                subtotal: subtotal,
                commission_rate: `${COMMISSION_RATE * 100}%`,
                commission_amount: commissionAmount,
                total_payable: totalPayable,
                farmer_receives: netFarmerAmount
            },
            escrow: 'Payment held in escrow. Will be released when you confirm delivery.'
        });

    } catch (err) {
        console.error("Buy Error:", err.message);
        res.status(500).json({ error: "Transaction failed. Please try again." });
    }
});

// ============================================================
// 6. GET MY ORDERS (Purchase History with Commission Details)
// ============================================================
router.get('/orders', auth, async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT t.id, t.total_amount, t.quantity, t.status, t.created_at,
                   t.commission_amount, t.net_farmer_amount, t.escrow_status,
                   t.order_id, t.delivery_confirmed_at, t.shipment_id,
                   l.crop_name, l.price_per_unit, l.location, l.grade,
                   u.username AS seller_name, u.kyc_status AS seller_kyc,
                   u.trust_score AS seller_rating
            FROM transactions t
            JOIN trade_listings l ON t.listing_id = l.id
            JOIN users u ON t.seller_id = u.id
            WHERE t.buyer_id = ?
            ORDER BY t.created_at DESC
            LIMIT 50
        `, [req.user.id]);

        const formatted = rows.map(r => ({
            id: r.order_id || '#TRD-' + r.id,
            transaction_id: r.id,
            crop: `${r.crop_name} (${r.quantity}kg)`,
            amount: `₹${Number(r.total_amount).toLocaleString()}`,
            commission: `₹${Number(r.commission_amount || 0).toLocaleString()}`,
            farmer_gets: `₹${Number(r.net_farmer_amount || 0).toLocaleString()}`,
            status: r.status,
            escrow: r.escrow_status || 'held',
            seller: r.seller_name,
            seller_verified: r.seller_kyc === 'verified',
            seller_rating: r.seller_rating,
            location: r.location,
            grade: r.grade,
            has_shipment: !!r.shipment_id,
            delivery_confirmed: !!r.delivery_confirmed_at,
            date: new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        }));

        res.json(formatted);
    } catch (err) {
        console.error("Orders Error:", err.message);
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});

// ============================================================
// 7. GET MY SALES (Farmer's sold items with earnings)
// ============================================================
router.get('/sales', auth, async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT t.id, t.total_amount, t.quantity, t.status, t.created_at,
                   t.commission_amount, t.net_farmer_amount, t.escrow_status,
                   t.order_id, t.delivery_confirmed_at,
                   l.crop_name, l.price_per_unit,
                   u.username AS buyer_name
            FROM transactions t
            JOIN trade_listings l ON t.listing_id = l.id
            JOIN users u ON t.buyer_id = u.id
            WHERE t.seller_id = ?
            ORDER BY t.created_at DESC
            LIMIT 50
        `, [req.user.id]);

        // Calculate summary
        let totalEarnings = 0;
        let pendingEscrow = 0;
        let releasedEarnings = 0;

        const formatted = rows.map(r => {
            const net = Number(r.net_farmer_amount || 0);
            totalEarnings += net;
            if (r.escrow_status === 'released') releasedEarnings += net;
            else pendingEscrow += net;

            return {
                id: r.order_id || '#TRD-' + r.id,
                transaction_id: r.id,
                crop: r.crop_name,
                quantity: r.quantity,
                total: Number(r.total_amount),
                commission: Number(r.commission_amount || 0),
                you_receive: net,
                status: r.status,
                escrow: r.escrow_status || 'held',
                buyer: r.buyer_name,
                delivered: !!r.delivery_confirmed_at,
                date: new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            };
        });

        res.json({
            sales: formatted,
            summary: {
                total_sales: formatted.length,
                total_earnings: totalEarnings,
                pending_escrow: pendingEscrow,
                released_earnings: releasedEarnings
            }
        });
    } catch (err) {
        console.error("Sales Error:", err.message);
        res.status(500).json({ error: "Failed to fetch sales" });
    }
});

// ============================================================
// 8. GET COMMISSION INFO (Public — for UI display)
// ============================================================
router.get('/commission-info', (req, res) => {
    res.json({
        rate: COMMISSION_RATE,
        percentage: `${COMMISSION_RATE * 100}%`,
        description: 'Platform fee charged on all transactions. Paid by buyer on top of goods price.',
        benefits: [
            'Escrow payment protection',
            'KYC-verified buyers & sellers',
            'Dispute resolution support',
            'Real-time shipment tracking',
            'Quality assurance guarantee'
        ]
    });
});

// ============================================================
// 9. CALCULATE PRICE (Preview commission before purchase)
// ============================================================
router.post('/calculate', (req, res) => {
    const { quantity, price_per_unit } = req.body;
    if (!quantity || !price_per_unit) {
        return res.status(400).json({ error: 'Quantity and price required.' });
    }

    const subtotal = Math.round(quantity * price_per_unit * 100) / 100;
    const commission = Math.round(subtotal * COMMISSION_RATE * 100) / 100;
    const total = Math.round((subtotal + commission) * 100) / 100;

    res.json({
        subtotal,
        commission_rate: `${COMMISSION_RATE * 100}%`,
        commission_amount: commission,
        total_payable: total,
        farmer_receives: subtotal
    });
});

module.exports = router;
