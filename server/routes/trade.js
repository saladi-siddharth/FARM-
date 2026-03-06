const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../config/db');

// ============================================================
// TRADE HUB — Full Real Product API
// ============================================================

// 1. GET ALL ACTIVE LISTINGS (Public Marketplace)
router.get('/listings', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT t.id, t.crop_name AS crop, t.quantity AS qty, t.price_per_unit AS price, 
                   t.description AS desc, t.location, t.grade, t.type, t.image,
                   t.created_at, u.username AS seller, u.id AS seller_id 
            FROM trade_listings t 
            JOIN users u ON t.seller_id = u.id 
            WHERE t.status = 'active' 
            ORDER BY t.created_at DESC
        `);
        // Format date for frontend
        const formatted = rows.map(r => ({
            ...r,
            date: timeAgo(r.created_at)
        }));
        res.json(formatted);
    } catch (err) {
        console.error("Fetch Listings Error:", err.message);
        res.status(500).json({ error: "Failed to fetch listings" });
    }
});

// 2. GET MY LISTINGS
router.get('/listings/my', auth, async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT id, crop_name AS crop, quantity AS qty, price_per_unit AS price, 
                   description AS desc, location, grade, type, image, status, created_at
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

// 3. CREATE A NEW LISTING (Sell Crop)
router.post('/listings', auth, async (req, res) => {
    try {
        const { crop_name, quantity, price, description, location, grade, type, image } = req.body;
        if (!crop_name || !quantity || !price) {
            return res.status(400).json({ error: "Crop name, quantity, and price are required." });
        }

        const [result] = await db.execute(`
            INSERT INTO trade_listings (seller_id, crop_name, quantity, price_per_unit, description, location, grade, type, image) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [req.user.id, crop_name, quantity, price, description || '', location || '', grade || 'A', type || 'grain', image || null]);

        res.status(201).json({ message: "Listing created successfully!", id: result.insertId });
    } catch (err) {
        console.error("Create Listing Error:", err.message);
        res.status(500).json({ error: "Failed to create listing" });
    }
});

// 4. DELETE MY LISTING
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

// 5. BUY A LISTING (Create Transaction)
router.post('/buy/:id', auth, async (req, res) => {
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
        if (listing.seller_id === buyerId) {
            return res.status(400).json({ error: "Cannot buy your own crop." });
        }

        const qty = parseInt(order_qty) || listing.quantity;
        if (qty > listing.quantity) {
            return res.status(400).json({ error: "Quantity exceeds available stock." });
        }

        const totalValue = qty * listing.price_per_unit;

        // Update listing
        if (qty >= listing.quantity) {
            await db.execute("UPDATE trade_listings SET status = 'sold' WHERE id = ?", [listingId]);
        } else {
            await db.execute("UPDATE trade_listings SET quantity = quantity - ? WHERE id = ?", [qty, listingId]);
        }

        // Record transaction
        await db.execute(`
            INSERT INTO transactions (listing_id, buyer_id, seller_id, total_amount, quantity, status) 
            VALUES (?, ?, ?, ?, ?, 'processing')
        `, [listingId, buyerId, listing.seller_id, totalValue, qty]);

        console.log(`💰 Trade: ${qty}kg from listing ${listingId} sold for ₹${totalValue}`);
        res.json({ message: "Purchase successful!", total: totalValue, qty });

    } catch (err) {
        console.error("Buy Error:", err.message);
        res.status(500).json({ error: "Transaction failed. Please try again." });
    }
});

// 6. GET MY ORDERS (Purchase History)
router.get('/orders', auth, async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT t.id, t.total_amount, t.quantity, t.status, t.created_at,
                   l.crop_name, l.price_per_unit, l.location, l.grade,
                   u.username AS seller_name
            FROM transactions t
            JOIN trade_listings l ON t.listing_id = l.id
            JOIN users u ON t.seller_id = u.id
            WHERE t.buyer_id = ?
            ORDER BY t.created_at DESC
            LIMIT 50
        `, [req.user.id]);

        const formatted = rows.map(r => ({
            id: '#TRD-' + r.id,
            crop: `${r.crop_name} (${r.quantity}kg)`,
            amount: `₹${Number(r.total_amount).toLocaleString()}`,
            status: r.status === 'completed' ? 'Delivered' : r.status === 'processing' ? 'Processing' : 'In Transit',
            date: new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        }));

        res.json(formatted);
    } catch (err) {
        console.error("Orders Error:", err.message);
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});

// Helper: Time ago
function timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' min ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hrs ago';
    return Math.floor(seconds / 86400) + ' days ago';
}

module.exports = router;
