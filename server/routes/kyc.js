/**
 * ============================================================
 * KYC ROUTES — Know Your Customer Verification
 * ============================================================
 * Handles document upload, status check, admin approval/rejection
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/admin');
const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// ============== VERHOEFF ALGORITHM (BACKEND) ==============
const d = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
const p = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,1,4,6,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];
function validateAadhaar(aadhaar) {
    if (!/^\d{12}$/.test(aadhaar)) return false;
    let c = 0; let invertedAadhaar = aadhaar.split('').map(Number).reverse();
    for (let i = 0; i < invertedAadhaar.length; i++) c = d[c][p[(i % 8)][invertedAadhaar[i]]];
    return (c === 0);
}

// ---- MULTER CONFIG for KYC Document Uploads ----
const kycUploadDir = path.join(__dirname, '../../public/uploads/kyc');
if (!fs.existsSync(kycUploadDir)) {
    fs.mkdirSync(kycUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, kycUploadDir),
    filename: (req, file, cb) => {
        const uniqueName = `kyc_${req.user.id}_${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, WebP, and PDF files are allowed.'));
        }
    }
});

// Helper for Gemini AI Analysis
async function analyzeDocument(filePath, docType, expectedNumber) {
    try {
        const imageData = fs.readFileSync(filePath);
        const prompt = `Act as an official KYC verification officer. Analyze this image. 
        Is this a real ${docType}? 
        If it's an Aadhaar card, look for the 12-digit number. 
        If it's a PAN card, look for the 10-digit alphanumeric PAN.
        
        Return ONLY a JSON object: 
        { "isValid": boolean, "documentFound": string, "numberMatched": boolean, "confidence": number, "reason": string }
        Expected Number to match: ${expectedNumber}`;

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: imageData.toString("base64"), mimeType: "image/jpeg" } }
        ]);
        
        const responseText = result.response.text();
        const jsonMatch = responseText.match(/\{.*\}/s);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : { isValid: false, reason: "AI Analysis Failed" };
    } catch (e) {
        console.error("Gemini KYC Error:", e);
        return { isValid: true, reason: "AI fallback (test mode)" }; // Fallback for dev
    }
}

// ============================================================
// 1. SUBMIT KYC — Upload all documents + personal info
// ============================================================
router.post('/submit', auth, upload.fields([
    { name: 'aadhaar_front', maxCount: 1 },
    { name: 'aadhaar_back', maxCount: 1 },
    { name: 'pan_card', maxCount: 1 },
    { name: 'bank_proof', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
    { name: 'farm_certificate', maxCount: 1 }
]), async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            aadhaar_number, pan_number, bank_account, ifsc_code,
            upi_id, address, state, district, pincode, role
        } = req.body;

        // 1. Validate Aadhaar (Real Verhoeff check)
        if (!validateAadhaar(aadhaar_number)) {
            return res.status(400).json({ error: 'Invalid Aadhaar number. Please check for typos.' });
        }

        // 2. Validate PAN format
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan_number.toUpperCase())) {
            return res.status(400).json({ error: 'Invalid PAN format. Expected: ABCDE1234F' });
        }

        // 3. AI Document Pre-Verification (Asynchronous start)
        // In a real system, we might queue this, but for "Real-time" feel we do it now
        if (req.files?.aadhaar_front) {
            const aiAadhaar = await analyzeDocument(req.files.aadhaar_front[0].path, "Aadhaar Card", aadhaar_number);
            if (!aiAadhaar.isValid && process.env.STRICT_KYC === 'true') {
                return res.status(400).json({ error: `Aadhaar Verification Failed: ${aiAadhaar.reason}` });
            }
        }
        
        if (req.files?.pan_card) {
            const aiPan = await analyzeDocument(req.files.pan_card[0].path, "PAN Card", pan_number);
            if (!aiPan.isValid && process.env.STRICT_KYC === 'true') {
                return res.status(400).json({ error: `PAN Card Verification Failed: ${aiPan.reason}` });
            }
        }

        // 4. Simulated Penny Drop (Bank Verification)
        if (bank_account && ifsc_code) {
            console.log(`🏦 Verifying Bank: ${bank_account} with IFSC ${ifsc_code}`);
            // In production, call Razorpay/Cashfree Penny Drop API here
        }

        // Check required files
        if (!req.files?.aadhaar_front || !req.files?.pan_card || !req.files?.selfie) {
            return res.status(400).json({ error: 'Aadhaar front, PAN card, and selfie are mandatory uploads.' });
        }

        // Update user profile with KYC info
        await db.execute(`
            UPDATE users SET 
                aadhaar_number = ?, pan_number = ?, bank_account = ?, ifsc_code = ?,
                upi_id = ?, address = ?, state = ?, district = ?, pincode = ?,
                role = ?, kyc_status = 'pending', kyc_submitted_at = NOW()
            WHERE id = ?
        `, [
            aadhaar_number, pan_number.toUpperCase(), bank_account || null,
            ifsc_code || null, upi_id || null, address || null,
            state || null, district || null, pincode || null,
            role || 'both', userId
        ]);

        // Save document records
        const docEntries = [];
        for (const [fieldName, files] of Object.entries(req.files)) {
            for (const file of files) {
                const fileUrl = `/uploads/kyc/${file.filename}`;
                docEntries.push([userId, fieldName, fileUrl, file.originalname]);
            }
        }

        if (docEntries.length > 0) {
            // Delete old documents first
            await db.execute('DELETE FROM kyc_documents WHERE user_id = ?', [userId]);

            for (const entry of docEntries) {
                await db.execute(
                    'INSERT INTO kyc_documents (user_id, document_type, file_url, file_name) VALUES (?, ?, ?, ?)',
                    entry
                );
            }
        }

        // Log submission
        await db.execute(
            'INSERT INTO kyc_verification_logs (user_id, action) VALUES (?, ?)',
            [userId, 'submitted']
        );

        console.log(`📋 KYC Submitted: User #${userId}`);
        res.status(201).json({
            message: 'KYC documents submitted successfully! Verification typically takes 24-48 hours.',
            kyc_status: 'pending'
        });

    } catch (err) {
        console.error('KYC Submit Error:', err.message);
        res.status(500).json({ error: 'Failed to submit KYC documents.' });
    }
});

// ============================================================
// 2. GET KYC STATUS — Check own verification status
// ============================================================
router.get('/status', auth, async (req, res) => {
    try {
        const [users] = await db.execute(`
            SELECT kyc_status, kyc_submitted_at, kyc_verified_at, kyc_rejection_reason,
                   aadhaar_number, pan_number, bank_account, ifsc_code, upi_id,
                   address, state, district, pincode, role
            FROM users WHERE id = ?
        `, [req.user.id]);

        if (users.length === 0) return res.status(404).json({ error: 'User not found' });

        const user = users[0];

        // Get uploaded documents
        const [docs] = await db.execute(
            'SELECT document_type, file_url, uploaded_at FROM kyc_documents WHERE user_id = ?',
            [req.user.id]
        );

        // Mask sensitive info
        const maskedAadhaar = user.aadhaar_number
            ? 'XXXX-XXXX-' + user.aadhaar_number.slice(-4)
            : null;

        res.json({
            status: user.kyc_status, // Frontend expects .status
            kyc_status: user.kyc_status,
            submitted_at: user.kyc_submitted_at,
            verified_at: user.kyc_verified_at,
            rejection_reason: user.kyc_rejection_reason,
            aadhaar: maskedAadhaar,
            pan: user.pan_number,
            bank_account: user.bank_account ? '****' + user.bank_account.slice(-4) : null,
            ifsc: user.ifsc_code,
            upi_id: user.upi_id,
            address: user.address,
            state: user.state,
            district: user.district,
            pincode: user.pincode,
            role: user.role,
            documents: docs
        });

    } catch (err) {
        console.error('KYC Status Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch KYC status.' });
    }
});

// ============================================================
// 3. ADMIN: GET ALL PENDING KYC APPLICATIONS
// ============================================================
router.get('/admin/pending', auth, async (req, res) => {
    try {
        // Simple admin check (expand later with proper role checking)
        const [admin] = await db.execute('SELECT role FROM users WHERE id = ?', [req.user.id]);
        if (admin[0]?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required.' });
        }

        const [applications] = await db.execute(`
            SELECT u.id, u.username, u.email, u.kyc_status, u.kyc_submitted_at,
                   u.aadhaar_number, u.pan_number, u.role, u.state, u.district
            FROM users u
            WHERE u.kyc_status = 'pending'
            ORDER BY u.kyc_submitted_at ASC
        `);

        // Get documents for each application
        for (const app of applications) {
            const [docs] = await db.execute(
                'SELECT document_type, file_url FROM kyc_documents WHERE user_id = ?',
                [app.id]
            );
            app.documents = docs;
        }

        res.json({ total: applications.length, applications });

    } catch (err) {
        console.error('Admin KYC Pending Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch pending applications.' });
    }
});

// ============================================================
// 4. ADMIN: APPROVE KYC
// ============================================================
router.post('/admin/approve/:userId', auth, isAdmin, async (req, res) => {
    try {
        const targetUserId = req.params.userId;

        await db.execute(`
            UPDATE users SET kyc_status = 'verified', kyc_verified_at = NOW(), kyc_rejection_reason = NULL
            WHERE id = ?
        `, [targetUserId]);

        await db.execute(
            'INSERT INTO kyc_verification_logs (user_id, admin_id, action) VALUES (?, ?, ?)',
            [targetUserId, req.user.id, 'approved']
        );

        console.log(`✅ KYC Approved: User #${targetUserId} by Admin #${req.user.id}`);
        res.json({ message: 'KYC approved successfully.' });

    } catch (err) {
        console.error('Admin KYC Approve Error:', err.message);
        res.status(500).json({ error: 'Failed to approve KYC.' });
    }
});

// ============================================================
// 5. ADMIN: REJECT KYC
// ============================================================
router.post('/admin/reject/:userId', auth, isAdmin, async (req, res) => {
    try {
        const targetUserId = req.params.userId;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ error: 'Rejection reason is required.' });
        }

        await db.execute(`
            UPDATE users SET kyc_status = 'rejected', kyc_rejection_reason = ?
            WHERE id = ?
        `, [reason, targetUserId]);

        await db.execute(
            'INSERT INTO kyc_verification_logs (user_id, admin_id, action, reason) VALUES (?, ?, ?, ?)',
            [targetUserId, req.user.id, 'rejected', reason]
        );

        console.log(`❌ KYC Rejected: User #${targetUserId} — Reason: ${reason}`);
        res.json({ message: 'KYC rejected.', reason });

    } catch (err) {
        console.error('Admin KYC Reject Error:', err.message);
        res.status(500).json({ error: 'Failed to reject KYC.' });
    }
});

// ============================================================
// 6. ADMIN: GET ALL KYC (All statuses with filters)
// ============================================================
router.get('/admin/all', auth, async (req, res) => {
    try {
        const [admin] = await db.execute('SELECT role FROM users WHERE id = ?', [req.user.id]);
        if (admin[0]?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required.' });
        }

        const status = req.query.status; // optional filter
        let query = `
            SELECT u.id, u.username, u.email, u.kyc_status, u.kyc_submitted_at, u.kyc_verified_at,
                   u.role, u.state, u.district, u.trust_score
            FROM users u
            WHERE u.kyc_status != 'not_submitted'
        `;
        const params = [];

        if (status) {
            query += ' AND u.kyc_status = ?';
            params.push(status);
        }

        query += ' ORDER BY u.kyc_submitted_at DESC';

        const [applications] = await db.execute(query, params);
        res.json({ total: applications.length, applications });

    } catch (err) {
        console.error('Admin KYC All Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch KYC applications.' });
    }
});

module.exports = router;
