const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const multer = require('multer');
const rateLimit = require('express-rate-limit');

// Initialize app
const app = express();

// Get environment variables
const token = process.env.TELEGRAM_TOKEN;
const webAppUrl = process.env.WEBAPP_URL;
const adminId = process.env.ADMIN_CHAT_ID;
const groupLink = process.env.GROUP_INVITE_LINK;

// Validate environment variables
if (!token || !webAppUrl || !adminId || !groupLink) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: false });

// Helper functions
function safeReadJSON(filePath, defaultValue = []) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

function saveActiveChats(chats) {
  fs.writeFileSync('data/active_chats.json', JSON.stringify(chats, null, 2));
}

function getActiveChats() {
  return safeReadJSON('data/active_chats.json', {});
}

function addActiveChat(userId, chatId) {
  const chats = getActiveChats();
  chats[userId] = chatId;
  saveActiveChats(chats);
}

function removeInactiveChat(userId) {
  const chats = getActiveChats();
  delete chats[userId];
  saveActiveChats(chats);
}

async function safeSendMessage(userId, message) {
  const chats = getActiveChats();
  const chatId = chats[userId];
  
  if (!chatId) {
    console.warn(`No active chat found for user: ${userId}`);
    return false;
  }

  try {
    await bot.getChat(chatId);
    await bot.sendMessage(chatId, message);
    return true;
  } catch (error) {
    if (error.response?.statusCode === 400) {
      removeInactiveChat(userId);
    }
    console.error('Error sending message:', error.message);
    return false;
  }
}

// Create storage directories
const storageDirs = [
  path.join(__dirname, 'data'),
  path.join(__dirname, 'data/books'),
  path.join(__dirname, 'data/newsletters'),
  path.join(__dirname, 'data/roadmaps'),
  path.join(__dirname, 'data/prospectus')
];

storageDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Initialize data files
function initDataFiles() {
  const files = {
    'active_chats.json': {},
    'one_on_one.json': [],
    'books.json': [
      {
        id: 1,
        title: "The Intelligent Investor",
        author: "Benjamin Graham",
        year: 1949,
        description: "The definitive book on value investing",
        file: "the_intelligent_investor.pdf"
      },
      {
        id: 2,
        title: "A Random Walk Down Wall Street",
        author: "Burton Malkiel",
        year: 1973,
        description: "Classic text on market efficiency",
        file: "random_walk.pdf"
      }
    ],
    'reviews.json': [
      {
        id: 1,
        bookId: 1,
        title: "The Intelligent Investor Review",
        rating: 5,
        summary: "A timeless classic that every investor should read",
        keyInsights: ["Margin of safety", "Mr. Market concept"]
      },
      {
        id: 2,
        bookId: 2,
        title: "Random Walk Review",
        rating: 4,
        summary: "Essential reading on market efficiency",
        keyInsights: ["Efficient market hypothesis", "Index fund benefits"]
      }
    ],
    'group_access.json': [],
    'prospectus.json': [],
    'newsletter.json': [],
    'newsletters.json': [
      {
        id: 1,
        title: "Market Trends Q1 2025",
        date: "2025-03-15",
        description: "Analysis of emerging market opportunities",
        file: "newsletter_q1_2025.pdf"
      }
    ],
    'roadmaps.json': [
      {
        id: 1,
        title: "Long-Term Wealth Building",
        type: "long-term",
        description: "10-year investment strategy",
        steps: ["Asset allocation", "Dollar-cost averaging"],
        file: "long_term_roadmap.pdf"
      }
    ]
  };

  Object.entries(files).forEach(([filename, data]) => {
    const filePath = path.join(__dirname, 'data', filename);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }
  });
}

initDataFiles();

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/data', express.static(path.join(__dirname, 'data')));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use(apiLimiter);

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// Webhook setup
const webhookPath = `/bot${token}`;
bot.setWebHook(`${webAppUrl}${webhookPath}`)
  .then(() => console.log(`✅ Webhook set to: ${webAppUrl}${webhookPath}`));

// Routes
app.post(webhookPath, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// File download endpoints
app.get('/api/books/download/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'books', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ status: 'error', message: 'File not found' });
  }
});

// API endpoints
app.get('/api/books', (req, res) => {
  try {
    const books = safeReadJSON('data/books.json', []);
    res.json({ status: 'success', books });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Could not load books' });
  }
});

app.get('/api/reviews', (req, res) => {
  try {
    const reviews = safeReadJSON('data/reviews.json', []);
    res.json({ status: 'success', reviews });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Could not load reviews' });
  }
});

// Service endpoints
app.post('/api/service/newsletter', async (req, res) => {
  const { userData } = req.body;
  
  if (!userData?.id) {
    return res.status(400).json({ status: 'error', message: 'Invalid request' });
  }

  try {
    // Notify admin
    await bot.sendMessage(
      adminId,
      `📬 New Newsletter Subscriber:\n\n` +
      `👤 User: ${userData.name || 'N/A'}\n` +
      `🆔 ID: ${userData.id}\n` +
      `⏰ At: ${new Date().toLocaleString()}`
    );
    
    // Confirm to user
    const messageSent = await safeSendMessage(
      userData.id,
      "📬 You're subscribed to Abenlytics Newsletter!\n" +
      "Expect our first edition soon with exclusive market insights."
    );
    
    // Store subscription
    const subscriptions = safeReadJSON('data/newsletter.json', []);
    fs.writeFileSync('data/newsletter.json', JSON.stringify([
      ...subscriptions,
      {
        id: Date.now(),
        userId: userData.id,
        name: userData.name,
        timestamp: new Date().toISOString(),
        messageSent
      }
    ], null, 2));
    
    res.json({ status: 'success', message: 'Subscription successful' });
  } catch (err) {
    console.error('Newsletter error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// 1-on-1 Consultation
app.post('/api/service/one_on_one', async (req, res) => {
  const { userData, telegramUsername, problem } = req.body;
  
  if (!userData || !userData.id || !telegramUsername || !problem) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'All fields are required' 
    });
  }

  try {
    // Notify admin
    await bot.sendMessage(
      adminId,
      `📞 New 1-on-1 Request:\n\n` +
      `👤 User: ${userData.name || 'N/A'}\n` +
      `🆔 ID: ${userData.id}\n` +
      `📱 Telegram: ${telegramUsername}\n\n` +
      `❓ Problem:\n${problem}\n\n` +
      `⏰ Requested at: ${new Date().toLocaleString()}`
    );
    
    // Confirm to user
    const messageSent = await safeSendMessage(
      userData.id,
      "✅ We've received your consultation request!\n\n" +
      "I'll review your inquiry and get back to you when I'm online. " +
      "Typically responses take 24-48 hours during business days."
    );
    
    // Store request
    const requests = safeReadJSON('data/one_on_one.json', []);
    fs.writeFileSync('data/one_on_one.json', JSON.stringify([
      ...requests,
      {
        id: Date.now(),
        userId: userData.id,
        name: userData.name,
        telegramUsername,
        problem,
        timestamp: new Date().toISOString(),
        messageSent
      }
    ], null, 2));
    
    res.json({ 
      status: 'success',
      message: messageSent 
        ? 'Confirmation sent' 
        : 'Request received! Please start a chat with the bot to get confirmation'
    });
  } catch (err) {
    console.error('1-on-1 Error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// Prospectus Review
const prospectusStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'data/prospectus/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const prospectusUpload = multer({ storage: prospectusStorage });

app.post('/api/service/prospectus', prospectusUpload.single('prospectus'), async (req, res) => {
  const userData = JSON.parse(req.body.userData);
  const file = req.file;
  
  if (!file || !userData || !userData.id) {
    return res.status(400).json({ status: 'error', message: 'Invalid request' });
  }

  try {
    // Notify admin
    await bot.sendMessage(
      adminId,
      `🧾 New Prospectus Submission:\n\n` +
      `👤 User: ${userData.name || 'N/A'}\n` +
      `🆔 ID: ${userData.id}\n` +
      `📄 File: ${file.filename}`
    );
    
    // Confirm to user
    const messageSent = await safeSendMessage(
      userData.id,
      "✅ We've received your prospectus! We'll review it within 48 hours."
    );
    
    // Store submission
    const submissions = safeReadJSON('data/prospectus.json', []);
    fs.writeFileSync('data/prospectus.json', JSON.stringify([
      ...submissions,
      {
        id: Date.now(),
        userId: userData.id,
        name: userData.name,
        filename: file.filename,
        timestamp: new Date().toISOString(),
        messageSent
      }
    ], null, 2));
    
    res.json({ 
      status: 'success',
      message: messageSent 
        ? 'Confirmation sent' 
        : 'Submission received! Please start a chat with the bot to get confirmation'
    });
  } catch (err) {
    console.error('Prospectus Error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// Group Access
app.post('/api/service/group_access', async (req, res) => {
  const { userData } = req.body;
  
  if (!userData || !userData.id) {
    return res.status(400).json({ status: 'error', message: 'Invalid request' });
  }

  try {
    // Send group link
    const messageSent = await safeSendMessage(
      userData.id,
      `👥 Join our community: ${groupLink}`
    );
    
    // Store access
    const accesses = safeReadJSON('data/group_access.json', []);
    fs.writeFileSync('data/group_access.json', JSON.stringify([
      ...accesses,
      {
        id: Date.now(),
        userId: userData.id,
        name: userData.name,
        timestamp: new Date().toISOString(),
        messageSent
      }
    ], null, 2));
    
    res.json({ 
      status: 'success', 
      link: groupLink,
      message: messageSent 
        ? 'Invite sent to Telegram' 
        : 'Group link available below - please start a chat with the bot to receive future invites'
    });
  } catch (err) {
    console.error('Group Access Error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// Roadmaps
app.get('/api/roadmaps', (req, res) => {
  try {
    const roadmaps = safeReadJSON('data/roadmaps.json', []);
    res.json({ status: 'success', roadmaps });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Could not load roadmaps' });
  }
});

// Bot commands
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  addActiveChat(msg.from.id, chatId);
  bot.sendMessage(chatId, '👋 Welcome to Abenlytics Club!', {
    reply_markup: {
      inline_keyboard: [[{
        text: "🚀 Open Web App",
        web_app: { url: webAppUrl }
      }]]
    }
  });
});

// Store active chats
bot.on('message', (msg) => {
  if (msg.chat && msg.from) {
    addActiveChat(msg.from.id, msg.chat.id);
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

module.exports = { initDataFiles };
