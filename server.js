require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const basicAuth = require('express-basic-auth');
const multer = require('multer');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Debug environment variables
console.log('===== ENVIRONMENT VARIABLES =====');
console.log('WEBAPP_URL:', process.env.WEBAPP_URL || 'Not set');
console.log('ADMIN_USER:', process.env.ADMIN_USER || 'admin (default)');
console.log('ADMIN_PASS:', process.env.ADMIN_PASS ? '*****' : 'admin123 (default)');
console.log('=================================');

// Create uploads directory
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
  console.log('Created uploads directory:', uploadDir);
}

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Admin authentication middleware
const authMiddleware = basicAuth({
  users: { 
    [process.env.ADMIN_USER || 'admin']: process.env.ADMIN_PASS || 'admin123' 
  },
  challenge: true,
  realm: 'Admin Access'
});

// File upload endpoint
app.post('/admin/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  res.json({
    success: true,
    message: 'File uploaded successfully',
    filename: req.file.filename,
    filePath: `/downloads/${req.file.filename}`
  });
});

// File download endpoint
app.get('/downloads/:filename', (req, res) => {
  const file = path.join(uploadDir, req.params.filename);
  
  if (fs.existsSync(file)) {
    res.download(file);
  } else {
    res.status(404).send('File not found');
  }
});

// Newsletter sending endpoint
app.post('/admin/newsletter', authMiddleware, (req, res) => {
  const { message } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  
  // In a real implementation, you would send to users
  console.log('Newsletter message:', message);
  
  res.json({
    success: true,
    message: 'Newsletter sent to users'
  });
});

// Admin panel route
app.get('/admin', authMiddleware, (req, res) => {
  const adminPath = path.join(__dirname, 'public', 'admin.html');
  
  if (fs.existsSync(adminPath)) {
    res.sendFile(adminPath);
  } else {
    res.status(404).send(`
      <h1>Admin Panel Not Found</h1>
      <p>File path: ${adminPath}</p>
      <p>Create a file at public/admin.html to fix this issue.</p>
      <p>Current directory contents: ${fs.readdirSync(path.join(__dirname, 'public')).join(', ')}</p>
    `);
  }
});

// Debug endpoint
app.get('/debug', (req, res) => {
  const publicDir = path.join(__dirname, 'public');
  
  res.json({
    status: 'online',
    time: new Date().toISOString(),
    adminPanel: {
      path: path.join(publicDir, 'admin.html'),
      exists: fs.existsSync(path.join(publicDir, 'admin.html'))
    },
    publicDirFiles: fs.existsSync(publicDir) ? fs.readdirSync(publicDir) : []
  });
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ Server running on port ${PORT}`);
  console.log(`🔗 Main App: ${process.env.WEBAPP_URL || 'http://localhost:' + PORT}`);
  console.log(`🔐 Admin Panel: ${process.env.WEBAPP_URL || 'http://localhost:' + PORT}/admin`);
  console.log(`📊 Debug Info: ${process.env.WEBAPP_URL || 'http://localhost:' + PORT}/debug`);
});
