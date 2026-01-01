const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');

// Load .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();

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

// Default route to serve Dashboard
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
    --- 🌾 FARM SYSTEM ONLINE ---
    🚀 Port: ${PORT}
    ✅ Routes Linked: Auth, Inv, Tasks, Exp, Dash
    -----------------------------
    `);
});