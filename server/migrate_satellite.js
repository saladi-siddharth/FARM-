/**
 * Migration: Create satellite_scans table
 * Run: node server/migrate_satellite.js
 */
const db = require('./config/db');

async function migrate() {
    console.log('🛰️ Running Satellite Scanner Migration...');

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
                soil_moisture DECIMAL(5,2),
                irrigation_need VARCHAR(50),
                vegetation_health VARCHAR(50),
                analysis_text TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✅ satellite_scans table created successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
