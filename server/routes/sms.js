const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const db = require('../config/db');

// Secure route to send doctor report via SMS
router.post('/send-report', async (req, res) => {
    try {
        const userId = req.user?.id; // Assumes auth middleware populates req.user

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const { report_text } = req.body;

        if (!report_text) {
            return res.status(400).json({ error: "Report text is required" });
        }

        // 1. Fetch user's phone number
        const [users] = await db.execute('SELECT phone_number FROM users WHERE id = ?', [userId]);

        if (users.length === 0 || !users[0].phone_number) {
            return res.status(404).json({ error: "No phone number linked to this account." });
        }

        const toPhone = users[0].phone_number;

        // 2. Initialize Twilio
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromPhone = process.env.TWILIO_PHONE_NUMBER;

        if (!accountSid || !authToken || !fromPhone) {
            console.error("Twilio credentials missing in .env");
            return res.status(500).json({ error: "SMS service is not configured on the server." });
        }

        const client = twilio(accountSid, authToken);

        // 3. Send SMS
        const message = await client.messages.create({
            body: report_text,
            from: fromPhone,
            to: toPhone
        });

        res.json({ message: "SMS sent successfully!", messageId: message.sid });

    } catch (err) {
        console.error("SMS Error:", err);
        res.status(500).json({ error: "Failed to send SMS. Please try again later." });
    }
});

module.exports = router;
