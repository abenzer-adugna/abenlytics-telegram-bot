require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const basicAuth = require('express-basic-auth');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Debug log
console.log('Starting Abenlytics server...');
console.log('Environment variables:');
console.log(`- PORT: ${process.env.PORT || 3000}`);
console.log(`- WEBAPP_URL: ${process.env.WEBAPP_URL || 'Not set'}`);
console.log(`- ADMIN_USER: ${process.env.ADMIN_USER || 'admin (default)'}`);
console.log(`- ADMIN_PASS: ${process.env.ADMIN_PASS ? '*****' : 'admin123 (default)'}`);

// ===========================================
// DEBUG ENDPOINTS
// ===========================================
app.get('/debug', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      WEBAPP_URL: process.env.WEBAPP_URL,
      ADMIN_USER: process.env.ADMIN_USER,
      ADMIN_PASS: process.env.ADMIN_PASS ? '*****' : 'not set'
    },
    paths: {
      publicDir: path.join(__dirname, 'public'),
      adminHtml: path.join(__dirname, 'public', 'admin.html')
    },
    files: {
      adminExists: fs.existsSync(path.join(__dirname, 'public', 'admin.html')),
      serverFile: __filename
    }
  });
});

app.get('/debug/auth', basicAuth({
  users: { 
    [process.env.ADMIN_USER || 'admin']: process.env.ADMIN_PASS || 'admin123' 
  },
  challenge: true,
  realm: 'Admin Access'
}), (req, res) => {
  res.json({
    authenticated: true,
    username: req.auth.user,
    timestamp: new Date()
  });
});

// ===========================================
// ADMIN PANEL
// ===========================================
app.get('/admin', basicAuth({
  users: { 
    [process.env.ADMIN_USER || 'admin']: process.env.ADMIN_PASS || 'admin123' 
  },
  challenge: true,
  realm: 'Admin Access'
}), (req, res) => {
  const adminPath = path.join(__dirname, 'public', 'admin.html');
  
  if (fs.existsSync(adminPath)) {
    res.sendFile(adminPath);
  } else {
    res.status(404).send(`
      <h1>Admin Panel Not Found</h1>
      <p>File path: ${adminPath}</p>
      <p>Create a file at <code>public/admin.html</code> to fix this issue.</p>
      <p><a href="/debug">View debug information</a></p>
    `);
  }
});

// ===========================================
// BASIC ROUTES
// ===========================================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/test', (req, res) => {
  res.send('Server is working!');
});

// ===========================================
// START SERVER
// ===========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ Server running on port ${PORT}`);
  console.log(`🔗 Test endpoint: ${process.env.WEBAPP_URL || 'http://localhost:' + PORT}/test`);
  console.log(`🔐 Admin panel: ${process.env.WEBAPP_URL || 'http://localhost:' + PORT}/admin`);
  console.log(`📊 Debug info: ${process.env.WEBAPP_URL || 'http://localhost:' + PORT}/debug`);
});
