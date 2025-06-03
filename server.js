require('dotenv').config(); // Load environment variables
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Environment variables
const token = process.env.TELEGRAM_TOKEN;
const webAppUrl = process.env.WEBAPP_URL;
const adminId = process.env.ADMIN_CHAT_ID;

if (!token || !webAppUrl || !adminId) {
  throw new Error('❌ Missing required environment variables');
}

const bot = new TelegramBot(token, { polling: false });

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  }
}));

// Rate limiting (100 requests per 15 minutes)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.'
});

// Application middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

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

// Protected API endpoint
app.post('/api/service', apiLimiter, async (req, res) => {
  const { serviceType, userData } = req.body;

  // Input validation
  if (!serviceType || !userData || !userData.id) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Missing required parameters' 
    });
  }

  // Validate Telegram ID format
  if (!/^\d+$/.test(userData.id)) {
    return res.status(403).json({ 
      status: 'error', 
      message: 'Invalid user identifier' 
    });
  }

  try {
    switch (serviceType) {
      case 'book_download':
        await bot.sendMessage(
          userData.id, 
          '📚 Download your book here:\nhttps://example.com/books.zip'
        );
        break;

      case 'one_on_one':
        // Sanitize user data before sending
        const safeUserData = {
          name: userData.name?.substring(0, 100) || 'N/A',
          email: userData.email?.substring(0, 100) || 'N/A',
          id: userData.id
        };
        
        await bot.sendMessage(
          adminId, 
          `📞 New 1-on-1 request:\n\n${JSON.stringify(safeUserData, null, 2)}`
        );
        await bot.sendMessage(
          userData.id, 
          '✅ Got it! We\'ll reach out to you within 24 hrs.'
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
  const text = '👋 Welcome to Abenlytics Club!\n\nUse the menu below to access investing tools, roadmaps, books, and more.';

  bot.sendMessage(chatId, text, {
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
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`🌐 Web App URL: ${webAppUrl}`);
  console.log(`📩 Webhook URL: ${webAppUrl}/bot${token}`);
});
