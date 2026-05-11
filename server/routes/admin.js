const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/admin');
const db = require('../config/db');

// ============================================================
// 0. POST /api/admin/login — Dedicated Admin Login
// ============================================================
router.post('/login', async (req, res) => {
    try {
        const { username, password, secret_key } = req.body;
        
        const ADMIN_USER = process.env.ADMIN_USERNAME || 'farmcentral_admin';
        const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'FC@dmin2026$ecure';
        const ADMIN_KEY  = process.env.ADMIN_SECRET_KEY || 'FARM-CTRL-X9K2-ADMIN-2026';

        if (username !== ADMIN_USER || password !== ADMIN_PASS || secret_key !== ADMIN_KEY) {
            return res.status(401).json({ error: 'Invalid admin credentials' });
        }

        // Find or create admin user in DB
        let [admins] = await db.execute("SELECT * FROM users WHERE role = 'admin' LIMIT 1");
        let adminUser;

        if (admins.length > 0) {
            adminUser = admins[0];
        } else {
            // Create a system admin account
            const [result] = await db.execute(
                "INSERT INTO users (username, email, password, role, status) VALUES (?, ?, ?, 'admin', 'active')",
                ['System Admin', 'admin@farmcentral.com', 'ADMIN_NO_PASSWORD_LOGIN']
            );
            adminUser = { id: result.insertId, username: 'System Admin' };
        }

        const token = jwt.sign(
            { id: adminUser.id, username: adminUser.username || 'Admin' },
            process.env.JWT_SECRET || 'default_super_secret_key_123',
            { expiresIn: '12h' }
        );

        res.json({ 
            token, 
            username: adminUser.username || 'Admin',
            message: 'Admin access granted' 
        });
    } catch (err) {
        console.error('Admin Login Error:', err.message);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// ============================================================
// HELPER: Safe query — returns empty array if table missing
// ============================================================
async function safeQuery(sql, params = []) {
    try {
        const [rows] = await db.execute(sql, params);
        return rows;
    } catch (e) {
        if (e.code === 'ER_NO_SUCH_TABLE') return [];
        throw e;
    }
}
async function safeCount(table) {
    try {
        const [[r]] = await db.execute(`SELECT COUNT(*) as c FROM ${table}`);
        return r.c;
    } catch { return 0; }
}

// ============================================================
// PUBLIC: GET /api/admin/stats/public — Landing page counters
// ============================================================
router.get('/stats/public', async (req, res) => {
    try {
        const totalUsers = await safeCount('users');
        let totalTrades = 0, tradeVolume = 0;
        try {
            const [[f]] = await db.execute('SELECT COUNT(*) as c, SUM(total_amount) as v FROM transactions');
            totalTrades = f.c || 0;
            tradeVolume = f.v || 0;
        } catch {}
        res.json({ totalUsers, totalTrades, tradeVolume });
    } catch {
        res.json({ totalUsers: 0, totalTrades: 0, tradeVolume: 0 });
    }
});

// ============================================================
// 1. GET /api/admin/users — Full User List
// ============================================================
router.get('/users', auth, isAdmin, async (req, res) => {
    try {
        const users = await safeQuery(`
            SELECT id, username, email, phone_number, google_id, 
                   created_at, role, kyc_status, wallet_balance, status 
            FROM users ORDER BY created_at DESC
        `);
        res.json(users);
    } catch (err) {
        console.error("Admin Users Error:", err.message);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// ============================================================
// 2. GET /api/admin/users/:id — Full User Detail (all data)
// ============================================================
router.get('/users/:id', auth, isAdmin, async (req, res) => {
    try {
        const uid = req.params.id;
        const [user] = await safeQuery('SELECT * FROM users WHERE id = ?', [uid]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Gather all user data in parallel
        const [transactions, kyc, inventory, expenses, disputes, payouts, tasks, scans] = await Promise.all([
            safeQuery('SELECT * FROM transactions WHERE buyer_id = ? OR seller_id = ? ORDER BY created_at DESC LIMIT 50', [uid, uid]),
            safeQuery('SELECT * FROM kyc_documents WHERE user_id = ? ORDER BY uploaded_at DESC', [uid]),
            safeQuery('SELECT * FROM inventory WHERE user_id = ? ORDER BY created_at DESC', [uid]),
            safeQuery('SELECT * FROM expenses WHERE user_id = ? ORDER BY created_at DESC LIMIT 30', [uid]),
            safeQuery('SELECT * FROM disputes WHERE complainant_id = ? OR respondent_id = ? ORDER BY created_at DESC', [uid, uid]),
            safeQuery('SELECT * FROM payout_requests WHERE user_id = ? ORDER BY created_at DESC', [uid]),
            safeQuery('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [uid]),
            safeQuery('SELECT * FROM satellite_scans WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', [uid]),
        ]);

        // Remove password hash from response
        delete user.password;

        res.json({ user, transactions, kyc, inventory, expenses, disputes, payouts, tasks, scans });
    } catch (err) {
        console.error("User Detail Error:", err.message);
        res.status(500).json({ error: "Failed to fetch user details" });
    }
});

// ============================================================
// 3. POST /api/admin/users/status/:userId — Ban/Unban User
// ============================================================
router.post('/users/status/:userId', auth, isAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        await db.execute('UPDATE users SET status = ? WHERE id = ?', [status, req.params.userId]);
        
        // Audit log
        try {
            await db.execute(
                'INSERT INTO kyc_verification_logs (user_id, admin_id, action, reason) VALUES (?, ?, ?, ?)', 
                [req.params.userId, req.user.id, `user_${status}`, `Admin #${req.user.id} set status to ${status}`]
            );
        } catch(e) { /* log table may not exist yet */ }
            
        res.json({ message: `User status updated to ${status}` });
    } catch (err) {
        res.status(500).json({ error: "Failed to update user status" });
    }
});

// ============================================================
// 4. POST /api/admin/users/role/:userId — Change User Role
// ============================================================
router.post('/users/role/:userId', auth, isAdmin, async (req, res) => {
    try {
        const { role } = req.body;
        await db.execute('UPDATE users SET role = ? WHERE id = ?', [role, req.params.userId]);
        try {
            await db.execute(
                'INSERT INTO kyc_verification_logs (user_id, admin_id, action, reason) VALUES (?, ?, ?, ?)',
                [req.params.userId, req.user.id, 'role_changed', `Role set to ${role}`]
            );
        } catch(e) {}
        res.json({ message: `Role updated to ${role}` });
    } catch (err) {
        res.status(500).json({ error: "Failed to update role" });
    }
});

// ============================================================
// 5. DELETE /api/admin/users/:userId — Delete User
// ============================================================
router.delete('/users/:userId', auth, isAdmin, async (req, res) => {
    try {
        const uid = req.params.userId;
        // Don't allow deleting self
        if (parseInt(uid) === req.user.id) return res.status(400).json({ error: "Cannot delete yourself" });
        
        await db.execute('DELETE FROM users WHERE id = ?', [uid]);
        try {
            await db.execute(
                'INSERT INTO kyc_verification_logs (user_id, admin_id, action, reason) VALUES (?, ?, ?, ?)',
                [uid, req.user.id, 'user_deleted', `User permanently deleted by admin`]
            );
        } catch(e) {}
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete user" });
    }
});

// ============================================================
// 6. GET /api/admin/stats — Platform Analytics
// ============================================================
router.get('/stats', auth, isAdmin, async (req, res) => {
    try {
        const users = await safeCount('users');
        const listings = await safeCount('trade_listings');
        const scans = await safeCount('satellite_scans');
        const disputes = await safeCount('disputes');

        // Financial data — try ledger first, fall back to transactions
        let total_volume = 0, total_revenue = 0, total_trades = 0, escrow_held = 0;
        try {
            const [[fin]] = await db.execute(`
                SELECT SUM(total_charged) as vol, SUM(commission_amount) as rev, COUNT(*) as trades
                FROM platform_commission_ledger
            `);
            total_volume = fin.vol || 0;
            total_revenue = fin.rev || 0;
            total_trades = fin.trades || 0;
        } catch {
            try {
                const [[fin]] = await db.execute(`
                    SELECT SUM(total_amount) as vol, SUM(commission_amount) as rev, COUNT(*) as trades
                    FROM transactions
                `);
                total_volume = fin.vol || 0;
                total_revenue = fin.rev || 0;
                total_trades = fin.trades || 0;
            } catch {}
        }

        try {
            const [[esc]] = await db.execute(`SELECT SUM(total_amount) as held FROM transactions WHERE escrow_status = 'held'`);
            escrow_held = esc.held || 0;
        } catch {}

        // Banned users count
        let banned = 0;
        try {
            const [[b]] = await db.execute("SELECT COUNT(*) as c FROM users WHERE status = 'banned'");
            banned = b.c;
        } catch {}

        res.json({
            summary: {
                users, listings, scans, disputes, banned,
                total_volume, total_revenue, total_trades, escrow_held
            }
        });
    } catch (err) {
        console.error("Admin Stats Error:", err.message);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
});

// ============================================================
// 7. GET /api/admin/audit-logs — Full Audit Trail
// ============================================================
router.get('/audit-logs', auth, isAdmin, async (req, res) => {
    try {
        const logs = await safeQuery(`
            SELECT l.*, u.username as admin_name, t.username as target_name
            FROM kyc_verification_logs l
            LEFT JOIN users u ON l.admin_id = u.id
            LEFT JOIN users t ON l.user_id = t.id
            ORDER BY l.created_at DESC LIMIT 200
        `);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch logs" });
    }
});

// ============================================================
// 8. GET /api/admin/transactions — All Platform Transactions
// ============================================================
router.get('/transactions', auth, isAdmin, async (req, res) => {
    try {
        const txns = await safeQuery(`
            SELECT t.*, 
                   b.username as buyer_name, s.username as seller_name
            FROM transactions t
            LEFT JOIN users b ON t.buyer_id = b.id
            LEFT JOIN users s ON t.seller_id = s.id
            ORDER BY t.created_at DESC LIMIT 200
        `);
        res.json(txns);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch transactions" });
    }
});

module.exports = router;
