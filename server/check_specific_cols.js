const db = require('./config/db');

async function checkSpecific() {
    try {
        const [rows] = await db.query('DESCRIBE users');
        const relevantInfo = rows
            .map(row => ({ field: row.Field, type: row.Type, nullable: row.Null }));

        console.log(JSON.stringify(relevantInfo, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSpecific();
