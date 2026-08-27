const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'farm.sqlite');
const sqliteDb = new sqlite3.Database(dbPath);

// Helper: translate MySQL queries to SQLite compatible syntax
function translateSql(sql) {
    let s = sql.trim();

    // SHOW TABLES
    if (/^SHOW\s+TABLES/i.test(s)) {
        return "SELECT name AS Tables_in_db FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'";
    }

    // SELECT 1 AS test or SELECT 1
    if (/^SELECT\s+1\s*(AS\s+\w+)?$/i.test(s)) {
        return "SELECT 1 AS test";
    }

    // CREATE TABLE translations
    if (/^CREATE\s+TABLE/i.test(s)) {
        s = s.replace(/id\s+INT\s+AUTO_INCREMENT\s+PRIMARY\s+KEY/gi, "id INTEGER PRIMARY KEY AUTOINCREMENT");
        s = s.replace(/id\s+INT\s+NOT\s+NULL\s+AUTO_INCREMENT\s+PRIMARY\s+KEY/gi, "id INTEGER PRIMARY KEY AUTOINCREMENT");
        s = s.replace(/id\s+INT\s+PRIMARY\s+KEY\s+AUTO_INCREMENT/gi, "id INTEGER PRIMARY KEY AUTOINCREMENT");
        s = s.replace(/AUTO_INCREMENT/gi, "AUTOINCREMENT");
        s = s.replace(/\bINT\b(?=\s+PRIMARY\s+KEY\s+AUTOINCREMENT)/gi, "INTEGER");
        
        s = s.replace(/ENGINE\s*=\s*\w+/gi, '');
        s = s.replace(/DEFAULT\s+CHARSET\s*=\s*\w+/gi, '');
        s = s.replace(/COLLATE\s*=\s*\w+/gi, '');
        
        s = s.replace(/ENUM\([^)]+\)/gi, "TEXT");
        s = s.replace(/ON\s+UPDATE\s+CURRENT_TIMESTAMP/gi, "");
        s = s.replace(/TINYINT\s*\(\d+\)/gi, "INTEGER");
        s = s.replace(/DECIMAL\s*\(\d+,\s*\d+\)/gi, "REAL");
        s = s.replace(/VARCHAR\s*\(\d+\)/gi, "TEXT");
        s = s.replace(/UNIQUE\s+KEY\s+\w+\s*\(/gi, "UNIQUE (");
    }

    // ALTER TABLE translations
    if (/^ALTER\s+TABLE/i.test(s)) {
        s = s.replace(/ENUM\([^)]+\)/gi, "TEXT");
        s = s.replace(/TINYINT\s*\(\d+\)/gi, "INTEGER");
        s = s.replace(/DECIMAL\s*\(\d+,\s*\d+\)/gi, "REAL");
        s = s.replace(/VARCHAR\s*\(\d+\)/gi, "TEXT");
    }

    // NOW() -> datetime('now', 'localtime')
    s = s.replace(/NOW\(\)/gi, "datetime('now', 'localtime')");

    // TIMESTAMP(task_date, task_time) -> datetime(task_date || ' ' || task_time)
    s = s.replace(/TIMESTAMP\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/gi, "datetime($1 || ' ' || $2)");

    return s;
}

// Convert ? placeholders and params if needed
function runQuery(sql, params = []) {
    const translated = translateSql(sql);
    const isSelect = /^\s*(SELECT|PRAGMA|SHOW)\b/i.test(translated);

    return new Promise((resolve, reject) => {
        if (isSelect) {
            sqliteDb.all(translated, params, (err, rows) => {
                if (err) {
                    if (err.message && err.message.includes('no such table')) {
                        err.code = 'ER_NO_SUCH_TABLE';
                    }
                    return reject(err);
                }
                resolve([rows || [], []]);
            });
        } else {
            sqliteDb.run(translated, params, function(err) {
                if (err) {
                    if (err.message && err.message.includes('UNIQUE constraint failed')) {
                        err.code = 'ER_DUP_ENTRY';
                    }
                    if (err.message && err.message.includes('duplicate column name')) {
                        err.code = 'ER_DUP_FIELDNAME';
                    }
                    return reject(err);
                }
                const result = {
                    insertId: this.lastID,
                    affectedRows: this.changes,
                    changedRows: this.changes
                };
                resolve([result, []]);
            });
        }
    });
}

// Adapter implementing the mysql2/promise API
const adapter = {
    execute: (sql, params = []) => runQuery(sql, params),
    query: (sql, params = []) => runQuery(sql, params),
    getConnection: async () => ({
        execute: (sql, params = []) => runQuery(sql, params),
        query: (sql, params = []) => runQuery(sql, params),
        release: () => {},
        end: () => {}
    }),
    end: () => new Promise((resolve) => sqliteDb.close(resolve))
};

// Auto Seed All Tables & Default Records
async function initSQLiteDatabase() {
    console.log('📦 Initializing Local SQLite Database tables & seed data...');

    const tables = [
        `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone_number TEXT,
            password TEXT,
            google_id TEXT UNIQUE,
            role TEXT DEFAULT 'both',
            kyc_status TEXT DEFAULT 'verified',
            kyc_submitted_at DATETIME,
            kyc_verified_at DATETIME,
            kyc_rejection_reason TEXT,
            bank_account TEXT,
            ifsc_code TEXT,
            upi_id TEXT,
            aadhaar_number TEXT,
            pan_number TEXT,
            address TEXT,
            state TEXT,
            district TEXT,
            pincode TEXT,
            trust_score REAL DEFAULT 4.9,
            total_sales INTEGER DEFAULT 12,
            total_purchases INTEGER DEFAULT 4,
            wallet_balance REAL DEFAULT 48500.00,
            status TEXT DEFAULT 'active',
            reset_token TEXT,
            reset_expires DATETIME,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            type TEXT,
            quantity REAL NOT NULL,
            cost REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            task_date DATE NOT NULL,
            task_time TIME NOT NULL,
            description TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            is_notified INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            category TEXT NOT NULL,
            amount REAL NOT NULL,
            description TEXT,
            expense_date DATE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            sender_username TEXT,
            receiver_username TEXT,
            content TEXT,
            msg_type TEXT DEFAULT 'text',
            media_url TEXT,
            messaged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS satellite_scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            scan_id TEXT NOT NULL,
            latitude REAL,
            longitude REAL,
            location_name TEXT,
            ndvi_score REAL,
            crop_stress TEXT,
            soil_moisture REAL,
            irrigation_need TEXT,
            vegetation_health TEXT,
            analysis_text TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS kyc_documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            document_type TEXT NOT NULL,
            file_url TEXT NOT NULL,
            file_name TEXT,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS kyc_verification_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            admin_id INTEGER,
            action TEXT,
            reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS trade_listings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            seller_id INTEGER NOT NULL,
            crop_name TEXT NOT NULL,
            quantity REAL NOT NULL,
            price_per_unit REAL NOT NULL,
            description TEXT,
            location TEXT,
            grade TEXT DEFAULT 'A',
            type TEXT DEFAULT 'organic',
            image TEXT,
            min_order_qty REAL DEFAULT 1,
            max_order_qty REAL,
            delivery_time_days INTEGER DEFAULT 3,
            is_organic INTEGER DEFAULT 1,
            certification TEXT,
            views_count INTEGER DEFAULT 0,
            category TEXT DEFAULT 'grain',
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            listing_id INTEGER NOT NULL,
            buyer_id INTEGER NOT NULL,
            seller_id INTEGER NOT NULL,
            total_amount REAL NOT NULL,
            status TEXT DEFAULT 'completed',
            commission_rate REAL DEFAULT 0.05,
            commission_amount REAL DEFAULT 0.00,
            net_farmer_amount REAL DEFAULT 0.00,
            escrow_status TEXT DEFAULT 'held',
            delivery_confirmed_at DATETIME,
            shipment_id INTEGER,
            buyer_kyc_verified INTEGER DEFAULT 1,
            seller_kyc_verified INTEGER DEFAULT 1,
            quantity REAL DEFAULT 10,
            order_id TEXT,
            payment_method TEXT DEFAULT 'direct',
            payment_status TEXT DEFAULT 'completed',
            transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS shipments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_id INTEGER NOT NULL,
            seller_id INTEGER NOT NULL,
            buyer_id INTEGER NOT NULL,
            carrier_name TEXT,
            tracking_number TEXT,
            tracking_url TEXT,
            estimated_delivery DATE,
            actual_delivery DATE,
            current_status TEXT DEFAULT 'in_transit',
            pickup_address TEXT,
            delivery_address TEXT,
            weight_kg REAL,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS shipment_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            shipment_id INTEGER NOT NULL,
            event_type TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            location TEXT,
            created_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS disputes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_id INTEGER NOT NULL,
            filed_by INTEGER NOT NULL,
            against_user INTEGER NOT NULL,
            reason TEXT NOT NULL,
            description TEXT NOT NULL,
            evidence_urls TEXT,
            status TEXT DEFAULT 'open',
            resolution_notes TEXT,
            resolved_by INTEGER,
            refund_amount REAL DEFAULT 0.00,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            resolved_at DATETIME
        )`,
        `CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_id INTEGER NOT NULL,
            reviewer_id INTEGER NOT NULL,
            reviewed_user_id INTEGER NOT NULL,
            overall_rating INTEGER NOT NULL,
            quality_rating INTEGER,
            packaging_rating INTEGER,
            delivery_rating INTEGER,
            review_text TEXT,
            photo_urls TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (transaction_id, reviewer_id)
        )`,
        `CREATE TABLE IF NOT EXISTS platform_commission_ledger (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_id INTEGER,
            order_id TEXT,
            subtotal REAL DEFAULT 0.0,
            commission_rate REAL DEFAULT 0.05,
            commission_amount REAL DEFAULT 0.0,
            total_charged REAL DEFAULT 0.0,
            status TEXT DEFAULT 'collected',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS payout_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            payout_method TEXT NOT NULL,
            bank_account TEXT,
            ifsc_code TEXT,
            upi_id TEXT,
            status TEXT DEFAULT 'completed',
            processed_at DATETIME,
            reference_id TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS forum_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            content TEXT NOT NULL,
            media_url TEXT,
            media_type TEXT DEFAULT 'text',
            likes_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS forum_comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            comment TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS calendar_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT,
            color TEXT DEFAULT '#10B981',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS medical_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            scan_id TEXT NOT NULL,
            diagnosis TEXT NOT NULL,
            confidence TEXT,
            treatment TEXT,
            image_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
    ];

    for (const sql of tables) {
        try {
            await adapter.execute(sql);
        } catch (e) {
            console.error('Table creation error:', e.message);
        }
    }

    // Check if demo users exist
    const emailsToSeed = [
        { email: 'saladisiddarath@gmail.com', username: 'Siddharth Saladi' },
        { email: 'saladisiddharth@gmail.com', username: 'Siddharth Saladi' },
        { email: 'saladi.siddharth@gmail.com', username: 'Siddharth Saladi' },
        { email: 'mahisiddharth721@gmail.com', username: 'Siddharth Saladi' },
        { email: 'farmer@farmcentral.com', username: 'Siddharth Farmer' },
        { email: 'admin@farmcentral.com', username: 'System Administrator' }
    ];

    const pass123Hash = await bcrypt.hash('123', 10);
    const adminPassHash = await bcrypt.hash('FC@dmin2026$ecure', 10);

    for (const u of emailsToSeed) {
        const [existing] = await adapter.execute("SELECT id FROM users WHERE LOWER(TRIM(email)) = ?", [u.email.toLowerCase()]);
        const isAdm = u.email.includes('admin');
        const role = isAdm ? 'admin' : 'farmer';
        const pass = isAdm ? adminPassHash : pass123Hash;

        if (existing.length === 0) {
            await adapter.execute(`
                INSERT INTO users (username, email, password, phone_number, role, kyc_status, wallet_balance, status, address, state, district, pincode)
                VALUES (?, ?, ?, '+919876543210', ?, 'verified', 50000.00, 'active', 'Saladi Agro Farm', 'Maharashtra', 'Pune', '411001')
            `, [u.username, u.email, pass, role]);
            console.log(`✅ Seeded user: ${u.email} (password: 123)`);
        } else {
            await adapter.execute("UPDATE users SET password = ?, kyc_status = 'verified', status = 'active' WHERE id = ?", [pass, existing[0].id]);
        }
    }

    const [farmerUsers] = await adapter.execute("SELECT id FROM users WHERE email = 'saladisiddarath@gmail.com' LIMIT 1");
    const farmerId = farmerUsers[0]?.id || 1;

    // Seed default Inventory if empty for farmer
    const [inv] = await adapter.execute('SELECT COUNT(*) as c FROM inventory WHERE user_id = ?', [farmerId]);
    if (inv[0].c === 0) {
        await adapter.execute(`INSERT INTO inventory (user_id, name, type, quantity, cost) VALUES 
            (?, 'Organic Wheat Seeds (Sharbati)', 'Seeds', 120, 45.00),
            (?, 'NPK 19-19-19 Fertilizer', 'Fertilizer', 50, 1200.00),
            (?, 'Neem Oil Organic Spray', 'Pesticide', 15, 350.00),
            (?, 'Drip Irrigation Pipe 16mm', 'Equipment', 4, 1800.00),
            (?, 'High Yield Mustard Seeds', 'Seeds', 40, 95.00)
        `, [farmerId, farmerId, farmerId, farmerId, farmerId]);
        console.log('✅ Seeded demo inventory items.');
    }

    // Seed default Expenses if empty for farmer
    const [exp] = await adapter.execute('SELECT COUNT(*) as c FROM expenses WHERE user_id = ?', [farmerId]);
    if (exp[0].c === 0) {
        const today = new Date().toISOString().slice(0, 10);
        await adapter.execute(`INSERT INTO expenses (user_id, category, amount, description, expense_date) VALUES 
            (?, 'Seeds', 5400.00, 'Purchased 120kg Sharbati Wheat Seeds', ?),
            (?, 'Fertilizer', 6000.00, '5 bags of Organic Bio-Fertilizer', ?),
            (?, 'Equipment', 7200.00, 'Drip irrigation drip line replacement', ?),
            (?, 'Labor', 4500.00, 'Seasonal field preparation labor', ?),
            (?, 'Fuel', 2800.00, 'Tractor diesel fuel', ?)
        `, [farmerId, today, farmerId, today, farmerId, today, farmerId, today, farmerId, today]);
        console.log('✅ Seeded demo expenses.');
    }

    // Seed default Tasks if empty for farmer
    const [tasks] = await adapter.execute('SELECT COUNT(*) as c FROM tasks WHERE user_id = ?', [farmerId]);
    if (tasks[0].c === 0) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 2);
        const dateStr = futureDate.toISOString().slice(0, 10);
        await adapter.execute(`INSERT INTO tasks (user_id, task_date, task_time, description, status) VALUES 
            (?, ?, '07:30:00', 'Inspect Section A drip irrigation nozzles', 'pending'),
            (?, ?, '10:00:00', 'Apply bio-fertilizer spray across wheat plot', 'pending'),
            (?, ?, '16:00:00', 'Check soil moisture sensors in Greenhouse 2', 'completed')
        `, [farmerId, dateStr, farmerId, dateStr, farmerId, dateStr]);
        console.log('✅ Seeded demo tasks.');
    }

    // Seed default Satellite scans if empty
    const [scans] = await adapter.execute('SELECT COUNT(*) as c FROM satellite_scans WHERE user_id = ?', [farmerId]);
    if (scans[0].c === 0) {
        await adapter.execute(`INSERT INTO satellite_scans (user_id, scan_id, latitude, longitude, location_name, ndvi_score, crop_stress, soil_moisture, irrigation_need, vegetation_health, analysis_text) VALUES 
            (?, 'SAT-ALPHA-2026', 18.5204, 73.8567, 'Pune Green Valley Farm', 0.78, 'Low', 68.5, 'Low', 'Healthy & Vigorous', 'Multi-spectral satellite analysis indicates robust vegetation vigor with optimal chlorophyll absorption. Moisture retention is adequate.')
        `, [farmerId]);
        console.log('✅ Seeded demo satellite scan.');
    }

    // Seed trade listings
    const [trades] = await adapter.execute('SELECT COUNT(*) as c FROM trade_listings');
    if (trades[0].c === 0) {
        await adapter.execute(`INSERT INTO trade_listings (seller_id, crop_name, quantity, price_per_unit, description, location, grade, type, is_organic, category, status) VALUES 
            (?, 'Premium Sharbati Wheat', 500, 42.00, 'Grade A golden wheat directly from farm. Zero chemicals, 100% naturally dried.', 'Nashik, Maharashtra', 'A+', 'Organic', 1, 'grain', 'active'),
            (?, 'Fresh Organic Alphonso Mangoes', 200, 350.00, 'Authentic Ratnagiri Alphonso mangoes ready for export. Sweet aroma, GI tagged.', 'Ratnagiri, Maharashtra', 'Export Grade', 'Organic', 1, 'fruit', 'active'),
            (?, 'Basmati Rice (Pusa 1121)', 800, 85.00, 'Extra-long grain aromatic Basmati rice. Fresh harvest 2026.', 'Karnal, Haryana', 'A', 'Natural', 1, 'grain', 'active'),
            (?, 'High Curcumin Lakadong Turmeric', 150, 180.00, 'Pure Lakadong turmeric with >7.5% curcumin content. Sun-dried.', 'Jaintia Hills, Meghalaya', 'A+', 'Organic', 1, 'spice', 'active')
        `, [farmerId, farmerId, farmerId, farmerId]);
        console.log('✅ Seeded demo trade listings.');
    }

    // Seed Calendar Events
    const [calEvents] = await adapter.execute('SELECT COUNT(*) as c FROM calendar_events WHERE user_id = ?', [farmerId]);
    if (calEvents[0].c === 0) {
        const todayStr = new Date().toISOString().slice(0, 10);
        await adapter.execute(`INSERT INTO calendar_events (user_id, title, start_date, color) VALUES 
            (?, 'Wheat Sowing Stage 2', ?, '#10B981'),
            (?, 'Soil pH & Nitrogen Testing', ?, '#3B82F6')
        `, [farmerId, todayStr, farmerId, todayStr]);
        console.log('✅ Seeded demo calendar events.');
    }

    // Seed Medical Reports
    const [medReports] = await adapter.execute('SELECT COUNT(*) as c FROM medical_reports WHERE user_id = ?', [farmerId]);
    if (medReports[0].c === 0) {
        await adapter.execute(`INSERT INTO medical_reports (user_id, scan_id, diagnosis, confidence, treatment) VALUES 
            (?, 'VIS-DEMO-001', 'Healthy Crop', '96.5%', 'Maintain regular irrigation and inspect for aphids weekly.')
        `, [farmerId]);
        console.log('✅ Seeded demo crop doctor report.');
    }

    // Seed Forum Posts
    const [forumPosts] = await adapter.execute('SELECT COUNT(*) as c FROM forum_posts');
    if (forumPosts[0].c === 0) {
        await adapter.execute(`INSERT INTO forum_posts (user_id, username, content, media_type, likes_count) VALUES 
            (?, 'Siddharth Farmer', '🌾 Just deployed the new NDVI satellite analysis on our wheat crop. Health score is 78/100! Anyone else experiencing higher humidity this week?', 'text', 14),
            (?, 'Siddharth Farmer', '💡 Pro tip: Drip irrigation combined with morning neem spray reduced our pest occurrences by 40% this season.', 'text', 28)
        `, [farmerId, farmerId]);
        console.log('✅ Seeded demo forum posts.');
    }

    console.log('✨ Local database initialization complete and ready for real-time operations!');
}

module.exports = {
    adapter,
    initSQLiteDatabase
};
