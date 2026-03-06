const axios = require('axios');

async function testProtectedRoute() {
    const url = 'http://localhost:3000/api/auth';
    const protectedUrl = 'http://localhost:3000/api/dashboard/summary'; // Correct protected route

    console.log("--- 1. Login to get token ---");
    const testUser = {
        email: "test_login@example.com",
        password: "password123",
        username: "test_login"
    };

    try {
        // Signup if doesn't exist
        await axios.post(`${url}/signup`, testUser).catch(() => { });

        const loginRes = await axios.post(`${url}/signin`, {
            email: testUser.email,
            password: testUser.password
        });
        const token = loginRes.data.token;
        console.log("Login Success. Token acquired.");

        console.log("\n--- 2. Access protected route ---");
        const res = await axios.get(protectedUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log("Protected Route Response:", res.status, res.data);

    } catch (e) {
        console.log("Failed:", e.response ? e.response.status : "No Status");
        console.log("Error Data:", e.response ? e.response.data : e.message);
    }
}

testProtectedRoute();
