require('dotenv').config();
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');

async function testDB() {
    console.log('\n=== DATABASE CONNECTION TEST ===');
    console.log('Host:', process.env.DB_HOST);
    console.log('User:', process.env.DB_USER);
    console.log('Database:', process.env.DB_NAME);
    console.log('Port:', process.env.DB_PORT);

    try {
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: parseInt(process.env.DB_PORT) || 4000,
            ssl: { rejectUnauthorized: false },
            connectTimeout: 15000
        });

        const [rows] = await conn.execute('SELECT 1 AS test');
        console.log('✅ DB Connected! Test query:', rows);

        const [tables] = await conn.execute('SHOW TABLES');
        console.log('📋 Tables found:', tables.length);
        tables.forEach(t => console.log('  -', Object.values(t)[0]));

        await conn.end();
    } catch (e) {
        console.error('❌ DB Error:', e.message);
        console.error('   Code:', e.code);
    }
}

async function testSMTP() {
    console.log('\n=== SMTP CONNECTION TEST ===');
    console.log('Email User:', process.env.EMAIL_USER);
    console.log('Email Pass:', process.env.EMAIL_PASS ? '****' + process.env.EMAIL_PASS.slice(-4) : 'NOT SET');

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        await transporter.verify();
        console.log('✅ SMTP Connection Verified!');
    } catch (e) {
        console.error('❌ SMTP Error:', e.message);
        console.error('   Code:', e.code);
        console.error('   Response:', e.response);
    }
}

(async () => {
    await testDB();
    await testSMTP();
    console.log('\n=== TESTS COMPLETE ===\n');
    process.exit(0);
})();
