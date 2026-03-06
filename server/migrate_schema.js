const db = require('./config/db');

async function migrateSchema() {
    console.log('🔄 Starting database schema migration...');

    try {
        // 1. Ensure columns exist and have correct types
        const migrations = [
            {
                name: 'google_id',
                sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE'
            },
            {
                name: 'reset_token',
                sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255)'
            },
            {
                name: 'reset_expires (Add)',
                sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires DATETIME',
                ignoreError: 'Duplicate column'
            },
            {
                name: 'reset_expires (Fix Type)',
                sql: 'ALTER TABLE users MODIFY COLUMN reset_expires DATETIME'
            },
            {
                name: 'phone_number',
                sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20)'
            },
            {
                name: 'wallet_balance',
                sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10,2) DEFAULT 0.00'
            },
            {
                name: 'created_at',
                sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
            },
            {
                name: 'updated_at',
                sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
            }
        ];

        for (const m of migrations) {
            try {
                await db.execute(m.sql);
                console.log(`✅ ${m.name} migration applied.`);
            } catch (err) {
                if (m.ignoreError && err.message.includes(m.ignoreError)) {
                    console.log(`ℹ️ ${m.name} already in desired state.`);
                } else if (err.message.includes('Duplicate column')) {
                    console.log(`ℹ️ ${m.name} column already exists.`);
                } else {
                    console.warn(`⚠️  ${m.name} migration warning:`, err.message);
                }
            }
        }

        // 2. Modify password column to be nullable (for OAuth users)
        await db.execute('ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL');
        console.log('✅ Password column is now nullable.');

        console.log('🎉 Database Schema Migration Successful!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration Critical Error:', err.message);
        process.exit(1);
    }
}

migrateSchema();
