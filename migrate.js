// Database Migration — Ensure trade tables have all required columns
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./server/config/db');

async function migrate() {
    console.log("🔧 Running database migration...\n");

    // 1. Ensure trade_listings table exists with all columns
    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS trade_listings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                seller_id INT NOT NULL,
                crop_name VARCHAR(255) NOT NULL,
                quantity INT NOT NULL DEFAULT 0,
                price_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
                description TEXT,
                location VARCHAR(255) DEFAULT '',
                grade VARCHAR(20) DEFAULT 'A',
                type VARCHAR(50) DEFAULT 'grain',
                image LONGTEXT,
                status ENUM('active', 'sold', 'cancelled') DEFAULT 'active',
                buyer_id INT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (seller_id) REFERENCES users(id)
            )
        `);
        console.log("✅ trade_listings table ready");
    } catch (e) {
        console.log("ℹ️  trade_listings:", e.message);
    }

    // Add missing columns to trade_listings (safe — ignores if they already exist)
    const addCols = [
        ["image", "LONGTEXT"],
        ["location", "VARCHAR(255) DEFAULT ''"],
        ["grade", "VARCHAR(20) DEFAULT 'A'"],
        ["type", "VARCHAR(50) DEFAULT 'grain'"],
        ["buyer_id", "INT DEFAULT NULL"]
    ];
    for (const [col, def] of addCols) {
        try {
            await db.execute(`ALTER TABLE trade_listings ADD COLUMN ${col} ${def}`);
            console.log(`  ✅ Added column: ${col}`);
        } catch (e) {
            if (e.message.includes("Duplicate")) {
                console.log(`  ⏭️  Column ${col} already exists`);
            } else {
                console.log(`  ⚠️  ${col}: ${e.message}`);
            }
        }
    }

    // 2. Ensure transactions table exists
    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                listing_id INT NOT NULL,
                buyer_id INT NOT NULL,
                seller_id INT NOT NULL,
                total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
                quantity INT DEFAULT 0,
                status ENUM('processing', 'shipped', 'completed', 'cancelled') DEFAULT 'processing',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (listing_id) REFERENCES trade_listings(id),
                FOREIGN KEY (buyer_id) REFERENCES users(id)
            )
        `);
        console.log("✅ transactions table ready");
    } catch (e) {
        console.log("ℹ️  transactions:", e.message);
    }

    // Add missing columns to transactions
    const txCols = [
        ["seller_id", "INT DEFAULT 0"],
        ["quantity", "INT DEFAULT 0"],
        ["commission_rate", "DECIMAL(5,4) DEFAULT 0"],
        ["commission_amount", "DECIMAL(10,2) DEFAULT 0"],
        ["net_farmer_amount", "DECIMAL(12,2) DEFAULT 0"],
        ["escrow_status", "ENUM('held', 'released', 'disputed', 'refunded') DEFAULT 'held'"],
        ["order_id", "VARCHAR(100) UNIQUE"],
        ["buyer_kyc_verified", "TINYINT(1) DEFAULT 0"],
        ["seller_kyc_verified", "TINYINT(1) DEFAULT 0"],
        ["payment_method", "VARCHAR(50)"],
        ["payment_status", "ENUM('pending', 'completed', 'failed') DEFAULT 'pending'"],
        ["shipment_id", "INT DEFAULT NULL"],
        ["delivery_confirmed_at", "TIMESTAMP NULL DEFAULT NULL"],
        ["razorpay_payment_id", "VARCHAR(255) DEFAULT NULL"],
        ["crop_name", "VARCHAR(255) DEFAULT NULL"]
    ];
    for (const [col, def] of txCols) {
        try {
            await db.execute(`ALTER TABLE transactions ADD COLUMN ${col} ${def}`);
            console.log(`  ✅ Added column: ${col}`);
        } catch (e) {
            if (e.message.includes("Duplicate")) {
                console.log(`  ⏭️  Column ${col} already exists`);
            } else {
                console.log(`  ⚠️  ${col}: ${e.message}`);
            }
        }
    }

    // 3. Ensure satellite_scans table exists
    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS satellite_scans (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                scan_id VARCHAR(50),
                latitude DECIMAL(10,6),
                longitude DECIMAL(10,6),
                location_name VARCHAR(255),
                ndvi_score DECIMAL(4,2),
                crop_stress VARCHAR(50),
                soil_moisture DECIMAL(5,1),
                irrigation_need VARCHAR(50),
                vegetation_health VARCHAR(50),
                analysis_text TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);
        console.log("✅ satellite_scans table ready");
    } catch (e) {
        console.log("ℹ️  satellite_scans:", e.message);
    }
    // 4. Ensure kyc_verification_logs table for audit trail
    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS kyc_verification_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                admin_id INT,
                action VARCHAR(100),
                reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ kyc_verification_logs table ready");
    } catch (e) { console.log("ℹ️  kyc_verification_logs:", e.message); }

    // 5. Ensure platform_commission_ledger table
    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS platform_commission_ledger (
                id INT AUTO_INCREMENT PRIMARY KEY,
                transaction_id INT,
                order_id VARCHAR(100),
                total_charged DECIMAL(12,2),
                commission_amount DECIMAL(10,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ platform_commission_ledger table ready");
    } catch (e) { console.log("ℹ️  ledger:", e.message); }

    // 6. Add status column to users
    try {
        await db.execute("ALTER TABLE users ADD COLUMN status ENUM('active','banned','suspended') DEFAULT 'active'");
        console.log("✅ users.status column added");
    } catch (e) {
        if (e.message.includes('Duplicate')) console.log("⏭️  users.status already exists");
        else console.log("ℹ️  users.status:", e.message);
    }

    // 7. Add wallet_balance to users
    try {
        await db.execute("ALTER TABLE users ADD COLUMN wallet_balance DECIMAL(12,2) DEFAULT 0");
        console.log("✅ users.wallet_balance column added");
    } catch (e) {
        if (e.message.includes('Duplicate')) console.log("⏭️  users.wallet_balance already exists");
        else console.log("ℹ️  wallet:", e.message);
    }

    console.log("\n✅ Migration complete!");
    process.exit(0);
}

migrate().catch(err => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
});
