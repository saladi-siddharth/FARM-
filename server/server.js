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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach Socket.io to req for real-time broadcasts
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Serve Static Files
app.use(express.static(path.join(__dirname, '../public')));

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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`☁️ Database: ${process.env.DB_HOST || 'localhost'}`);
});