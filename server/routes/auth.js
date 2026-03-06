const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { sendAlert } = require('../utils/mailer');
const passport = require('passport');
const { validate, schemas } = require('../middleware/validator');
const { authLimiter } = require('../middleware/security');


// SIGN UP (New Farmer Registration)
router.post('/signup', authLimiter, validate(schemas.signup), async (req, res) => {
    try {
        const { username, email, password, phone_number } = req.body;

        const hashedPass = await bcrypt.hash(password, 10);

        await db.execute(
            'INSERT INTO users (username, email, password, phone_number) VALUES (?, ?, ?, ?)',
            [username, email, hashedPass, phone_number || null]
        );

        res.status(201).json({ message: "Registration successful! Please login." });
    } catch (err) {
        console.error("Signup Error:", err.message);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: "Email or username is already registered." });
        }
        res.status(500).json({ error: "Registration failed due to a server error." });
    }
});

// SIGN IN (Login + Email Alert)
router.post('/signin', authLimiter, validate(schemas.signin), async (req, res) => {
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

        // --- TRIGGER LOGIN EMAIL ALERT (Background) ---
        sendAlert(
            user.email,
            "Login Alert: Smart Farm",
            `Hello ${user.username}, a successful login was recorded on ${new Date().toLocaleString()}.`
        ).catch(e => console.log("Email error:", e.message));

        res.json({ token, username: user.username, email: user.email });
    } catch (err) {
        console.error("Login Error:", err.message);
        res.status(500).json({ error: "Server error during signin" });
    }
});

// FORGOT PASSWORD (Generate OTP)
router.post('/forgot-password', authLimiter, validate(schemas.forgotPassword), async (req, res) => {
    try {
        const { email } = req.body;
        const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ error: "User not found" });

        const user = users[0];
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP

        // Use Unix Timestamp (Seconds) for 1 hour from now - robust against timezone issues
        const expiresAt = Math.floor(Date.now() / 1000) + 3600;

        await db.query('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?', [otp, expiresAt, user.id]);

        await sendAlert(email, "Password Reset Request", `Your OTP for password reset is: ${otp}. It will expire in 1 hour.`);

        res.json({ message: "OTP sent to email" });
    } catch (err) {
        console.error("Forgot Password Error:", err.message);
        res.status(500).json({ error: "Failed to process request. Please try again later." });
    }
});

// RESET PASSWORD (Verify OTP & Change)
router.post('/reset-password', authLimiter, validate(schemas.resetPassword), async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ error: "User not found" });

        const user = users[0];

        // Robust comparison using Unix Timestamps (Seconds)
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const isExpired = user.reset_expires ? (Number(user.reset_expires) < currentTimestamp) : true;

        if (!user.reset_token || user.reset_token !== otp || isExpired) {
            return res.status(400).json({ error: "Invalid or expired OTP" });
        }

        const hashedPass = await bcrypt.hash(newPassword, 10);
        await db.execute('UPDATE users SET password = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?', [hashedPass, user.id]);

        res.json({ message: "Password reset successful! Please login." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

// TEST EMAIL ROUTE (For Debugging)
router.post('/test-email', validate(schemas.email), async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email required" });

        await sendAlert(email, "Test Email System", "If you are reading this, the SMTP configuration on Render is working correctly! 🚀");

        res.json({ message: "Test email command sent. Check server logs for success/failure." });
    } catch (err) {
        res.status(500).json({ error: "Failed to send test email" });
    }
});

// --- GOOGLE AUTH ROUTES ---
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login.html?error=GoogleAuthFailed' }),
    (req, res) => {
        // Successful authentication
        const user = req.user;
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // Send Login Alert (Async)
        sendAlert(
            user.email,
            "Login Alert: Smart Farm (Google)",
            `Hello ${user.username}, you signed in via Google on ${new Date().toLocaleString()}.`
        ).catch(e => console.log("Email error:", e.message));

        // Redirect to Dashboard with Token
        res.redirect(`/dashboard.html?token=${token}&username=${encodeURIComponent(user.username)}&email=${encodeURIComponent(user.email)}`);
    }
);

// --- FIREBASE GOOGLE AUTH (Client-side Firebase → Server JWT) ---
router.post('/firebase-google', async (req, res) => {
    try {
        const { email, displayName, uid, photoURL } = req.body;

        if (!email || !uid) {
            return res.status(400).json({ error: "Missing Firebase user data" });
        }

        // Check if user exists
        const [existing] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);

        let user;
        if (existing.length > 0) {
            user = existing[0];
            // Update google_id if not set
            if (!user.google_id) {
                await db.execute('UPDATE users SET google_id = ? WHERE id = ?', [uid, user.id]);
            }
        } else {
            // Create new user from Firebase Google
            const username = displayName || email.split('@')[0];
            const [result] = await db.execute(
                'INSERT INTO users (username, email, google_id, password) VALUES (?, ?, ?, ?)',
                [username, email, uid, null]
            );
            user = { id: result.insertId, username, email };
        }

        const token = jwt.sign(
            { id: user.id, username: user.username || displayName },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // Send Login Alert (Async)
        sendAlert(
            email,
            "Login Alert: Smart Farm (Google)",
            `Hello ${user.username || displayName}, you signed in via Google on ${new Date().toLocaleString()}.`
        ).catch(e => console.log("Email error:", e.message));

        res.json({ token, username: user.username || displayName, email });
    } catch (err) {
        console.error("Firebase Google Auth Error:", err.message);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: "Account already exists. Try logging in." });
        }
        res.status(500).json({ error: "Authentication failed" });
    }
});

module.exports = router;