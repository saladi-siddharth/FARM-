const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    let token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: "Access Denied. Please login first." });

    // Strip "Bearer " prefix if present (sent by some clients)
    if (token.startsWith('Bearer ')) {
        token = token.slice(7);
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified; // Contains { id, username }
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: "Session expired. Please login again." });
        }
        res.status(401).json({ error: "Invalid Token. Please login again." });
    }
};