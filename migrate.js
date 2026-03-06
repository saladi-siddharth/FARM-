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
        ["quantity", "INT DEFAULT 0"]
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

    console.log("\n✅ Migration complete!");
    process.exit(0);
}

migrate().catch(err => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
});
