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
const uploadDir = path.join(__dirname, 'uploads');

// Create directories if they don't exist
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
console.log('Upload directory:', uploadDir);
console.log('=================================');

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

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

// Debug endpoint
app.get('/debug', (req, res) => {
  res.json({
    status: 'online',
    time: new Date().toISOString(),
    paths: {
      root: __dirname,
      uploads: uploadDir
    }
  });
});

// Built-in Admin Panel
app.get('/admin', authMiddleware, (req, res) => {
  const adminHtml = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Admin Panel | Abenlytics</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      <style>
          * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }
          
          body {
              background: linear-gradient(135deg, #0c162d, #1a2238);
              color: #e2e8f0;
              min-height: 100vh;
              padding: 20px;
          }
          
          .admin-container {
              max-width: 1200px;
              margin: 0 auto;
          }
          
          header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 20px 0;
              border-bottom: 1px solid rgba(255,255,255,0.1);
              margin-bottom: 30px;
          }
          
          .logo {
              display: flex;
              align-items: center;
              gap: 15px;
          }
          
          .logo-icon {
              width: 50px;
              height: 50px;
              background: linear-gradient(135deg, #0e9f6e, #1a3a5f);
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 24px;
          }
          
          .logo-text {
              font-size: 28px;
              font-weight: 700;
              background: linear-gradient(to right, #0e9f6e, #4fd1c5);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
          }
          
          .panel {
              background: rgba(26, 58, 95, 0.7);
              backdrop-filter: blur(10px);
              border-radius: 15px;
              padding: 25px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.3);
              border: 1px solid rgba(46, 91, 140, 0.5);
              margin-bottom: 30px;
          }
          
          .panel-title {
              font-size: 22px;
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 1px solid rgba(255,255,255,0.1);
              display: flex;
              align-items: center;
              gap: 10px;
          }
          
          .form-group {
              margin-bottom: 20px;
          }
          
          label {
              display: block;
              margin-bottom: 8px;
              font-weight: 600;
          }
          
          input, select, textarea {
              width: 100%;
              padding: 14px;
              border-radius: 8px;
              border: 1px solid rgba(255,255,255,0.1);
              background: rgba(15, 30, 50, 0.5);
              color: white;
              font-size: 16px;
          }
          
          .btn {
              padding: 15px 25px;
              background: linear-gradient(135deg, #0e9f6e, #0b8457);
              color: white;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 600;
              font-size: 16px;
              transition: all 0.3s ease;
          }
          
          .btn:hover {
              transform: translateY(-3px);
              box-shadow: 0 5px 15px rgba(14, 159, 110, 0.4);
          }
          
          .notification {
              position: fixed;
              top: 20px;
              right: 20px;
              padding: 15px 25px;
              border-radius: 8px;
              background: #0e9f6e;
              color: white;
              font-weight: 600;
              box-shadow: 0 5px 15px rgba(0,0,0,0.2);
              transform: translateX(120%);
              transition: transform 0.3s ease;
              z-index: 1000;
          }
          
          .notification.show {
              transform: translateX(0);
          }
          
          footer {
              text-align: center;
              padding: 30px 0;
              margin-top: 50px;
              color: #a0aec0;
              border-top: 1px solid rgba(255,255,255,0.1);
          }
      </style>
  </head>
  <body>
      <div class="admin-container">
          <header>
              <div class="logo">
                  <div class="logo-icon">
                      <i class="fas fa-chart-line"></i>
                  </div>
                  <div class="logo-text">Abenlytics Admin</div>
              </div>
              <div class="admin-info">
                  <div class="admin-name">Administrator</div>
                  <div class="admin-email">admin@abenlytics.com</div>
              </div>
          </header>
          
          <div class="panel">
              <h2 class="panel-title"><i class="fas fa-file-upload"></i> File Upload</h2>
              
              <div class="form-group">
                  <label for="fileInput">Select File</label>
                  <input type="file" id="fileInput">
              </div>
              
              <div class="form-group">
                  <label for="fileName">File Title</label>
                  <input type="text" id="fileName" placeholder="e.g., Investing Guide">
              </div>
              
              <div class="form-group">
                  <label for="fileDescription">Description</label>
                  <textarea id="fileDescription" rows="3" placeholder="Brief description of the file"></textarea>
              </div>
              
              <button class="btn" id="uploadBtn">
                  <i class="fas fa-upload"></i> Upload File
              </button>
          </div>
          
          <div class="panel">
              <h2 class="panel-title"><i class="fas fa-newspaper"></i> Send Message to Users</h2>
              
              <div class="form-group">
                  <label for="messageSubject">Subject</label>
                  <input type="text" id="messageSubject" placeholder="e.g., Weekly Market Insights">
              </div>
              
              <div class="form-group">
                  <label for="messageContent">Message Content</label>
                  <textarea id="messageContent" rows="5" placeholder="Write your message here..."></textarea>
              </div>
              
              <button class="btn" id="sendBtn">
                  <i class="fas fa-paper-plane"></i> Send Message
              </button>
          </div>
          
          <div id="notification" class="notification">
              <i class="fas fa-check-circle"></i> <span id="notificationText">Action completed successfully!</span>
          </div>
          
          <footer>
              <p>&copy; 2025 Abenlytics Club - Admin Panel</p>
              <p>Secure access restricted to authorized personnel only</p>
          </footer>
      </div>

      <script>
          // DOM Elements
          const uploadBtn = document.getElementById('uploadBtn');
          const sendBtn = document.getElementById('sendBtn');
          const notification = document.getElementById('notification');
          const notificationText = document.getElementById('notificationText');
          
          // Show notification
          function showNotification(message, isError = false) {
              notificationText.textContent = message;
              notification.style.background = isError ? '#e53e3e' : '#0e9f6e';
              notification.classList.add('show');
              
              setTimeout(() => {
                  notification.classList.remove('show');
              }, 3000);
          }
          
          // Upload button handler
          uploadBtn.addEventListener('click', async () => {
              const fileInput = document.getElementById('fileInput');
              const fileName = document.getElementById('fileName').value;
              
              if (!fileInput.files.length) {
                  showNotification('Please select a file', true);
                  return;
              }
              
              if (!fileName) {
                  showNotification('Please enter a file title', true);
                  return;
              }
              
              const formData = new FormData();
              formData.append('file', fileInput.files[0]);
              formData.append('title', fileName);
              formData.append('description', document.getElementById('fileDescription').value);
              
              try {
                  showNotification('Uploading file...');
                  
                  const response = await fetch('/admin/upload', {
                      method: 'POST',
                      body: formData
                  });
                  
                  const result = await response.json();
                  
                  if (response.ok) {
                      showNotification(result.message || 'File uploaded successfully!');
                      // Reset form
                      fileInput.value = '';
                      document.getElementById('fileName').value = '';
                      document.getElementById('fileDescription').value = '';
                  } else {
                      showNotification(result.error || 'Upload failed', true);
                  }
              } catch (error) {
                  showNotification('Upload error: ' + error.message, true);
              }
          });
          
          // Send message button handler
          sendBtn.addEventListener('click', async () => {
              const subject = document.getElementById('messageSubject').value;
              const content = document.getElementById('messageContent').value;
              
              if (!subject || !content) {
                  showNotification('Please fill in all fields', true);
                  return;
              }
              
              try {
                  showNotification('Sending message...');
                  
                  const response = await fetch('/admin/newsletter', {
                      method: 'POST',
                      headers: {'Content-Type': 'application/json'},
                      body: JSON.stringify({ message: content })
                  });
                  
                  const result = await response.json();
                  
                  if (response.ok) {
                      showNotification(result.message || 'Message sent successfully!');
                      // Reset form
                      document.getElementById('messageSubject').value = '';
                      document.getElementById('messageContent').value = '';
                  } else {
                      showNotification(result.error || 'Sending failed', true);
                  }
              } catch (error) {
                  showNotification('Sending error: ' + error.message, true);
              }
          });
          
          // Initial notification
          setTimeout(() => {
              showNotification('Admin panel loaded successfully');
          }, 1000);
      </script>
  </body>
  </html>
  `;
  
  res.send(adminHtml);
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
});
