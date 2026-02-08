# 🌾 Smart Farm Authentication System

A production-ready full-stack farming management application with advanced authentication, real-time features, and comprehensive security.

## 🚀 Features

### Authentication & Security
- ✅ **Email/Password Authentication** with bcrypt hashing
- ✅ **Google OAuth 2.0** integration
- ✅ **Password Reset** with OTP via email
- ✅ **JWT Token-based** session management
- ✅ **Rate Limiting** on auth endpoints (5 requests/15min)
- ✅ **Input Validation** using Joi schemas
- ✅ **Helmet.js** security headers
- ✅ **CORS** configuration

### Core Features
- 📊 **Dashboard** - Real-time farm analytics
- 📦 **Inventory Management** - Track farm supplies
- ✅ **Task Scheduler** - Plan and manage farm activities
- 💰 **Expense Tracking** - Monitor farm expenses
- 📅 **Calendar** - Visual task planning
- 💬 **Real-time Chat** - WebRTC video/audio calls with Socket.io
- 🏥 **AI Doctor** - Farm health diagnostics
- 📈 **Trading Platform** - Commodity trading
- 🌐 **Market Prices** - Live market data
- 📱 **Forum** - Community discussions

## 📋 Prerequisites

- Node.js 16+ and npm
- MySQL/TiDB Cloud database
- Gmail account (for email alerts)
- Google Cloud Console project (for OAuth)

## 🛠️ Installation

### 1. Clone and Install Dependencies

```bash
cd authentication
npm install
```

### 2. Configure Environment Variables

Edit `.env` file with your credentials:

```env
# JWT & Session
JWT_SECRET=your-super-secret-jwt-key
SESSION_SECRET=your-session-secret-key

# Database (TiDB Cloud / MySQL)
DB_HOST=your-database-host
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=your-database-name
DB_PORT=4000

# Email (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Application URL
APP_URL=http://localhost:3000
```

### 3. Setup Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Set **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/google/callback`
   - `https://your-domain.com/api/auth/google/callback` (for production)
6. Copy **Client ID** and **Client Secret** to `.env`

### 4. Setup Gmail App Password

1. Enable 2-Factor Authentication on your Gmail account
2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Generate a new app password for "Mail"
4. Copy the 16-character password to `.env` as `EMAIL_PASS`

### 5. Run Database Migration

```bash
npm run migrate
```

This will:
- Add `google_id` column for OAuth
- Add `reset_token` and `reset_expires` for password reset
- Add timestamps (`created_at`, `updated_at`)
- Make `password` nullable for OAuth users

## 🚀 Running the Application

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000`

## 📡 API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| POST | `/signup` | Register new user | 5/15min |
| POST | `/signin` | Login with email/password | 5/15min |
| POST | `/forgot-password` | Request password reset OTP | 5/15min |
| POST | `/reset-password` | Reset password with OTP | 5/15min |
| GET | `/google` | Initiate Google OAuth | - |
| GET | `/google/callback` | Google OAuth callback | - |
| POST | `/test-email` | Test email configuration | - |

### Other Routes
- `/api/inventory` - Inventory management
- `/api/tasks` - Task scheduling
- `/api/expenses` - Expense tracking
- `/api/dashboard` - Dashboard analytics
- `/api/calendar` - Calendar events
- `/api/forum` - Community forum
- `/api/trading` - Trading platform
- `/api/chat` - Real-time chat
- `/api/market` - Market prices
- `/api/doctor` - AI diagnostics
- `/api/reports` - Generate reports
- `/api/trade` - Trade management
- `/api/ai` - AI voice assistant

### Health & Debug
- `GET /health` - Health check with DB status
- `GET /api/debug-env` - Environment variables check

## 🧪 Testing

### Test Email Configuration
```bash
curl -X POST http://localhost:3000/api/auth/test-email \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@gmail.com"}'
```

### Test Signup
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testfarmer",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Test Login
```bash
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## 🔒 Security Features

### Implemented
- ✅ **Helmet.js** - Security headers (XSS, clickjacking protection)
- ✅ **Rate Limiting** - Prevents brute force attacks
- ✅ **Input Validation** - Joi schemas for all inputs
- ✅ **Password Hashing** - bcrypt with salt rounds
- ✅ **JWT Tokens** - Secure session management
- ✅ **CORS** - Configured origin restrictions
- ✅ **SQL Injection Prevention** - Parameterized queries
- ✅ **Error Handling** - Centralized error middleware

### Best Practices
- Passwords are hashed with bcrypt (10 salt rounds)
- JWT tokens expire in 24 hours
- OAuth users don't store passwords
- Email alerts on login events
- OTP expires in 1 hour
- Environment variables for secrets

## 📁 Project Structure

```
authentication/
├── server/
│   ├── config/
│   │   ├── db.js              # Database connection
│   │   └── passport.js        # Google OAuth strategy
│   ├── middleware/
│   │   ├── auth.js            # JWT authentication
│   │   ├── security.js        # Rate limiting & error handling
│   │   └── validator.js       # Input validation
│   ├── routes/
│   │   ├── auth.js            # Authentication routes
│   │   ├── inventory.js       # Inventory management
│   │   ├── tasks.js           # Task scheduling
│   │   └── ... (other routes)
│   ├── utils/
│   │   └── mailer.js          # Email service
│   ├── server.js              # Main server file
│   └── migrate_schema.js      # Database migration
├── public/
│   ├── index.html             # Landing page
│   ├── login.html             # Login page
│   ├── dashboard.html         # Main dashboard
│   └── ... (other pages)
├── .env                       # Environment variables
├── package.json               # Dependencies
└── README.md                  # This file
```

## 🌐 Deployment

### Vercel (Recommended for Frontend + Serverless)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

The `vercel.json` is already configured.

### Render.com (For Full Backend)

1. Create a new Web Service
2. Connect your GitHub repository
3. Set environment variables in Render dashboard
4. Deploy!

### Environment Variables for Production

Make sure to set these in your deployment platform:
- `JWT_SECRET`
- `SESSION_SECRET`
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`
- `EMAIL_USER`, `EMAIL_PASS`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `APP_URL` (your production URL)
- `NODE_ENV=production`

## 🐛 Troubleshooting

### Database Connection Issues
- Verify TiDB Cloud credentials
- Check if SSL is enabled for remote connections
- Test connection: `npm run migrate`

### Email Not Sending
- Ensure Gmail 2FA is enabled
- Use App Password, not regular password
- Test: `POST /api/auth/test-email`

### Google OAuth Not Working
- Check redirect URIs match exactly
- Verify Google+ API is enabled
- Ensure credentials are in `.env`

### Rate Limiting Errors
- Wait 15 minutes or adjust limits in `middleware/security.js`

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255),              -- Nullable for OAuth
    google_id VARCHAR(255) UNIQUE,      -- Google OAuth ID
    reset_token VARCHAR(6),             -- Password reset OTP
    reset_expires BIGINT,               -- OTP expiry timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📝 License

MIT License - feel free to use this project for your own purposes.

## 👨‍💻 Author

Built with ❤️ by the Smart Farm Team

## 🔗 Links

- [TiDB Cloud](https://tidbcloud.com/)
- [Google OAuth Setup](https://console.cloud.google.com/)
- [Gmail App Passwords](https://myaccount.google.com/apppasswords)
- [Vercel Deployment](https://vercel.com/)

---

**Need Help?** Check the troubleshooting section or open an issue on GitHub.
