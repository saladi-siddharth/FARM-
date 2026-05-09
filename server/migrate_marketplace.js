/**
 * ============================================================
 * FARM CENTRAL — MARKETPLACE DATABASE MIGRATION
 * ============================================================
 * Adds: KYC, Commission, Shipment Tracking, Disputes, Reviews
 * Run: node server/migrate_marketplace.js
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function migrate() {
    const dbName = process.env.DB_NAME || 'test';
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        port: process.env.DB_PORT || 3306,
        database: dbName,
        ssl: process.env.DB_HOST && process.env.DB_HOST !== 'localhost'
            ? { rejectUnauthorized: false }
            : undefined
    };

    console.log('\n🚀 Starting Marketplace Migration...\n');

    let conn;
    try {
        conn = await mysql.createConnection(config);
        console.log('✅ Connected to Database\n');

        // ===========================
        // 1. ALTER users TABLE — Add KYC & Role columns
        // ===========================
        const userAlterations = [
            { col: 'role', sql: "ALTER TABLE users ADD COLUMN role ENUM('farmer','customer','both','admin') DEFAULT 'both'" },
            { col: 'kyc_status', sql: "ALTER TABLE users ADD COLUMN kyc_status ENUM('not_submitted','pending','verified','rejected') DEFAULT 'not_submitted'" },
            { col: 'kyc_submitted_at', sql: "ALTER TABLE users ADD COLUMN kyc_submitted_at DATETIME NULL" },
            { col: 'kyc_verified_at', sql: "ALTER TABLE users ADD COLUMN kyc_verified_at DATETIME NULL" },
            { col: 'kyc_rejection_reason', sql: "ALTER TABLE users ADD COLUMN kyc_rejection_reason TEXT NULL" },
            { col: 'bank_account', sql: "ALTER TABLE users ADD COLUMN bank_account VARCHAR(30) NULL" },
            { col: 'ifsc_code', sql: "ALTER TABLE users ADD COLUMN ifsc_code VARCHAR(20) NULL" },
            { col: 'upi_id', sql: "ALTER TABLE users ADD COLUMN upi_id VARCHAR(100) NULL" },
            { col: 'aadhaar_number', sql: "ALTER TABLE users ADD COLUMN aadhaar_number VARCHAR(12) NULL" },
            { col: 'pan_number', sql: "ALTER TABLE users ADD COLUMN pan_number VARCHAR(10) NULL" },
            { col: 'address', sql: "ALTER TABLE users ADD COLUMN address TEXT NULL" },
            { col: 'state', sql: "ALTER TABLE users ADD COLUMN state VARCHAR(100) NULL" },
            { col: 'district', sql: "ALTER TABLE users ADD COLUMN district VARCHAR(100) NULL" },
            { col: 'pincode', sql: "ALTER TABLE users ADD COLUMN pincode VARCHAR(10) NULL" },
            { col: 'trust_score', sql: "ALTER TABLE users ADD COLUMN trust_score DECIMAL(3,1) DEFAULT 0.0" },
            { col: 'total_sales', sql: "ALTER TABLE users ADD COLUMN total_sales INT DEFAULT 0" },
            { col: 'total_purchases', sql: "ALTER TABLE users ADD COLUMN total_purchases INT DEFAULT 0" },
        ];

        console.log('⚙️  Upgrading users table...');
        for (const alt of userAlterations) {
            try {
                await conn.execute(alt.sql);
                console.log(`   ✅ Added column: ${alt.col}`);
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME' || e.message.includes('Duplicate column')) {
                    console.log(`   ⏭️  Column "${alt.col}" already exists`);
                } else {
                    console.error(`   ❌ Error adding "${alt.col}":`, e.message);
                }
            }
        }

        // ===========================
        // 2. ALTER trade_listings — Add marketplace fields
        // ===========================
        const listingAlterations = [
            { col: 'min_order_qty', sql: "ALTER TABLE trade_listings ADD COLUMN min_order_qty DECIMAL(10,2) DEFAULT 1" },
            { col: 'max_order_qty', sql: "ALTER TABLE trade_listings ADD COLUMN max_order_qty DECIMAL(10,2) NULL" },
            { col: 'delivery_time_days', sql: "ALTER TABLE trade_listings ADD COLUMN delivery_time_days INT DEFAULT 3" },
            { col: 'is_organic', sql: "ALTER TABLE trade_listings ADD COLUMN is_organic TINYINT(1) DEFAULT 0" },
            { col: 'certification', sql: "ALTER TABLE trade_listings ADD COLUMN certification VARCHAR(255) NULL" },
            { col: 'views_count', sql: "ALTER TABLE trade_listings ADD COLUMN views_count INT DEFAULT 0" },
            { col: 'category', sql: "ALTER TABLE trade_listings ADD COLUMN category VARCHAR(50) DEFAULT 'grain'" },
        ];

        console.log('\n⚙️  Upgrading trade_listings table...');
        for (const alt of listingAlterations) {
            try {
                await conn.execute(alt.sql);
                console.log(`   ✅ Added column: ${alt.col}`);
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME' || e.message.includes('Duplicate column')) {
                    console.log(`   ⏭️  Column "${alt.col}" already exists`);
                } else {
                    console.error(`   ❌ Error adding "${alt.col}":`, e.message);
                }
            }
        }

        // ===========================
        // 3. ALTER transactions — Add commission & escrow fields
        // ===========================
        const txnAlterations = [
            { col: 'commission_rate', sql: "ALTER TABLE transactions ADD COLUMN commission_rate DECIMAL(5,4) DEFAULT 0.0500" },
            { col: 'commission_amount', sql: "ALTER TABLE transactions ADD COLUMN commission_amount DECIMAL(10,2) DEFAULT 0.00" },
            { col: 'net_farmer_amount', sql: "ALTER TABLE transactions ADD COLUMN net_farmer_amount DECIMAL(10,2) DEFAULT 0.00" },
            { col: 'escrow_status', sql: "ALTER TABLE transactions ADD COLUMN escrow_status ENUM('held','released','refunded','disputed') DEFAULT 'held'" },
            { col: 'delivery_confirmed_at', sql: "ALTER TABLE transactions ADD COLUMN delivery_confirmed_at DATETIME NULL" },
            { col: 'shipment_id', sql: "ALTER TABLE transactions ADD COLUMN shipment_id INT NULL" },
            { col: 'buyer_kyc_verified', sql: "ALTER TABLE transactions ADD COLUMN buyer_kyc_verified TINYINT(1) DEFAULT 0" },
            { col: 'seller_kyc_verified', sql: "ALTER TABLE transactions ADD COLUMN seller_kyc_verified TINYINT(1) DEFAULT 0" },
            { col: 'quantity', sql: "ALTER TABLE transactions ADD COLUMN quantity DECIMAL(10,2) DEFAULT 0" },
            { col: 'order_id', sql: "ALTER TABLE transactions ADD COLUMN order_id VARCHAR(20) NULL" },
        ];

        console.log('\n⚙️  Upgrading transactions table...');
        for (const txn of txnAlterations) {
            try {
                await conn.execute(txn.sql);
                console.log(`   ✅ Added column: ${txn.col}`);
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME' || e.message.includes('Duplicate column')) {
                    console.log(`   ⏭️  Column "${txn.col}" already exists`);
                } else {
                    console.error(`   ❌ Error adding "${txn.col}":`, e.message);
                }
            }
        }

        // ===========================
        // 4. CREATE kyc_documents TABLE
        // ===========================
        console.log('\n⚙️  Creating kyc_documents table...');
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS kyc_documents (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                document_type ENUM('aadhaar_front','aadhaar_back','pan_card','bank_proof','selfie','farm_certificate') NOT NULL,
                file_url VARCHAR(500) NOT NULL,
                file_name VARCHAR(255),
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('   ✅ kyc_documents ready');

        // ===========================
        // 5. CREATE kyc_verification_logs TABLE
        // ===========================
        console.log('\n⚙️  Creating kyc_verification_logs table...');
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS kyc_verification_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                admin_id INT,
                action ENUM('submitted','approved','rejected','resubmitted') NOT NULL,
                reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('   ✅ kyc_verification_logs ready');

        // ===========================
        // 6. CREATE shipments TABLE
        // ===========================
        console.log('\n⚙️  Creating shipments table...');
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS shipments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                transaction_id INT NOT NULL,
                seller_id INT NOT NULL,
                buyer_id INT NOT NULL,
                carrier_name VARCHAR(255),
                tracking_number VARCHAR(100),
                tracking_url VARCHAR(500),
                estimated_delivery DATE,
                actual_delivery DATE,
                current_status ENUM('preparing','shipped','in_transit','out_for_delivery','delivered','delivery_confirmed','issue_reported') DEFAULT 'preparing',
                pickup_address TEXT,
                delivery_address TEXT,
                weight_kg DECIMAL(10,2),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
                FOREIGN KEY (seller_id) REFERENCES users(id),
                FOREIGN KEY (buyer_id) REFERENCES users(id)
            )
        `);
        console.log('   ✅ shipments ready');

        // ===========================
        // 7. CREATE shipment_events TABLE (Timeline)
        // ===========================
        console.log('\n⚙️  Creating shipment_events table...');
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS shipment_events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                shipment_id INT NOT NULL,
                event_type ENUM('preparing','picked_up','in_transit','hub_reached','out_for_delivery','delivered','confirmed','issue') NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                location VARCHAR(255),
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
            )
        `);
        console.log('   ✅ shipment_events ready');

        // ===========================
        // 8. CREATE disputes TABLE
        // ===========================
        console.log('\n⚙️  Creating disputes table...');
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS disputes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                transaction_id INT NOT NULL,
                filed_by INT NOT NULL,
                against_user INT NOT NULL,
                reason ENUM('not_received','quality_mismatch','quantity_shortage','delivery_delayed','wrong_product','other') NOT NULL,
                description TEXT NOT NULL,
                evidence_urls TEXT,
                status ENUM('open','under_review','resolved_refund','resolved_partial','resolved_rejected','closed') DEFAULT 'open',
                resolution_notes TEXT,
                resolved_by INT,
                refund_amount DECIMAL(10,2) DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resolved_at DATETIME,
                FOREIGN KEY (transaction_id) REFERENCES transactions(id),
                FOREIGN KEY (filed_by) REFERENCES users(id),
                FOREIGN KEY (against_user) REFERENCES users(id)
            )
        `);
        console.log('   ✅ disputes ready');

        // ===========================
        // 9. CREATE reviews TABLE
        // ===========================
        console.log('\n⚙️  Creating reviews table...');
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS reviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                transaction_id INT NOT NULL,
                reviewer_id INT NOT NULL,
                reviewed_user_id INT NOT NULL,
                overall_rating TINYINT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
                quality_rating TINYINT CHECK (quality_rating BETWEEN 1 AND 5),
                packaging_rating TINYINT CHECK (packaging_rating BETWEEN 1 AND 5),
                delivery_rating TINYINT CHECK (delivery_rating BETWEEN 1 AND 5),
                review_text TEXT,
                photo_urls TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (transaction_id) REFERENCES transactions(id),
                FOREIGN KEY (reviewer_id) REFERENCES users(id),
                FOREIGN KEY (reviewed_user_id) REFERENCES users(id),
                UNIQUE KEY unique_review (transaction_id, reviewer_id)
            )
        `);
        console.log('   ✅ reviews ready');

        // ===========================
        // 10. CREATE platform_commission_ledger TABLE
        // ===========================
        console.log('\n⚙️  Creating platform_commission_ledger table...');
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS platform_commission_ledger (
                id INT AUTO_INCREMENT PRIMARY KEY,
                transaction_id INT NOT NULL,
                order_id VARCHAR(20),
                subtotal DECIMAL(10,2) NOT NULL,
                commission_rate DECIMAL(5,4) NOT NULL,
                commission_amount DECIMAL(10,2) NOT NULL,
                total_charged DECIMAL(10,2) NOT NULL,
                status ENUM('collected','refunded','disputed') DEFAULT 'collected',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (transaction_id) REFERENCES transactions(id)
            )
        `);
        console.log('   ✅ platform_commission_ledger ready');

        // ===========================
        // 11. CREATE payout_requests TABLE
        // ===========================
        console.log('\n⚙️  Creating payout_requests table...');
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS payout_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                payout_method ENUM('bank_transfer','upi') NOT NULL,
                bank_account VARCHAR(30),
                ifsc_code VARCHAR(20),
                upi_id VARCHAR(100),
                status ENUM('pending','processing','completed','failed') DEFAULT 'pending',
                processed_at DATETIME,
                reference_id VARCHAR(100),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);
        console.log('   ✅ payout_requests ready');

        // ===========================
        // DONE
        // ===========================
        console.log('\n🎉 ════════════════════════════════════════');
        console.log('   Marketplace Migration Complete!');
        console.log('   New Tables: 7 created');
        console.log('   Altered Tables: 3 upgraded');
        console.log('   ════════════════════════════════════════\n');

        await conn.end();
        process.exit(0);

    } catch (err) {
        console.error('\n❌ Migration Critical Error:', err.message);
        if (conn) await conn.end();
        process.exit(1);
    }
}

migrate();
