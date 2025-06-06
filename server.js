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

const bot = new TelegramBot(token, { polling: true }); // Enable polling to receive messages

// Helper function to safely read JSON files
function safeReadJSON(filePath, defaultValue = []) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

// Helper to save active chats
function saveActiveChats(chats) {
  fs.writeFileSync('data/active_chats.json', JSON.stringify(chats, null, 2));
}

// Get active chats
function getActiveChats() {
  return safeReadJSON('data/active_chats.json', {});
}

// Add chat to active list
function addActiveChat(userId, chatId) {
  const chats = getActiveChats();
  chats[userId] = chatId;
  saveActiveChats(chats);
}

// Remove inactive chat
function removeInactiveChat(userId) {
  const chats = getActiveChats();
  delete chats[userId];
  saveActiveChats(chats);
}

// Helper function to safely send messages
async function safeSendMessage(userId, message) {
  const chats = getActiveChats();
  const chatId = chats[userId];
  
  if (!chatId) {
    console.warn(`No active chat found for user: ${userId}`);
    return false;
  }

  try {
    // First check if the chat exists
    try {
      await bot.getChat(chatId);
    } catch (error) {
      if (error.response?.statusCode === 400 && error.response.body?.description?.includes('chat not found')) {
        console.warn(`Chat not found for ID: ${chatId}. Removing from active chats.`);
        removeInactiveChat(userId);
        return false;
      }
      throw error; // Rethrow other errors
    }
    
    // Now send the message
    await bot.sendMessage(chatId, message);
    return true;
  } catch (error) {
    if (error.response?.statusCode === 400 && error.response.body?.description?.includes('chat not found')) {
      console.warn(`Chat not found for ID: ${chatId}. Removing from active chats.`);
      removeInactiveChat(userId);
      return false;
    }
    console.error('Error sending Telegram message:', error.message);
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

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { status: 'error', message: 'Too many requests' },
  standardHeaders: true
});

app.use(apiLimiter);

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Webhook setup (commented since we're using polling)
// bot.setWebHook(`${webAppUrl}/bot${token}`)
//   .then(() => console.log('✅ Telegram webhook set'))
//   .catch(console.error);

// Telegram webhook handler (commented since we're using polling)
// app.post(`/bot${token}`, (req, res) => {
//   bot.processUpdate(req.body);
//   res.sendStatus(200);
// });

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Store active chats when users interact with the bot
bot.on('message', (msg) => {
  if (msg.chat && msg.from) {
    console.log(`Storing active chat for user: ${msg.from.id} in chat: ${msg.chat.id}`);
    addActiveChat(msg.from.id, msg.chat.id);
  }
});

// Service 1: 1-on-1 Help
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
    
    // Confirm to user safely
    const messageSent = await safeSendMessage(
      userData.id,
      "✅ We've received your consultation request!\n\n" +
      "I'll review your inquiry and get back to you when I'm online. " +
      "Typically responses take 24-48 hours during business days.\n\n" +
      "Looking forward to helping you with your investment challenges!"
    );
    
    // Store request
    const request = {
      id: Date.now(),
      userId: userData.id,
      name: userData.name,
      telegramUsername,
      problem,
      timestamp: new Date().toISOString(),
      messageSent
    };
    
    const requests = safeReadJSON('data/one_on_one.json', []);
    const updatedRequests = [...requests, request];
    fs.writeFileSync('data/one_on_one.json', JSON.stringify(updatedRequests, null, 2));
    
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

// Service 2: Essential Books
app.get('/api/books', (req, res) => {
  try {
    const books = safeReadJSON('data/books.json', []);
    res.json({ 
      status: 'success', 
      books: books.map(book => ({
        title: book.title,
        author: book.author,
        description: book.description,
        file: book.file
      }))
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Could not load books' });
  }
});

// Service 3: Book Reviews
app.get('/api/reviews', (req, res) => {
  try {
    const reviews = safeReadJSON('data/reviews.json', []);
    res.json({ status: 'success', reviews });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Could not load reviews' });
  }
});

// Service 4: Group Access
app.post('/api/service/group_access', async (req, res) => {
  const { userData } = req.body;
  
  if (!userData || !userData.id) {
    return res.status(400).json({ status: 'error', message: 'Invalid request' });
  }

  try {
    // Grant access and send link
    const messageSent = await safeSendMessage(
      userData.id,
      `👥 Join our community: ${groupLink}`
    );
    
    // Log access
    const access = {
      id: Date.now(),
      userId: userData.id,
      name: userData.name,
      timestamp: new Date().toISOString(),
      messageSent
    };
    
    const accesses = safeReadJSON('data/group_access.json', []);
    const updatedAccesses = [...accesses, access];
    fs.writeFileSync('data/group_access.json', JSON.stringify(updatedAccesses, null, 2));
    
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

// Service 5: Prospectus Review
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
      `🧾 New Prospectus Submission:\n\nUser: ${userData.name || 'N/A'}\nID: ${userData.id}\nFile: ${file.filename}`
    );
    
    // Confirm to user safely
    const messageSent = await safeSendMessage(
      userData.id,
      "✅ We've received your prospectus! We'll review it within 48 hours."
    );
    
    // Log submission
    const submission = {
      id: Date.now(),
      userId: userData.id,
      name: userData.name,
      filename: file.filename,
      timestamp: new Date().toISOString(),
      messageSent
    };
    
    const submissions = safeReadJSON('data/prospectus.json', []);
    const updatedSubmissions = [...submissions, submission];
    fs.writeFileSync('data/prospectus.json', JSON.stringify(updatedSubmissions, null, 2));
    
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

// Service 6: Newsletter
app.get('/api/newsletters', (req, res) => {
  try {
    const newsletters = safeReadJSON('data/newsletters.json', []);
    res.json({ status: 'success', newsletters });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Could not load newsletters' });
  }
});

app.post('/api/service/newsletter', async (req, res) => {
  const { userData } = req.body;
  
  if (!userData || !userData.id) {
    return res.status(400).json({ status: 'error', message: 'Invalid request' });
  }

  try {
    // Subscribe user safely
    const messageSent = await safeSendMessage(
      userData.id,
      "📬 You're now subscribed to the Abenlytics Newsletter!"
    );
    
    // Store subscription
    const subscription = {
      id: Date.now(),
      userId: userData.id,
      name: userData.name,
      timestamp: new Date().toISOString(),
      messageSent
    };
    
    // FIX: Ensure we always have an array
    let subscriptions = safeReadJSON('data/newsletter.json', []);
    if (!Array.isArray(subscriptions)) {
      console.warn('Invalid newsletter.json format - resetting to array');
      subscriptions = [];
    }
    
    const updatedSubscriptions = [...subscriptions, subscription];
    fs.writeFileSync('data/newsletter.json', JSON.stringify(updatedSubscriptions, null, 2));
    
    res.json({ 
      status: 'success',
      message: messageSent 
        ? 'Subscription confirmed' 
        : 'Subscription created! Please start a chat with the bot to receive newsletters'
    });
  } catch (err) {
    console.error('Newsletter Error:', err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// Service 7: Roadmaps
app.get('/api/roadmaps', (req, res) => {
  try {
    const roadmaps = safeReadJSON('data/roadmaps.json', []);
    res.json({ status: 'success', roadmaps });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Could not load roadmaps' });
  }
});

// Initialize data files
const initDataFiles = () => {
  const files = {
    'active_chats.json': {},
    'one_on_one.json': [],
    'books.json': [
      {
        id: 1,
        title: "The Intelligent Investor",
        author: "Benjamin Graham",
        year: 1949,
        description: "The definitive book on value investing and defensive investing strategies",
        file: "the_intelligent_investor.pdf"
      },
      {
        id: 2,
        title: "A Random Walk Down Wall Street",
        author: "Burton Malkiel",
        year: 1973,
        description: "Classic text on market efficiency and index fund investing",
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
      },
      {
        id: 2,
        title: "Crypto Winter Analysis",
        date: "2025-02-01",
        description: "Navigating bear markets in cryptocurrency",
        file: "crypto_winter_analysis.pdf"
      }
    ],
    'roadmaps.json': [
      {
        id: 1,
        title: "Long-Term Wealth Building",
        type: "long-term",
        description: "10-year investment strategy",
        steps: ["Asset allocation", "Dollar-cost averaging", "Tax optimization"],
        file: "long_term_roadmap.pdf"
      },
      {
        id: 2,
        title: "Swing Trading Strategy",
        type: "swing",
        description: "3-6 month position trading",
        steps: ["Technical analysis", "Risk management", "Position sizing"],
        file: "swing_trading_roadmap.pdf"
      }
    ]
  };

  Object.entries(files).forEach(([filename, data]) => {
    const filePath = path.join(__dirname, 'data', filename);
    
    // Create file if it doesn't exist
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } 
    // Initialize empty files
    else if (fs.statSync(filePath).size === 0) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }
  });
};

initDataFiles();

// Bot start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  console.log(`User started conversation: ${userId} in chat: ${chatId}`);
  addActiveChat(userId, chatId);
  
  bot.sendMessage(
    chatId, 
    '👋 Welcome to Abenlytics Club! Now you can receive service confirmations.', 
    {
      reply_markup: {
        inline_keyboard: [[{
          text: "🚀 Open Web App",
          web_app: { url: webAppUrl }
        }]]
      }
    }
  );
});

// Store chat IDs for any message from users
bot.on('message', (msg) => {
  if (msg.chat && msg.from) {
    console.log(`Storing active chat for user: ${msg.from.id} in chat: ${msg.chat.id}`);
    addActiveChat(msg.from.id, msg.chat.id);
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🤖 Telegram bot started with polling`);
});
