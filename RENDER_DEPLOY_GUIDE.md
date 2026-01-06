# 🚀 Comprehensive Render Deployment Guide

Follow this guide to ensure your **Email**, **Database**, and **Real-Time Features** work perfectly on Render.

---

## ✅ Part 1: Database Setup (TiDB / MySQL)

Your app requires a MySQL-compatible database. Render does **NOT** provide a free MySQL database. You must use a free external provider like **TiDB Cloud** or **Aiven**.

### 1. Create a Free Database (Recommended: TiDB)
1.  Go to [TiDB Cloud](https://tidbcloud.com/) and sign up.
2.  Create a **Serverless Tier** cluster (Free forever).
3.  Once created, click **"Connect"**.
4.  Select "Node.js" or look for the connection parameters.
5.  **Copy** these 5 values:
    *   Host (e.g., `gateway01.us-west-2.prod.aws.tidbcloud.com`)
    *   Port (e.g., `4000`)
    *   User (e.g., `2SeE...prefix.root`)
    *   Password (The one you created)
    *   Database Name (e.g., `test` or `farming`)

### 2. Add Variables to Render
1.  Go to your **Render Dashboard** -> **Environment**.
2.  Add these keys:

| Key | Value |
| :--- | :--- |
| `DB_HOST` | *(Your TiDB Host)* |
| `DB_PORT` | `4000` (or 3306) |
| `DB_USER` | *(Your TiDB User)* |
| `DB_PASSWORD` | *(Your TiDB Password)* |
| `DB_NAME` | `farming` (or whatever you named it) |

---

## ✅ Part 2: Email Setup (Google SMTP)

If emails are failing, you need to provide your Google App Password.

1.  Go to `myaccount.google.com` -> Security.
2.  Enable **2-Step Verification**.
3.  Search for **"App Passwords"** and create one named "Farm App".
4.  **Copy** the 16-character code.

### Add to Render Environment:

| Key | Value |
| :--- | :--- |
| `EMAIL_USER` | `your-email@gmail.com` |
| `EMAIL_PASS` | `abcd efgh ijkl mnop` (Your 16-char App Password) |

---

## ✅ Part 3: Real-Time Chat & Node Version

Ensure Render uses a modern Node.js version.

1.  In Render -> **Environment**.
2.  Add/Check this variable:

| Key | Value |
| :--- | :--- |
| `NODE_VERSION` | `20.11.0` (or higher) |

---

## 🛠️ Debugging

After adding these variables:
1.  Go to the **Events** tab in Render.
2.  Click **"Manual Deploy"** -> **"Clear Build Cache & Deploy"**.
3.  Watch the **Logs**. You should see:

> ✅ Connected to MySQL ...
> ✅ SMTP Server Connection Established ...

If you see these green checks, your app is 100% online! 🚀
