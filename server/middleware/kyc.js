/**
 * ============================================================
 * KYC ENFORCEMENT MIDDLEWARE
 * ============================================================
 * Blocks non-verified users from trading (buying/selling).
 * Attach this to any route that requires KYC completion.
 */

const db = require('../config/db');

const requireKYC = async (req, res, next) => {
    try {
        const [users] = await db.execute(
            'SELECT kyc_status FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const status = users[0].kyc_status || 'not_submitted';

        if (status !== 'verified') {
            const messages = {
                not_submitted: 'Please complete your KYC verification to start trading. Upload your documents at the KYC portal.',
                pending: 'Your KYC application is under review. You will be able to trade once verified (usually within 24-48 hours).',
                rejected: 'Your KYC was rejected. Please re-submit corrected documents at the KYC portal.'
            };

            return res.status(403).json({
                error: messages[status] || 'KYC verification required.',
                kyc_status: status,
                redirect: '/kyc.html'
            });
        }

        // KYC verified — proceed
        next();
    } catch (err) {
        console.error('KYC Middleware Error:', err.message);
        res.status(500).json({ error: 'Failed to verify KYC status.' });
    }
};

/**
 * Soft KYC check — doesn't block, but attaches kyc_status to req
 * Useful for showing badges or warnings without blocking access
 */
const softKYCCheck = async (req, res, next) => {
    try {
        if (req.user && req.user.id) {
            const [users] = await db.execute(
                'SELECT kyc_status FROM users WHERE id = ?',
                [req.user.id]
            );
            req.kycStatus = users[0]?.kyc_status || 'not_submitted';
        }
        next();
    } catch (err) {
        req.kycStatus = 'unknown';
        next();
    }
};

module.exports = { requireKYC, softKYCCheck };
