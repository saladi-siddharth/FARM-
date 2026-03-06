<div align="center">

# 🌾 FARM CENTRAL

### *The All-in-One AI-Powered Agricultural Ecosystem*

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Gemini AI](https://img.shields.io/badge/Gemini_1.5_Flash-Powered-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev)
[![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![MySQL](https://img.shields.io/badge/TiDB_Cloud-Database-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://tidbcloud.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**Farm Central** is a next-generation, AI-first platform built for the modern Indian farmer. It combines real-time market intelligence, voice-activated AI assistants, precision geo-mapping, and clinical-grade crop disease diagnosis — all accessible in **12 Indian languages**, online or offline.

[🚀 Live Demo](#) · [📸 Screenshots](#-screenshots) · [🏗️ Architecture](#️-architecture) · [⚡ Quick Start](#-quick-start)

---

</div>

## 🎯 Problem Statement

Over **60% of India's population** depends on agriculture, yet most farmers lack access to:
- Timely, accurate crop disease diagnosis
- Real-time market prices for informed selling
- Financial tracking and ROI estimation
- Expert agricultural advice in their native language

**Farm Central** bridges this gap with AI and modern web technologies, delivering a premium experience that works even in areas with poor connectivity.

---

## ✨ Key Features

### 🔬 AI Crop Doctor (Gemini Vision)
- Upload or capture a photo of any affected leaf
- **Gemini 1.5 Flash** analyzes the image with clinical precision
- Returns: **Disease name**, **Scientific pathogen name**, **Severity level**, **Confidence score**
- Provides **Organic + Chemical treatment plans** with specific Indian market product names
- Results read aloud via **Text-to-Speech**
- Save & download diagnoses as **PDF reports**

### 🎙️ Voice-Activated AI Assistant
- **Wake word**: Say *"Farm Central, Farm Central"* to activate
- Processes natural language commands in **12 languages**
- Automatically logs expenses or inventory to the database via voice
- AI responds vocally using **Speech Synthesis**
- Powered by **Gemini 1.5 Flash** for intent parsing

### 🤖 AI Predictive Analytics
- Analyzes your **real inventory and expense data** from the database
- Generates **Yield Predictions**, **Financial Health Status**, and **Actionable Advice**
- Auto-refreshes when voice commands modify data

### 🗺️ Precision Geo-Mapping
- Interactive **Leaflet.js** map on the dashboard
- Plot farm boundaries with soil moisture and pH overlays
- Satellite/outdoor tile layers for field-level precision

### 📲 Progressive Web App (PWA)
- Installable on **Android, iOS, and Desktop**
- Full **offline support** — all 18+ pages cached via Service Worker
- Automatic **online/offline status indicator**
- Smart install button (visible on website, hidden in installed app)

### 🌐 12-Language Support
| Language | Code | Language | Code |
|----------|------|----------|------|
| English | en-IN | Tamil | ta-IN |
| Hindi | hi-IN | Kannada | kn-IN |
| Punjabi | pa-IN | Malayalam | ml-IN |
| Telugu | te-IN | Bengali | bn-IN |
| Marathi | mr-IN | Odia | or-IN |
| Gujarati | gu-IN | Urdu | ur-IN |

### 📊 Additional Modules
| Module | Description |
|--------|-------------|
| **Market Data** | Real-time commodity prices with trends |
| **Inventory Manager** | Track seeds, fertilizers, pesticides with low-stock alerts |
| **Expense Tracker** | Categorized financial management with email alerts |
| **ROI Calculator** | Input costs → get profit/loss projections |
| **Task Manager** | Daily farm task scheduling with calendar view |
| **Community Forum** | Farmer-to-farmer knowledge sharing |
| **Trade Hub** | Buy/Sell surplus produce and equipment |
| **AI Chat** | Open-domain agricultural Q&A in any language |
| **Professional Reports** | Generate and download PDF diagnostic reports |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│  HTML5 + Tailwind CSS + Vanilla JS               │
│  PWA (Service Worker + Manifest)                 │
│  Web Speech API (Voice Recognition/Synthesis)    │
│  Leaflet.js (Geo-Mapping)                        │
│  Chart.js (Data Visualization)                   │
└──────────────────────┬──────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────┐
│                   BACKEND                        │
│  Node.js + Express.js                            │
│  JWT Authentication + Google OAuth 2.0           │
│  Multer (Image Upload) + PDFKit (Report Gen)     │
│  Nodemailer (Email Alerts)                       │
│  Helmet + Rate Limiter (Security)                │
└──────────────────────┬──────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
   ┌──────────┐  ┌──────────┐  ┌──────────────┐
   │ TiDB     │  │ Gemini   │  │ Google OAuth  │
   │ Cloud    │  │ 1.5 Flash│  │ 2.0           │
   │ (MySQL)  │  │ (AI/ML)  │  │ (Auth)        │
   └──────────┘  └──────────┘  └──────────────┘
```

---

## ⚡ Quick Start

### Prerequisites
- **Node.js** 18+ 
- **MySQL** database (or TiDB Cloud account)
- **Gemini API Key** ([Get one here](https://aistudio.google.com/app/apikey))

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/farm-central.git
cd farm-central

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your credentials (DB, Gemini Key, JWT Secret, Email)

# 4. Run database migrations
npm run migrate

# 5. Start the development server
npm run dev
```

The app will be available at `http://localhost:3000`

### Environment Variables

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Secret key for JWT token signing |
| `DB_HOST` | MySQL/TiDB database host |
| `DB_USER` | Database username |
| `DB_PASSWORD` | Database password |
| `DB_NAME` | Database name |
| `DB_PORT` | Database port (default: 3306) |
| `GEMINI_API_KEY` | Google Gemini API key for AI features |
| `EMAIL_USER` | Gmail address for email alerts |
| `EMAIL_PASS` | Gmail app password |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |

---

## 🛡️ Security

- **Helmet.js** for HTTP header security
- **Rate Limiting** to prevent brute-force attacks
- **JWT Authentication** with token expiry
- **bcrypt** password hashing
- **Input Validation** with express-validator and Joi
- **CORS** protection
- **SSL** auto-detection for cloud databases

---

## 📱 PWA Capabilities

| Feature | Status |
|---------|--------|
| Installable on Android/iOS/Desktop | ✅ |
| Offline Mode (18+ pages cached) | ✅ |
| Background Sync | ✅ |
| Push Notifications Ready | ✅ |
| Auto-update on new deployment | ✅ |
| Standalone display mode | ✅ |

---

## 🧪 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, Tailwind CSS, Vanilla JavaScript |
| **Backend** | Node.js, Express.js |
| **Database** | MySQL (TiDB Cloud) |
| **AI/ML** | Google Gemini 1.5 Flash (Vision + Text) |
| **Voice** | Web Speech API (Recognition + Synthesis) |
| **Maps** | Leaflet.js |
| **Charts** | Chart.js |
| **Auth** | JWT + Google OAuth 2.0 + Passport.js |
| **Email** | Nodemailer (Gmail SMTP) |
| **PDF** | PDFKit |
| **PWA** | Service Worker + Web App Manifest |
| **Security** | Helmet, Rate Limiter, CORS, bcrypt |
| **DevOps** | PM2, Nodemon |

---

## 👥 Team

| Name | Role |
|------|------|
| **Siddharth Saladi** | Full-Stack Developer & AI Architect |

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ for Indian Farmers**

*Farm Central — Farming, Reimagined.*

</div>
