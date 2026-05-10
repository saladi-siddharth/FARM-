const mysql = require('mysql2');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'farming',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 100, // Increased from 10 to 100 for scalability
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
};

// 🌩️ Cloud Database Support (TiDB, PlanetScale, AWS)
// Automatically enable SSL if we are connecting to a remote host
if (process.env.DB_HOST && process.env.DB_HOST !== 'localhost') {
    console.log(`☁️ Configuring SSL for Remote Database: ${process.env.DB_HOST}`);
    dbConfig.ssl = {
        rejectUnauthorized: false // Helps avoid 'Self-signed' errors on Render/Free tiers
    };
}

const pool = mysql.createPool(dbConfig);

// Test connection on startup with a timeout
const dbName = process.env.DB_NAME || 'farming';
pool.getConnection((err, connection) => {
    if (err) {
        console.error('\n❌ --- DATABASE CONNECTION CRITICAL ERROR ---');
        console.error(`ID: [${dbName}] at ${dbConfig.host}:${dbConfig.port}`);
        console.error(`ERROR: ${err.message}`);
        console.error('POSSIBLE CAUSES:');
        console.error('1. TiDB Cloud IP Access List: Did you whitelist 0.0.0.0/0?');
        console.error('2. Wrong Port: Is it definitely 4000 in Render settings?');
        console.error('3. SSL: Is SSL enabled (it should be automatically)?');
        console.error('----------------------------------------------\n');
    } else {
        console.log(`✅ Database Connected: [${dbName}]`);
        connection.release();
    }
});

module.exports = pool.promise();