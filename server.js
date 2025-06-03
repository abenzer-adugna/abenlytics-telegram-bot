require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const basicAuth = require('express-basic-auth');

const app = express();

// Debugging environment variables
console.log('Environment Variables:');
console.log(`- TELEGRAM_TOKEN: ${process.env.TELEGRAM_TOKEN ? 'SET' : 'MISSING'}`);
console.log(`- WEBAPP_URL: ${process.env.WEBAPP_URL || 'MISSING'}`);
console.log(`- ADMIN_CHAT_ID: ${process.env.ADMIN_CHAT_ID || 'MISSING'}`);
console.log(`- ADMIN_USER: ${process.env.ADMIN_USER || 'admin (default)'}`);
console.log(`- ADMIN_PASS: ${process.env.ADMIN_PASS ? 'SET' : 'admin123 (default)'}`);

// Validate environment variables
const token = process.env.TELEGRAM_TOKEN;
const webAppUrl = process.env.WEBAPP_URL;
const adminId = process.env.ADMIN_CHAT_ID;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

if (!token || !webAppUrl || !adminId) {
  console.error('❌ Missing required environment variables!');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: false });

// Security middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests, please try again later.'
});

// Application middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create uploads directory
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
  console.log('Created uploads directory');
}

// Multer configuration
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// ========================
// ADMIN FUNCTIONALITY
// ========================

// Basic Auth middleware
const authMiddleware = basicAuth({
  users: { [ADMIN_USER]: ADMIN_PASS },
  challenge: true,
  realm: 'Admin Access'
});

// File upload endpoint
app.post('/admin/upload', apiLimiter, upload.single('file'), authMiddleware, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const fileData = {
      id: Date.now(),
      title: req.body.title || req.file.originalname,
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      uploadedAt: new Date(),
      downloadUrl: `/downloads/${req.file.filename}`
    };
    
    res.json({ 
      success: true, 
      message: 'File uploaded successfully',
      file: fileData
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'File upload failed' });
  }
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

// Serve admin panel
app.get('/admin', authMiddleware, (req, res) => {
  const adminPath = path.join(__dirname, 'public', 'admin.html');
  
  // Debug file existence
  fs.access(adminPath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error(`Admin file not found at: ${adminPath}`);
      return res.status(404).send('Admin panel not found');
    }
    res.sendFile(adminPath);
  });
});

// ========================
// TELEGRAM & APP FUNCTIONALITY
// ========================

// Webhook setup
bot.setWebHook(`${webAppUrl}/bot${token}`)
  .then(() => console.log('✅ Telegram webhook set'))
  .catch(err => console.error('Webhook error:', err));

// Telegram webhook handler
app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Debug endpoint
app.get('/debug', (req, res) => {
  res.json({
    status: 'online',
    time: new Date(),
    webAppUrl,
    adminPanel: `${webAppUrl}/admin`,
    uploadDirExists: fs.existsSync(uploadDir),
    publicDir: fs.readdirSync(path.join(__dirname, 'public'))
  });
});

// API endpoint
app.post('/api/service', apiLimiter, async (req, res) => {
  console.log('Service request:', req.body);
  
  try {
    const { serviceType, userData } = req.body;
    
    if (!serviceType || !userData?.id) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    
    switch (serviceType) {
      case 'book_download':
        await bot.sendMessage(userData.id, '📚 Download your book here: (URL)');
        break;
        
      case 'one_on_one':
        await bot.sendMessage(adminId, `📞 New 1-on-1 request from ${userData.id}`);
        await bot.sendMessage(userData.id, '✅ Got it! We\'ll reach out soon.');
        break;
        
      case 'newsletter':
        await bot.sendMessage(userData.id, '📬 You\'re subscribed!');
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid service' });
    }
    
    res.json({ status: 'success' });
  } catch (err) {
    console.error('Service error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ Server running on port ${PORT}`);
  console.log(`🌐 Web App: ${webAppUrl}`);
  console.log(`🔐 Admin Panel: ${webAppUrl}/admin`);
  console.log(`👤 Admin Credentials: ${ADMIN_USER} / ${ADMIN_PASS}`);
  console.log(`📩 Webhook: ${webAppUrl}/bot${token}\n`);
});
