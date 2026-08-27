const mysql = require('mysql2');
const path = require('path');
const { adapter: sqliteAdapter, initSQLiteDatabase } = require('./sqlite_adapter');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

let activeDb = null;
let isUsingSqlite = false;

// 1. Prepare MySQL Configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'farming',
    port: parseInt(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 50,
    queueLimit: 0,
    connectTimeout: 5000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
};

if (process.env.DB_HOST && process.env.DB_HOST !== 'localhost') {
    dbConfig.ssl = {
        rejectUnauthorized: false
    };
}

// 2. Initialize Database with automatic fallback
let mysqlPool = null;

try {
    mysqlPool = mysql.createPool(dbConfig);
    activeDb = mysqlPool.promise();

    // Probe connection
    mysqlPool.getConnection((err, connection) => {
        if (err) {
            console.warn(`\n⚠️ MySQL/TiDB connection unavailable (${err.message}).`);
            console.log('🔄 Seamlessly switching to High-Performance Local Database (SQLite)...');
            isUsingSqlite = true;
            activeDb = sqliteAdapter;
            initSQLiteDatabase().catch(e => console.error('SQLite Init Error:', e.message));
        } else {
            console.log(`✅ MySQL Cloud Database Connected: [${dbConfig.database}] on ${dbConfig.host}:${dbConfig.port}`);
            connection.release();
        }
    });
} catch (err) {
    console.warn('⚠️ MySQL Init Warning:', err.message);
    isUsingSqlite = true;
    activeDb = sqliteAdapter;
    initSQLiteDatabase().catch(e => console.error('SQLite Init Error:', e.message));
}

// 3. Proxy Handler for transparent calls
const dbProxy = {
    execute: async (sql, params = []) => {
        try {
            if (isUsingSqlite) {
                return await sqliteAdapter.execute(sql, params);
            }
            return await activeDb.execute(sql, params);
        } catch (err) {
            // If MySQL failed mid-operation, switch to SQLite
            if (!isUsingSqlite && (err.code === 'ER_ACCESS_DENIED_ERROR' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'PROTOCOL_CONNECTION_LOST')) {
                console.warn(`⚠️ MySQL disconnected (${err.code}). Falling back to local SQLite...`);
                isUsingSqlite = true;
                activeDb = sqliteAdapter;
                await initSQLiteDatabase();
                return await sqliteAdapter.execute(sql, params);
            }
            throw err;
        }
    },
    query: async (sql, params = []) => {
        try {
            if (isUsingSqlite) {
                return await sqliteAdapter.query(sql, params);
            }
            return await activeDb.query(sql, params);
        } catch (err) {
            if (!isUsingSqlite && (err.code === 'ER_ACCESS_DENIED_ERROR' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'PROTOCOL_CONNECTION_LOST')) {
                console.warn(`⚠️ MySQL disconnected (${err.code}). Falling back to local SQLite...`);
                isUsingSqlite = true;
                activeDb = sqliteAdapter;
                await initSQLiteDatabase();
                return await sqliteAdapter.query(sql, params);
            }
            throw err;
        }
    },
    getConnection: async () => {
        if (isUsingSqlite) {
            return await sqliteAdapter.getConnection();
        }
        return await activeDb.getConnection();
    }
};

module.exports = dbProxy;