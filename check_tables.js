const db = require('./server/config/db');
async function check() {
    try {
        const [disputes] = await db.execute('DESCRIBE disputes');
        console.log('DISPUTES:', disputes.map(f => f.Field));
        const [payouts] = await db.execute('DESCRIBE payout_requests');
        console.log('PAYOUTS:', payouts.map(f => f.Field));
        process.exit(0);
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }
}
check();
