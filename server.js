require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const basicAuth = require('express-basic-auth');
const multer = require('multer');

const app = express();

// Get absolute paths
const __dirname = path.resolve();
const publicDir = path.join(__dirname, 'public');
const uploadDir = path.join(__dirname, 'uploads');

// Ensure directories exist
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Middleware
app.use(bodyParser.json());
app.use(express.static(publicDir));

// Debug environment variables and paths
console.log('===== ENVIRONMENT VARIABLES =====');
console.log('WEBAPP_URL:', process.env.WEBAPP_URL || 'Not set');
console.log('ADMIN_USER:', process.env.ADMIN_USER || 'admin (default)');
console.log('ADMIN_PASS:', process.env.ADMIN_PASS ? '*****' : 'admin123 (default)');
console.log('PORT:', process.env.PORT || 3000);
console.log('=================================');

console.log('===== PATHS =====');
console.log('Root directory:', __dirname);
console.log('Public directory:', publicDir);
console.log('Admin HTML path:', path.join(publicDir, 'admin.html'));
console.log('Upload directory:', uploadDir);
console.log('=================================');

// Configure Multer
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

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

// Newsletter endpoint
app.post('/admin/newsletter', authMiddleware, (req, res) => {
  const { message } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  
  res.json({
    success: true,
    message: 'Newsletter sent to users'
  });
});

// Admin panel route
app.get('/admin', authMiddleware, (req, res) => {
  const adminPath = path.join(publicDir, 'admin.html');
  
  if (fs.existsSync(adminPath)) {
    res.sendFile(adminPath);
  } else {
    // Create admin.html if it doesn't exist
    const htmlContent = `<!DOCTYPE html>
<html>
<head><title>Admin Panel</title></head>
<body>
  <h1>Automatically Created Admin Panel</h1>
  <p>This file was created automatically at: ${new Date()}</p>
  <p>Path: ${adminPath}</p>
</body>
</html>`;
    
    fs.writeFileSync(adminPath, htmlContent);
    res.sendFile(adminPath);
  }
});

// Debug endpoint
app.get('/debug', (req, res) => {
  res.json({
    status: 'online',
    time: new Date().toISOString(),
    paths: {
      root: __dirname,
      public: publicDir,
      admin: path.join(publicDir, 'admin.html'),
      uploads: uploadDir
    },
    files: {
      adminExists: fs.existsSync(path.join(publicDir, 'admin.html')),
      publicDirFiles: fs.readdirSync(publicDir)
    }
  });
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ Server running on port ${PORT}`);
  console.log(`🔗 Main App: ${process.env.WEBAPP_URL || 'http://localhost:' + PORT}`);
  console.log(`🔐 Admin Panel: ${process.env.WEBAPP_URL || 'http://localhost:' + PORT}/admin`);
  console.log(`📊 Debug Info: ${process.env.WEBAPP_URL || 'http://localhost:' + PORT}/debug`);
});
