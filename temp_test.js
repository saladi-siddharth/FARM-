const http = require('http');

const options = {
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/auth/firebase-google',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

const req = http.request(options, res => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

    res.on('data', d => {
        process.stdout.write(d);
    });
});

req.on('error', error => {
    console.error(error);
});

req.write(JSON.stringify({ email: "test@test.com", uid: "12345" }));
req.end();
