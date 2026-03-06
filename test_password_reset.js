const axios = require('axios');

async function testPasswordReset() {
    const url = 'http://localhost:3000/api/auth';
    const email = "reset_test@example.com";
    const password = "oldpassword123";
    const newPassword = "newpassword456";

    try {
        console.log("--- 1. Signup ---");
        await axios.post(`${url}/signup`, {
            email, password, username: "reset_user"
        }).catch(() => { });

        console.log("--- 2. Request OTP ---");
        const forgotRes = await axios.post(`${url}/forgot-password`, { email });
        console.log("Forgot Password Response:", forgotRes.data);

        // Since we can't easily read the email, we'll check the DB directly for the OTP
        console.log("\n--- 3. Fetch OTP from DB (Simulating reading email) ---");
        const db = require('./server/config/db');
        const [users] = await db.execute('SELECT reset_token, reset_expires FROM users WHERE email = ?', [email]);
        const otp = users[0].reset_token;
        const expires = users[0].reset_expires;
        console.log("OTP from DB:", otp);
        console.log("Expires from DB:", expires);

        console.log("\n--- 4. Reset Password ---");
        const resetRes = await axios.post(`${url}/reset-password`, {
            email, otp, newPassword
        });
        console.log("Reset Response:", resetRes.data);

        console.log("\n--- 5. Verify Login with New Password ---");
        const loginRes = await axios.post(`${url}/signin`, {
            email, password: newPassword
        });
        console.log("Login with new password Success!");

    } catch (e) {
        console.log("Failed:", e.response ? e.response.status : "No Status");
        console.log("Error Data:", e.response ? e.response.data : e.message);
    } finally {
        process.exit(0);
    }
}

testPasswordReset();
