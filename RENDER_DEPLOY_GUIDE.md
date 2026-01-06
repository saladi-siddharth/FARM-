# 🚀 How to Fix Email on Render Deployment

If emails (SMTP) are not working when you deploy to Render, it is almost certainly because the **Environment Variables** are missing or incorrect on the Render Dashboard.

Follow these 2 simple steps to fix it.

---

## Step 1: Get a Google App Password (Required)
You CANNOT use your regular Gmail password. Google Blocks it for security.

1. Go to your **Google Account Settings**.
2. Search for **"App Passwords"** (If you don't see it, enable **2-Step Verification** first).
3. Create a new App Password:
   - **App Name:** `Farm App`
   - Click **Create**.
4. **COPY** the 16-character code (e.g., `abcd efgh ijkl mnop`). This is your password.

---

## Step 2: Add Variables to Render

1. Log in to your **Render Dashboard**.
2. Click on your **Web Service** (the backend API).
3. Click on the **"Environment"** tab on the left.
4. Add the following **Environment Variables**:

| Key | Value |
| :--- | :--- |
| `EMAIL_USER` | `your-email@gmail.com` (Your extensive real email) |
| `EMAIL_PASS` | `abcd efgh ijkl mnop` (The 16-char App Password from Step 1) |

5. Click **"Save Changes"**.

---

## Step 3: Verify

I have updated the server code to **automatically check the connection** when it starts.
1. Go to the **"Logs"** tab in Render.
2. Wait for the server to restart (or manually Deploy -> Restart Service).
3. Look for this message in the logs:

> ✅ **SMTP Server Connection Established (Ready to send emails)**

If you see this, your email system is 100% working! 
If you see "Command failed" or "Auth failed", check your password again.
