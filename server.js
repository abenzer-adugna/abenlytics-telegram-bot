import dotenv from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';
import basicAuth from 'express-basic-auth';
import multer from 'multer';
import { fileURLToPath } from 'url';

// Configure environment variables
dotenv.config();

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');
const uploadDir = path.join(__dirname, 'uploads');

// Create directories if they don't exist
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const app = express();

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
console.log('Upload directory:', uploadDir);
console.log('=================================');

console.log('===== PUBLIC DIRECTORY CONTENTS =====');
try {
  if (fs.existsSync(publicDir)) {
    const files = fs.readdirSync(publicDir);
    console.log(files.length > 0 ? files.join(', ') : 'Directory is empty');
  } else {
    console.log('Public directory does not exist');
  }
} catch (err) {
  console.error('Error reading public directory:', err);
}
console.log('=====================================');

// Middleware
app.use(bodyParser.json());
app.use(express.static(publicDir));

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

// Debug endpoint - shows server information
app.get('/debug', (req, res) => {
  try {
    const debugInfo = {
      status: 'online',
      time: new Date().toISOString(),
      paths: {
        root: __dirname,
        public: publicDir,
        uploads: uploadDir
      },
      files: {
        publicDir: fs.existsSync(publicDir) ? fs.readdirSync(publicDir) : [],
        serverFile: path.basename(__filename)
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: process.env.PORT || 3000
      }
    };
    
    res.json(debugInfo);
  } catch (error) {
    res.status(500).json({ error: 'Debug error', details: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Admin panel route - creates file if missing
app.get('/admin', authMiddleware, (req, res) => {
  try {
    const adminPath = path.join(publicDir, 'admin.html');
    
    // Create admin.html if it doesn't exist
    if (!fs.existsSync(adminPath)) {
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>Admin Panel | Abenlytics</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background: #f0f2f5;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #1a3a5f;
      text-align: center;
    }
    .status {
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
      text-align: center;
      background: #d4edda;
      color: #155724;
    }
    .debug-info {
      background: #e9ecef;
      padding: 15px;
      border-radius: 5px;
      margin-top: 20px;
      font-family: monospace;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Abenlytics Admin Panel</h1>
    <div class="status">✅ Admin panel is working!</div>
    
    <div class="debug-info" id="debugInfo">
      Loading debug information...
    </div>
  </div>

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      fetch('/debug')
        .then(response => response.json())
        .then(data => {
          document.getElementById('debugInfo').textContent = 
            JSON.stringify(data, null, 2);
        })
        .catch(error => {
          document.getElementById('debugInfo').textContent = 
            'Error loading debug info: ' + error.message;
        });
    });
  </script>
</body>
</html>`;
      
      fs.writeFileSync(adminPath, htmlContent);
      console.log('Created admin.html file');
    }
    
    res.sendFile(adminPath);
  } catch (error) {
    console.error('Admin panel error:', error);
    res.status(500).send(`
      <h1>Admin Panel Error</h1>
      <p>${error.message}</p>
      <p>Path: ${path.join(publicDir, 'admin.html')}</p>
      <p><a href="/debug">View debug information</a></p>
    `);
  }
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
  console.log(`❤️ Health Check: ${process.env.WEBAPP_URL || 'http://localhost:' + PORT}/health`);
});
