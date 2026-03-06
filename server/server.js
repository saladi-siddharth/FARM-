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
    crossOriginEmbedderPolicy: false
}));

// Compression Middleware (reduces response size by ~70%)
app.use(compression({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    },
    level: 6 // Compression level (0-9, 6 is balanced)
}));

// CORS Configuration
app.use(cors({
    origin: process.env.APP_URL || '*',
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize Passport for Google Auth
const passport = require('./config/passport');
app.use(passport.initialize());

app.use(express.static(path.join(__dirname, '../public')));

// --- REGISTER ALL API ROUTES ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/forum', require('./routes/forum'));
app.use('/api/trading', require('./routes/trading'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/market', require('./routes/market'));
app.use('/api/doctor', require('./routes/doctor'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/trade', require('./routes/trade'));
app.use('/api/ai', require('./routes/ai')); // NEW AI VOICE ROUTE
app.use('/api/sms', require('./routes/sms')); // Twilio SMS Route
app.use('/api/satellite', require('./routes/satellite')); // 🛰️ Satellite Farm Scanner
app.use('/api/admin', require('./routes/admin')); // 🔧 Admin Panel

// --- SOCKET.IO SIGNALLING (For Calls) ---
// --- SOCKET.IO SIGNALLING (Real-Time Presence & Calls) ---
const onlineUsers = new Map(); // Store { socketId: username }

io.on('connection', (socket) => {

    // 1. Handle User Presence
    socket.on('user-online', (username) => {
        socket.username = username;
        onlineUsers.set(socket.id, username);

        // Broadcast to others that this user is online
        socket.broadcast.emit('user-status', { username, status: 'online' });

        // Send list of currently online users to THIS new user
        const activeUsers = Array.from(new Set(onlineUsers.values())); // Unique usernames
        socket.emit('active-users-list', activeUsers);
    });

    // 2. Handle Disconnect
    socket.on('disconnect', () => {
        const username = onlineUsers.get(socket.id);
        if (username) {
            onlineUsers.delete(socket.id);
            // Only broadcast offline if no other sockets exist for this user (simple check)
            // For now, we just broadcast. The client can handle debounce or check.
            io.emit('user-status', { username, status: 'offline' });
        }
    });

    // 3. WebRTC Signaling (Calls)
    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-connected', userId);
    });

    socket.on('offer', (data) => socket.to(data.roomId).emit('offer', data));
    socket.on('answer', (data) => socket.to(data.roomId).emit('answer', data));
    socket.on('ice-candidate', (data) => socket.to(data.roomId).emit('ice-candidate', data));

    // 4. Call Signaling (Ringing)
    socket.on('call-request', (data) => socket.broadcast.emit('incoming-call', data));
    socket.on('call-accepted', (data) => socket.broadcast.emit('call-started', data));
    socket.on('call-rejected', (data) => socket.broadcast.emit('call-ended', data));

    // 5. Chat Typing
    socket.on('typing', (data) => socket.broadcast.emit('typing', data));
    socket.on('stop-typing', (data) => socket.broadcast.emit('stop-typing', data));
});

// Import error handlers
const { errorHandler, notFoundHandler } = require('./middleware/security');

// Default route to serve Landing Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Health Check (Public) — must be BEFORE catch-all
app.get('/health', async (req, res) => {
    try {
        const db = require('./config/db');
        await db.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected', timestamp: new Date() });
    } catch (err) {
        res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
    }
});

// Debug Route (Protected — only in development)
if (process.env.NODE_ENV !== 'production') {
    app.get('/api/debug-env', (req, res) => {
        res.json({
            has_db_host: !!process.env.DB_HOST,
            has_db_user: !!process.env.DB_USER,
            has_email_user: !!process.env.EMAIL_USER,
            has_email_pass: !!process.env.EMAIL_PASS,
            node_env: process.env.NODE_ENV || 'development'
        });
    });
}

// Catch-all route — serve dashboard.html for any non-API, non-file route
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
        return next(); // Let API 404 handler catch it
    }
    // Serve the requested HTML file or fallback to dashboard
    const htmlPath = path.join(__dirname, '../public', req.path);
    res.sendFile(htmlPath, (err) => {
        if (err) {
            res.sendFile(path.join(__dirname, '../public/dashboard.html'));
        }
    });
});

// 404 Handler for undefined API routes
app.use(notFoundHandler);

// Global Error Handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const startScheduler = require('./scheduler');
const { verifyConnection } = require('./utils/mailer'); // Import Verify

// Conditional Listen for Local Development
if (require.main === module) {
    startScheduler();
    verifyConnection(); // Verify SMTP on Start

    server.listen(PORT, () => {
        console.log(`
        --- 🌾 FARM SYSTEM ONLINE ---
        🚀 Port: ${PORT}
        ✅ Routes Linked: Auth, Inv, Tasks, Exp, Dash, Chat
        ⚡ Socket.io: Active (Calling System Ready)
        -----------------------------
        `);
        if (process.env.NODE_ENV === 'production' && !process.env.APP_URL) {
            console.warn("⚠️  WARNING: APP_URL is not set! Google Auth redirects will likely fail.");
        }
    });
}

// Export for Vercel (Serverless)
module.exports = app;