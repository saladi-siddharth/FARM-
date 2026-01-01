const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const sendAlert = require('../utils/mailer');

// SIGN UP (New Farmer Registration)
router.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const hashedPass = await bcrypt.hash(password, 10);
        
        await db.execute(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPass]
        );
        
        res.status(201).json({ message: "Registration successful! Please login." });
    } catch (err) {
        console.error("Signup Error:", err.message);
        res.status(400).json({ error: "Registration failed. Email may be taken." });
    }
});

// SIGN IN (Login + Email Alert)
router.post('/signin', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) return res.status(404).json({ error: "User not found" });

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

        const token = jwt.sign(
            { id: user.id, username: user.username }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );

        // --- TRIGGER LOGIN EMAIL ALERT ---
        await sendAlert(
            user.email, 
            "Login Alert: Smart Farm", 
            `Hello ${user.username}, a successful login was recorded on ${new Date().toLocaleString()}.`
        );

        res.json({ token, username: user.username });
    } catch (err) {
        console.error("Login Error:", err.message);
        res.status(500).json({ error: "Server error during signin" });
    }
});

module.exports = router;