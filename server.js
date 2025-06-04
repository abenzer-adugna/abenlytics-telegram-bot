require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const basicAuth = require('express-basic-auth');

const app = express();

// Debug environment variables
console.log('======== ENVIRONMENT VARIABLES ========');
console.log('TELEGRAM_TOKEN:', process.env.TELEGRAM_TOKEN ? '*** set ***' : 'MISSING');
console.log('WEBAPP_URL:', process.env.WEBAPP_URL || 'MISSING');
console.log('ADMIN_CHAT_ID:', process.env.ADMIN_CHAT_ID || 'MISSING');
console.log('ADMIN_USER:', process.env.ADMIN_USER || 'admin (default)');
console.log('ADMIN_PASS:', process.env.ADMIN_PASS ? '*** set ***' : 'admin123 (default)');
console.log('=======================================');

// Basic app configuration
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// =================================================================
// CRITICAL DEBUG ENDPOINTS
// =================================================================

// 1. File system check
app.get('/debug/fs', (req, res) => {
  try {
    const publicFiles = fs.readdirSync(path.join(__dirname, 'public'));
    res.json({
      status: 'success',
      publicDir: publicFiles,
      adminExists: publicFiles.includes('admin.html')
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Could not read public directory',
      error: error.message
    });
  }
});

// 2. Route test
app.get('/debug/routes', (req, res) => {
  res.json({
    routes: [
      { method: 'GET', path: '/' },
      { method: 'GET', path: '/admin' },
      { method: 'GET', path: '/debug/fs' },
      { method: 'GET', path: '/debug/routes' },
      { method: 'POST', path: '/api/service' }
    ]
  });
});

// 3. Admin panel direct access (without auth for testing)
app.get('/admin-test', (req, res) => {
  const adminPath = path.join(__dirname, 'public', 'admin.html');
  
  if (fs.existsSync(adminPath)) {
    res.sendFile(adminPath);
  } else {
    res.status(404).send(`
      <h1>Admin file not found</h1>
      <p>Path: ${adminPath}</p>
      <p>Current directory: ${__dirname}</p>
    `);
  }
});

// =================================================================
// ADMIN PANEL ROUTES
// =================================================================

// Basic Auth middleware
const authMiddleware = basicAuth({
  users: { 
    [process.env.ADMIN_USER || 'admin']: process.env.ADMIN_PASS || 'admin123' 
  },
  challenge: true,
  realm: 'Admin Access'
});

// Admin panel route
app.get('/admin', authMiddleware, (req, res) => {
  const adminPath = path.join(__dirname, 'public', 'admin.html');
  
  console.log(`Attempting to serve admin panel from: ${adminPath}`);
  
  if (fs.existsSync(adminPath)) {
    res.sendFile(adminPath);
  } else {
    console.error('Admin file not found:', adminPath);
    res.status(404).send('Admin panel not found on server');
  }
});

// =================================================================
// EXISTING ROUTES (SIMPLIFIED)
// =================================================================

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ Server running on port ${PORT}`);
  console.log(`🌐 Web App: ${process.env.WEBAPP_URL || 'http://localhost:' + PORT}`);
  console.log(`🔐 Admin Panel: ${process.env.WEBAPP_URL || 'http://localhost:' + PORT}/admin`);
  console.log(`👤 Admin Credentials: ${process.env.ADMIN_USER || 'admin'} / ${process.env.ADMIN_PASS ? '***' : 'admin123'}\n`);
});
