# Deployment Guide

## ⚠️ Important Note About GitHub Pages
You requested to host this on **GitHub Pages**. However, **GitHub Pages only supports static websites** (HTML, CSS, JavaScript).

**This project is a Full-Stack Application** containing:
- **Node.js/Express Server** (`server.js`)
- **MySQL Database**
- **Smtp Email Logic**

These backend features **will not work** on GitHub Pages. If you upload this to GitHub Pages, users will see the frontend, but they won't be able to:
- Log in
- Save Inventory
- Send Emails

## ✅ Recommended Hosting Solution
To host this application for free, you should use a platform that supports Node.js.

### Option A: Render.com (Recommended)
1.  **Push** this code to GitHub (Instructions below).
2.  Go to **[Dashboard.render.com](https://dashboard.render.com/)**.
3.  Click **New +** -> **Web Service**.
4.  Connect your GitHub Repository.
5.  Set the **Build Command**: `npm install`
6.  Set the **Start Command**: `node server/server.js`
7.  Add your **Environment Variables** (Copy from your `.env` file):
    - `EMAIL_USER`
    - `EMAIL_PASS`
    - `JWT_SECRET`
    - `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME` (You will need a cloud database for this, typically provided by Render or Railway).

## 🚀 How to Push to GitHub
I have already initialized the Git repository for you. You just need to connect it to GitHub.

Run these commands in your terminal:

```bash
# 1. Link your local folder to your GitHub repository
# Replace URL with your actual repository link
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 2. Rename the branch to main (standard practice)
git branch -M main

# 3. Push the code
git push -u origin main
```
