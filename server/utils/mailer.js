const nodemailer = require('nodemailer');

// 1. Configure the transporter (Using Gmail as an example)
const createTransporter = () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        return null;
    }
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};

const sendAlert = async (toEmail, subject, text) => {
    try {
        // Re-check env vars every time (helpful for some cloud envs)
        const currentTransporter = createTransporter();

        if (!currentTransporter) {
            console.log('⚠️ Email alerts disabled (EMAIL_USER/PASS not set in .env)');
            return;
        }

        const mailOptions = {
            from: `"Smart Farm Alerts" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: subject,
            text: text,
            html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #4ade80; border-radius: 10px;">
                    <h2 style="color: #166534;">🌾 Farm System Alert</h2>
                    <p>${text}</p>
                    <hr>
                    <small>This is an automated security notification for your Smart Farm account.</small>
                   </div>`
        };

        await currentTransporter.sendMail(mailOptions);
        console.log(`✅ Alert sent to ${toEmail}`);
    } catch (err) {
        console.error("❌ Email failed to send:", err);
    }
};

module.exports = sendAlert;