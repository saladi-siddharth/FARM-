# 🛑 CRITICAL STEP: Fix Database Connection

Your Render deployment is "Live" but **Database Connection Failed** because it is looking for a database on `localhost` (which matches your laptop settings, but doesn't exist on the cloud).

You need a **Cloud MySQL Database**.

## Step 1: Create a Free Cloud Database (Aiven.io)
1.  Go to **[Aiven.io](https://aiven.io/)** and Sign Up (Free).
2.  Click **Create Service**.
3.  Select **MySQL**.
4.  Choose the **Free Plan** (usually under "Hobbyist" or "Free").
5.  Select a region (e.g., Singapore or nearby).
6.  Click **Create Service**.
7.  Wait for it to start (the circles will turn green).

## Step 2: Get Credentials
Once the database is running in Aiven, find the **Connection Information**:
- **Host**: (e.g., `mysql-1a2b3c-project.aivencloud.com`)
- **Port**: (e.g., `25000`)
- **User**: `avnadmin`
- **Password**: (Hidden, click to reveal)
- **Database Name**: `defaultdb` (or create a new one called `farming`)

## Step 3: Configure Render
1.  Go to your **[Render Dashboard](https://dashboard.render.com/)**.
2.  Select your `farming-app` service.
3.  Click **Environment** (left sidebar).
4.  Add/Update these variables:
    *   `DB_HOST`: (Paste Host from Aiven)
    *   `DB_PORT`: (Paste Port from Aiven) <--- Important!
    *   `DB_USER`: (Paste User from Aiven)
    *   `DB_PASS`: (Paste Password from Aiven)
    *   `DB_NAME`: `defaultdb` (or whatever it is in Aiven)
    *   `EMAIL_USER`: `mahisiddharth721@gmail.com`
    *   `EMAIL_PASS`: `mqoqiqzpcfcqvnzp`
    *   `JWT_SECRET`: `any_secret_code`

## Step 4: Initialize the Database (Run SQL)
The new cloud database is **EMPTY**. You must create the tables.
1.  Download a tool like **[DBeaver](https://dbeaver.io/)** or **MySQL Workbench**.
2.  Connect to your **Aiven Database** using the credentials from Step 2.
3.  Open the file `database_schema.sql` (I just created this in your project folder).
4.  Copy the SQL code and **Run** it in DBeaver/Workbench.
    *   This will create the `users`, `inventory`, `tasks`, and `expenses` tables.

## Step 5: Redeploy
1.  Go back to Render.
2.  Click **Manual Deploy** -> **Deploy latest commit**.
3.  Check the logs. It should say:
    `✅ Connected to MySQL`
