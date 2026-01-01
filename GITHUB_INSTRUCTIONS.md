# How to Deploy to GitHub

## 1. Push Code
I have prepared the repository. Run this command in your terminal to upload the files:

```bash
git push -u origin main
```
*You will be asked to sign in to GitHub in your browser.*

## 2. GitHub Pages (Read Carefully)
You asked to host this on **GitHub Pages**.
1.  Go to your Repository Settings -> Pages.
2.  In "Build and deployment", select Source: "Deploy from a branch".
3.  Select Branch: `main` and Folder: `/public` (if option exists) OR you must move your HTML files to the root folder.

**CRITICAL WARNING**:
GitHub Pages supports **ONLY** Static HTML.
Your project has a **Node.js Server (`server.js`)** and **MySQL Database**.
**THESE WILL NOT WORK ON GITHUB PAGES.**
- You will see the login page.
- But trying to "Log In" or "Sign Up" will fail.
- Emails will NOT be sent.

**To host the full working application, use one of these free services instead:**
- **Render.com** (Connect your GitHub repo, it detects Node.js automatically).
- **Vercel** (Requires some config for backend).
- **Railway.app**

## 3. Environment Variables
When you deploy to Render/Railway, you MUST manually add these variables in their dashboard:
- `EMAIL_USER`: mahisiddharth721@gmail.com
- `EMAIL_PASS`: (Your App Password)
- `JWT_SECRET`: ...
- `DB_HOST`, `DB_USER`... (You will need a cloud database).
