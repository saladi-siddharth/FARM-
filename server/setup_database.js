const mysql = require('mysql2/promise');
require('dotenv').config();

async function setup() {
    const dbName = process.env.DB_NAME || 'test';
    const hostConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        port: process.env.DB_PORT || 3306,
        ssl: process.env.DB_HOST && process.env.DB_HOST !== 'localhost'
            ? { rejectUnauthorized: false }
            : undefined
    };

    console.log('🚀 Starting Database Setup...');

    try {
        const connection = await mysql.createConnection(hostConfig);
        console.log('✅ Connected to MySQL Server');

        // 1. Create/Use Database
        console.log(`📂 Ensuring database "${dbName}" exists...`);
        try {
            await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        } catch (e) {
            console.log('   (Database might already exist or auto-created)');
        }
        await connection.query(`USE \`${dbName}\``);

        const tables = [
            {
                name: 'users',
                sql: `CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password VARCHAR(255),
                    google_id VARCHAR(255) UNIQUE,
                    wallet_balance DECIMAL(10,2) DEFAULT 0.00,
                    reset_token VARCHAR(255),
                    reset_expires DATETIME,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )`
            },
            {
                name: 'inventory',
                sql: `CREATE TABLE IF NOT EXISTS inventory (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    type VARCHAR(50),
                    quantity DECIMAL(10,2) NOT NULL,
                    cost DECIMAL(10,2),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )`
            },
            {
                name: 'tasks',
                sql: `CREATE TABLE IF NOT EXISTS tasks (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    task_date DATE NOT NULL,
                    task_time TIME NOT NULL,
                    description TEXT NOT NULL,
                    status ENUM('pending', 'completed') DEFAULT 'pending',
                    is_notified TINYINT(1) DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )`
            },
            {
                name: 'expenses',
                sql: `CREATE TABLE IF NOT EXISTS expenses (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    category VARCHAR(100) NOT NULL,
                    amount DECIMAL(10,2) NOT NULL,
                    expense_date DATE NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )`
            },
            {
                name: 'market_listings',
                sql: `CREATE TABLE IF NOT EXISTS market_listings (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    username VARCHAR(255),
                    crop_name VARCHAR(255) NOT NULL,
                    quantity DECIMAL(10,2) NOT NULL,
                    price_per_unit DECIMAL(10,2) NOT NULL,
                    location VARCHAR(255),
                    status ENUM('active', 'sold') DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )`
            },
            {
                name: 'trade_listings',
                sql: `CREATE TABLE IF NOT EXISTS trade_listings (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    seller_id INT NOT NULL,
                    buyer_id INT,
                    crop_name VARCHAR(255) NOT NULL,
                    quantity DECIMAL(10,2) NOT NULL,
                    price_per_unit DECIMAL(10,2) NOT NULL,
                    description TEXT,
                    status ENUM('active', 'sold') DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE SET NULL
                )`
            },
            {
                name: 'transactions',
                sql: `CREATE TABLE IF NOT EXISTS transactions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    listing_id INT NOT NULL,
                    buyer_id INT NOT NULL,
                    seller_id INT,
                    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
                    total_amount DECIMAL(10,2) DEFAULT 0,
                    commission DECIMAL(10,2) DEFAULT 0,
                    status VARCHAR(50) DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (buyer_id) REFERENCES users(id)
                )`
            },
            {
                name: 'forum_posts',
                sql: `CREATE TABLE IF NOT EXISTS forum_posts (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    username VARCHAR(255) NOT NULL,
                    content TEXT NOT NULL,
                    media_url VARCHAR(500),
                    media_type ENUM('text', 'image', 'video') DEFAULT 'text',
                    likes INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )`
            },
            {
                name: 'messages',
                sql: `CREATE TABLE IF NOT EXISTS messages (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    sender_id INT NOT NULL,
                    receiver_id INT NOT NULL,
                    sender_username VARCHAR(255),
                    receiver_username VARCHAR(255),
                    content TEXT,
                    msg_type ENUM('text', 'image', 'video', 'audio') DEFAULT 'text',
                    media_url VARCHAR(500),
                    messaged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
                )`
            },
            {
                name: 'medical_reports',
                sql: `CREATE TABLE IF NOT EXISTS medical_reports (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    scan_id VARCHAR(50) NOT NULL,
                    diagnosis VARCHAR(255) NOT NULL,
                    confidence VARCHAR(50),
                    treatment TEXT,
                    image_url VARCHAR(500),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )`
            },
            {
                name: 'calendar_events',
                sql: `CREATE TABLE IF NOT EXISTS calendar_events (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    start_date DATETIME NOT NULL,
                    end_date DATETIME,
                    color VARCHAR(20) DEFAULT '#3B82F6',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )`
            }
        ];

        for (const table of tables) {
            try {
                console.log(`⚙️  Creating/checking table "${table.name}"...`);
                await connection.execute(table.sql);
                console.log(`✅ Table "${table.name}" ready`);
            } catch (err) {
                console.error(`❌ Error creating table "${table.name}":`, err.message);
            }
        }

        console.log('\n🎉 ========================================');
        console.log('   All Database Tables Ready!');
        console.log(`   Connected to: ${dbName}`);
        console.log('   ========================================\n');

        await connection.end();
        process.exit(0);

    } catch (err) {
        console.error('\n❌ DB Setup Critical Error:', err.message);
        process.exit(1);
    }
}

setup();
