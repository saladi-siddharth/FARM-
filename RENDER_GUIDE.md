# 🚀 How to Host on Render.com

Since your app uses a **Node.js Server** and **MySQL**, Render is a great choice. Follow these exact steps.

## Step 1: Push Code to GitHub
You must upload your code to GitHub first.
1.  Open your terminal/command prompt.
2.  Run:
    ```bash
    git push -u origin main
    ```
3.  Sign in to GitHub in the browser window that pops up.

## Step 2: Get a Remote Database (Crucial!)
Your app currently connects to `localhost` (your laptop). Render cannot access your laptop. You need a **Cloud MySQL Database**.
1.  Go to **[Aiven.io](https://aiven.io/)** or **[TiDB Cloud](https://tidbcloud.com/)** (Both have free tiers).
2.  Create a **MySQL** database.
3.  They will give you: `Host`, `User`, `Password`, `Port`, and `Database Name`.
4.  Copy these details.

## Step 3: Create Web Service on Render
1.  Go to **[dashboard.render.com](https://dashboard.render.com/)**.
2.  Click **New +** -> **Web Service**.
3.  Connect your GitHub repository.
4.  **Settings**:
    - **Name**: `farming-app` (or anything)
    - **Region**: Closest to you (e.g., Singapore/India if available)
    - **Branch**: `main`
    - **Runtime**: `Node`
    - **Build Command**: `npm install`
    - **Start Command**: `npm start`
    - **Instance Type**: Free

5.  **Environment Variables** (Scroll down):
    You MUST add these, or the app will fail. Copy values from your cloud database (Step 2) and your current `.env`.
    
    | Key | Value |
    |-----|-------|
    | `PORT` | `3000` |
    | `JWT_SECRET` | `your_super_secret_key_123` |
    | `EMAIL_USER` | `mahisiddharth721@gmail.com` |
    | `EMAIL_PASS` | `mqoqiqzpcfcqvnzp` |
    | `DB_HOST` | (Paste Host from Step 2) |
    | `DB_USER` | (Paste User from Step 2) |
    | `DB_PASS` | (Paste Password from Step 2) |
    | `DB_NAME` | `farming` (or whatever you named it in Step 2) |

6.  Click **Create Web Service**.

## Step 4: Database Setup
Render won't automatically create your tables. You need to run your SQL scripts on the **Cloud Database** you created in Step 2.
- Use a tool like **MySQL Workbench** or **DBeaver** on your laptop.
- Connect to the **Cloud Database** using the credentials.
- Run your SQL creation scripts (to create `users`, `inventory`, `tasks`, `expenses` tables).

## Done!
Render will give you a URL (e.g., `https://farming-app.onrender.com`). Use that link to access your live website!
