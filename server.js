require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const multer = require('multer');
const rateLimit = require('express-rate-limit');

// Initialize app
const app = express();

// Environment variables
const token = process.env.TELEGRAM_TOKEN;
const webAppUrl = process.env.WEBAPP_URL;
const adminId = process.env.ADMIN_CHAT_ID;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'securepassword123';

// Validate environment variables
if (!token || !webAppUrl || !adminId) {
  console.error('❌ Missing required environment variables:');
  console.error(`- TELEGRAM_TOKEN: ${token ? '✅' : '❌'}`);
  console.error(`- WEBAPP_URL: ${webAppUrl ? '✅' : '❌'}`);
  console.error(`- ADMIN_CHAT_ID: ${adminId ? '✅' : '❌'}`);
  console.error('Please set these in your .env file or Render.com environment');
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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: 'Too many requests, please try again later.'
});

// Application middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create uploads directory if not exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ========================
// ADMIN FUNCTIONALITY
// ========================

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  // Basic auth: "Basic base64(username:password)"
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).set('WWW-Authenticate', 'Basic realm="Admin Access"').send('Unauthorized');
  }
  
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');
  
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    return next();
  }
  
  res.status(401).set('WWW-Authenticate', 'Basic realm="Admin Access"').send('Unauthorized');
};

// File upload endpoint
app.post('/admin/upload', apiLimiter, upload.single('file'), authenticateAdmin, (req, res) => {
  const { title, description, category, accessLevel } = req.body;
  const file = req.file;
  
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  // Create file metadata
  const fileData = {
    id: Date.now(),
    title: title || file.originalname,
    description: description || '',
    category: category || 'General',
    accessLevel: accessLevel || 'All Users',
    filename: file.originalname,
    path: file.path,
    size: file.size,
    uploadedAt: new Date(),
    downloadUrl: `/downloads/${file.filename}`
  };
  
  // Save file metadata
  const uploadsDb = path.join(__dirname, 'uploads.json');
  let files = [];
  
  try {
    if (fs.existsSync(uploadsDb)) {
      files = JSON.parse(fs.readFileSync(uploadsDb));
    }
    files.push(fileData);
    fs.writeFileSync(uploadsDb, JSON.stringify(files, null, 2));
  } catch (err) {
    console.error('Error saving file metadata:', err);
    return res.status(500).json({ error: 'Error saving file data' });
  }
  
  // Notify admin via Telegram
  bot.sendMessage(
    adminId, 
    `📁 New file uploaded!\n\n` +
    `Title: ${fileData.title}\n` +
    `Category: ${fileData.category}\n` +
    `Size: ${(fileData.size / 1024 / 1024).toFixed(2)}MB`
  ).catch(console.error);
  
  res.json({ 
    success: true, 
    message: 'File uploaded successfully',
    file: fileData
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

// Get uploaded files
app.get('/admin/files', apiLimiter, authenticateAdmin, (req, res) => {
  try {
    const uploadsDb = path.join(__dirname, 'uploads.json');
    if (fs.existsSync(uploadsDb)) {
      const files = JSON.parse(fs.readFileSync(uploadsDb));
      return res.json(files);
    }
    res.json([]);
  } catch (err) {
    console.error('Error reading files:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Newsletter sending endpoint
app.post('/admin/newsletter', apiLimiter, authenticateAdmin, (req, res) => {
  const { subject, content, recipientGroup } = req.body;
  
  if (!subject || !content) {
    return res.status(400).json({ error: 'Subject and content are required' });
  }
  
  // In a real implementation, you would:
  // 1. Get all users who should receive this newsletter
  // 2. Send via Telegram bot or email
  
  // For demo purposes, we'll just log and send to admin
  console.log(`Sending newsletter: ${subject}`);
  
  // Send notification to admin
  bot.sendMessage(
    adminId, 
    `📬 Newsletter sent!\n\n` +
    `Subject: ${subject}\n` +
    `Recipients: ${recipientGroup || 'All Users'}\n` +
    `Preview: ${content.substring(0, 100)}...`
  ).catch(console.error);
  
  res.json({ 
    success: true, 
    message: 'Newsletter sent successfully',
    stats: {
      recipients: 1842, // Example count
      sentAt: new Date()
    }
  });
});

// Serve admin panel
app.get('/admin', authenticateAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ========================
// EXISTING TELEGRAM FUNCTIONALITY
// ========================

// Webhook setup
bot.setWebHook(`${webAppUrl}/bot${token}`)
  .then(() => console.log('✅ Telegram webhook set'))
  .catch(console.error);

// Telegram webhook handler
app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint with validation
app.post('/api/service', apiLimiter, async (req, res) => {
  const { serviceType, userData } = req.body;

  // Input validation
  if (!serviceType || !userData || !userData.id) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Missing required parameters' 
    });
  }

  try {
    switch (serviceType) {
      case 'book_download':
        // Get the latest book file
        let downloadUrl = `${webAppUrl}/downloads/default-book.pdf`;
        try {
          const uploadsDb = path.join(__dirname, 'uploads.json');
          if (fs.existsSync(uploadsDb)) {
            const files = JSON.parse(fs.readFileSync(uploadsDb));
            const bookFile = files.reverse().find(f => f.category === 'Books');
            if (bookFile) {
              downloadUrl = `${webAppUrl}${bookFile.downloadUrl}`;
            }
          }
        } catch (err) {
          console.error('Error getting book file:', err);
        }
        
        await bot.sendMessage(
          userData.id, 
          `📚 Download your book here:\n${downloadUrl}`
        );
        break;

      case 'one_on_one':
        // Basic data sanitization
        const safeUserData = {
          name: (userData.name || '').substring(0, 100),
          email: (userData.email || '').substring(0, 100),
          id: userData.id
        };
        
        await bot.sendMessage(
          adminId, 
          `📞 New 1-on-1 request:\n\n${JSON.stringify(safeUserData, null, 2)}`
        );
        await bot.sendMessage(
          userData.id, 
          '✅ Got it! We\'ll reach out within 24 hrs.'
        );
        break;

      case 'newsletter':
        await bot.sendMessage(
          userData.id, 
          '📬 You\'re now subscribed to the Abenlytics Newsletter.'
        );
        break;

      default:
        return res.status(400).json({ 
          status: 'error', 
          message: 'Invalid service type' 
        });
    }

    res.json({ status: 'success' });

  } catch (err) {
    console.error('API Error:', err.message);
    res.status(500).json({ 
      status: 'error', 
      message: 'Internal server error' 
    });
  }
});

// Telegram command handlers
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '👋 Welcome to Abenlytics Club!', {
    reply_markup: {
      inline_keyboard: [[{
        text: "🚀 Open Web App",
        web_app: { url: webAppUrl }
      }]]
    }
  });
});

bot.onText(/\/services/, (msg) => {
  const services = `🛠️ Available Services:\n\n` +
                   `1. 📘 Download Investing Books\n` +
                   `2. 🧠 Read Book Reviews\n` +
                   `3. 🛣️ Follow Roadmaps\n` +
                   `4. 📩 Weekly Newsletter\n` +
                   `5. 👥 1-on-1 Consultations`;
  bot.sendMessage(msg.chat.id, services);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Web App URL: ${webAppUrl}`);
  console.log(`📩 Webhook URL: ${webAppUrl}/bot${token}`);
  console.log(`🔐 Admin Panel: ${webAppUrl}/admin`);
  console.log(`👤 Admin Credentials: ${ADMIN_USER} / ${ADMIN_PASS}`);
});
