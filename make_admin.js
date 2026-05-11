// Run: node make_admin.js <your-email>
// Example: node make_admin.js siddhu@gmail.com

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./server/config/db');

async function makeAdmin() {
    const email = process.argv[2];
    
    if (!email) {
        // If no email provided, show all users and let them pick
        const [users] = await db.execute('SELECT id, username, email, role FROM users ORDER BY id');
        console.log('\n👥 All Users:\n');
        users.forEach(u => console.log(`  #${u.id} | ${u.username} | ${u.email} | role: ${u.role}`));
        console.log('\n⚡ Usage: node make_admin.js <email>');
        process.exit(0);
    }

    try {
        const [result] = await db.execute('UPDATE users SET role = ? WHERE email = ?', ['admin', email]);
        
        if (result.affectedRows > 0) {
            console.log(`\n✅ SUCCESS! ${email} is now an ADMIN`);
            console.log(`\n🔗 Go to: http://localhost:5000/admin.html`);
            console.log(`   (Make sure you're logged in with this email first)\n`);
        } else {
            console.log(`\n❌ No user found with email: ${email}`);
            console.log(`   Run without arguments to see all users: node make_admin.js\n`);
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
    process.exit(0);
}

makeAdmin();
