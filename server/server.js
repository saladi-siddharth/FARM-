const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const compression = require('compression');

// Load .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, { cors: { origin: "*" } });

// Trust Proxy for Render/Heroku (Required for secure cookies & OAuth redirects)
app.enable('trust proxy');

// Security Middlewares
app.use(helmet({
    contentSecurityPolicy: false, // Disable for now to allow inline scripts
}));
app.use(cors());
app.use(compression());

// Request Logger (Simple Morgan alternative)
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });
    next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach Socket.io to req for real-time broadcasts
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Serve Static Files
app.use(express.static(path.join(__dirname, '../public')));

// --- DATABASE AUTO-MIGRATION (for Render/Production) ---
const setupDatabase = async () => {
    try {
        console.log('🔄 Checking database tables...');
        // We'll run a simplified version of setup_database.js here
        const db = require('./config/db');
        
        // Example check: Ensure users table exists
        await db.execute(`CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255),
            role ENUM('farmer','customer','both','admin') DEFAULT 'both',
            kyc_status ENUM('not_submitted','pending','verified','rejected') DEFAULT 'not_submitted',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        
        await db.execute(`CREATE TABLE IF NOT EXISTS inventory (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            type VARCHAR(50),
            quantity DECIMAL(10,2) NOT NULL,
            cost DECIMAL(10,2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await db.execute(`CREATE TABLE IF NOT EXISTS expenses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            category VARCHAR(100) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            expense_date DATE NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        
        await db.execute(`CREATE TABLE IF NOT EXISTS tasks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            task_date DATE NOT NULL,
            task_time TIME NOT NULL,
            description TEXT NOT NULL,
            status ENUM('pending', 'completed') DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await db.execute(`CREATE TABLE IF NOT EXISTS messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sender_id INT NOT NULL,
            receiver_id INT NOT NULL,
            content TEXT,
            messaged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        
        await db.execute(`CREATE TABLE IF NOT EXISTS kyc_documents (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            document_type VARCHAR(50) NOT NULL,
            file_url VARCHAR(500) NOT NULL,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await db.execute(`CREATE TABLE IF NOT EXISTS satellite_scans (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            scan_id VARCHAR(50) NOT NULL,
            ndvi_score DECIMAL(5,2),
            crop_stress VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        
        console.log('✅ Database tables verified.');
    } catch (err) {
        console.error('⚠️ Database Warmup Warning:', err.message);
    }
};
setupDatabase();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/trade', require('./routes/trade'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/sms', require('./routes/sms'));
app.use('/api/satellite', require('./routes/satellite'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/kyc', require('./routes/kyc'));
app.use('/api/shipments', require('./routes/shipments'));
app.use('/api/disputes', require('./routes/disputes'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/payouts', require('./routes/payouts'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/market', require('./routes/market'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/forum', require('./routes/forum'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/doctor', require('./routes/doctor'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Socket.io for Real-Time notifications and presence
const onlineUsers = new Map();
io.on('connection', (socket) => {
    socket.on('user-online', (username) => {
        socket.username = username;
        onlineUsers.set(socket.id, username);
        console.log(`User Online: ${username}`);
    });
    socket.on('disconnect', () => {
        onlineUsers.delete(socket.id);
    });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Health Check
app.get('/health', async (req, res) => {
    try {
        const db = require('./config/db');
        await db.execute('SELECT 1');
        res.json({ status: 'OK', db: 'Connected', time: new Date() });
    } catch (err) {
        res.status(500).json({ status: 'Error', db: err.message });
    }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`☁️ Database: ${process.env.DB_HOST || 'localhost'}`);
});