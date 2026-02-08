const db = require('./config/db');

async function migrateSchema() {
    console.log('🔄 Starting database schema migration...');

    try {
        // Add google_id column if not exists
        await db.execute(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE
        `).catch(err => {
            if (!err.message.includes('Duplicate column')) {
                console.log('⚠️  google_id column may already exist');
            }
        });

        // Add reset_token column if not exists
        await db.execute(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS reset_token VARCHAR(6)
        `).catch(err => {
            if (!err.message.includes('Duplicate column')) {
                console.log('⚠️  reset_token column may already exist');
            }
        });

        // Add reset_expires column if not exists
        await db.execute(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS reset_expires BIGINT
        `).catch(err => {
            if (!err.message.includes('Duplicate column')) {
                console.log('⚠️  reset_expires column may already exist');
            }
        });

        // Add created_at column if not exists
        await db.execute(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        `).catch(err => {
            if (!err.message.includes('Duplicate column')) {
                console.log('⚠️  created_at column may already exist');
            }
        });

        // Add updated_at column if not exists
        await db.execute(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        `).catch(err => {
            if (!err.message.includes('Duplicate column')) {
                console.log('⚠️  updated_at column may already exist');
            }
        });

        // Modify password column to be nullable (for OAuth users)
        await db.execute(`
            ALTER TABLE users 
            MODIFY COLUMN password VARCHAR(255) NULL
        `).catch(err => {
            console.log('⚠️  Password column modification may have failed:', err.message);
        });

        console.log('✅ Schema migration completed successfully!');
        console.log('📊 Users table now supports:');
        console.log('   - Google OAuth (google_id)');
        console.log('   - Password Reset (reset_token, reset_expires)');
        console.log('   - Timestamps (created_at, updated_at)');
        console.log('   - Nullable passwords for OAuth users');

        process.exit(0);
    } catch (err) {
        console.error('❌ Migration Error:', err.message);
        process.exit(1);
    }
}

// Run migration
migrateSchema();
