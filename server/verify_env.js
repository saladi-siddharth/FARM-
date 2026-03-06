require('dotenv').config();

console.log("--- 🕵️ Environment Variable Check ---");
console.log(`Node Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Port: ${process.env.PORT || 3000}`);
console.log(`App URL: ${process.env.APP_URL || 'MISSING (Defaulting to localhost)'}`);
console.log(`DB Host: ${process.env.DB_HOST ? '✅ Set' : '❌ MISSING'}`);
console.log(`Google Client ID: ${process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ MISSING'}`);
console.log(`Google Client Secret: ${process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ MISSING'}`);
console.log("-------------------------------------");

if (!process.env.APP_URL) {
    console.warn("⚠️ WARNING: APP_URL is not set. Google Auth callbacks may fail on production.");
}

process.exit(0);
