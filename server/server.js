const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');

// Load .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, { cors: { origin: "*" } });

// Middlewares
app.use(cors());
app.use(express.json());
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

// --- SOCKET.IO SIGNALLING (For Calls) ---
io.on('connection', (socket) => {
    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-connected', userId);

        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected', userId);
        });
    });

    // WebRTC Signaling
    socket.on('offer', (data) => {
        socket.to(data.roomId).emit('offer', data);
    });

    socket.on('answer', (data) => {
        socket.to(data.roomId).emit('answer', data);
    });

    socket.on('ice-candidate', (data) => {
        socket.to(data.roomId).emit('ice-candidate', data);
    });
});

// Default route to serve Dashboard
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

const PORT = process.env.PORT || 3000;
const startScheduler = require('./scheduler');
startScheduler();

server.listen(PORT, () => {
    console.log(`
    --- 🌾 FARM SYSTEM ONLINE ---
    🚀 Port: ${PORT}
    ✅ Routes Linked: Auth, Inv, Tasks, Exp, Dash, Chat
    ⚡ Socket.io: Active (Calling System Ready)
    -----------------------------
    `);
});