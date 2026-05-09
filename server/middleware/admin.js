const db = require('../config/db');

module.exports = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const [users] = await db.execute('SELECT role FROM users WHERE id = ?', [req.user.id]);
        
        if (users.length === 0 || users[0].role !== 'admin') {
            return res.status(403).json({ error: "Access Denied. Admin privileges required." });
        }

        next();
    } catch (err) {
        console.error("Admin Middleware Error:", err.message);
        res.status(500).json({ error: "Server error in admin verification" });
    }
};
