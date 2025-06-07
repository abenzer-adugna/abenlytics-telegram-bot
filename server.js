require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// ======================
// SECURITY MIDDLEWARE
// ======================
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://your-app.vercel.app'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting (100 requests per 15 minutes)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
}));

// ======================
// TELEGRAM BOT
// ======================
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: false });
const activeChats = new Map();

bot.on('message', (msg) => {
  if (msg.chat && msg.from) {
    activeChats.set(msg.from.id, msg.chat.id);
  }
});

// ======================
// API ENDPOINTS
// ======================

// 1. Get Books
app.get('/api/books', async (req, res) => {
  try {
    const books = [
      {
        title: "The Intelligent Investor",
        author: "Benjamin Graham",
        description: "A classic book on value investing",
        file: "books/the-intelligent-investor.pdf"
      },
      {
        title: "Security Analysis",
        author: "Benjamin Graham & David Dodd",
        description: "The bible of fundamental analysis",
        file: "books/security-analysis.pdf"
      }
    ];

    res.json({
      status: 'success',
      books: books.map(book => ({
        ...book,
        url: `${process.env.WEBAPP_URL || 'http://localhost:3000'}/${book.file}`
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Get Roadmaps
app.get('/api/roadmaps', async (req, res) => {
  try {
    const roadmaps = [
      {
        title: "Beginner's Investment Roadmap",
        description: "Step-by-step guide to start investing",
        file: "roadmaps/beginner-investment.pdf"
      },
      {
        title: "Advanced Trading Strategies",
        description: "Professional trading techniques",
        file: "roadmaps/advanced-trading.pdf"
      }
    ];

    res.json({
      status: 'success',
      roadmaps: roadmaps.map(roadmap => ({
        ...roadmap,
        url: `${process.env.WEBAPP_URL || 'http://localhost:3000'}/${roadmap.file}`
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Get Reviews
app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = [
      {
        id: 1,
        bookTitle: "The Intelligent Investor",
        rating: 5,
        summary: "The definitive book on value investing, teaching the principles of long-term investment strategies.",
        keyInsights: [
          "Margin of safety concept",
          "Mr. Market analogy",
          "Difference between investing and speculating"
        ],
        date: "2023-10-15"
      },
      {
        id: 2,
        bookTitle: "Security Analysis",
        rating: 4,
        summary: "The foundational text for fundamental analysis of securities.",
        keyInsights: [
          "Intrinsic value calculation",
          "Financial statement analysis",
          "Risk assessment techniques"
        ],
        date: "2023-11-02"
      }
    ];

    res.json({
      status: 'success',
      reviews
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Telegram Webhook
app.post(`/bot${process.env.TELEGRAM_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// 5. Group Access Service
app.post('/api/service/group_access', async (req, res) => {
  try {
    const { userData } = req.body;
    
    if (!userData?.id) {
      return res.status(400).json({ error: 'User data required' });
    }

    await bot.sendMessage(
      userData.id,
      `🎉 Welcome to the community!\n\n` +
      `Join our group: ${process.env.TELEGRAM_GROUP_LINK}\n\n` +
      `See you there! 👋`
    );

    res.json({ 
      status: 'success',
      link: process.env.TELEGRAM_GROUP_LINK
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Newsletter Subscription
app.post('/api/service/newsletter', async (req, res) => {
  try {
    const { userData } = req.body;
    
    await bot.sendMessage(
      process.env.ADMIN_CHAT_ID,
      `📬 New Newsletter Subscriber:\n\n` +
      `👤 ${userData.name || 'Anonymous'}\n` +
      `🆔 ${userData.id}\n` +
      `📅 ${new Date().toLocaleString()}`
    );

    const chatId = activeChats.get(userData.id);
    if (chatId) {
      await bot.sendMessage(
        chatId,
        "✅ You're subscribed!\n\n" +
        "Expect our next edition soon with exclusive market insights."
      );
    }

    res.json({ status: 'success' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Prospectus Service
app.post('/api/service/prospectus', async (req, res) => {
  try {
    const { userData } = req.body;
    
    await bot.sendMessage(
      process.env.ADMIN_CHAT_ID,
      `📄 New Prospectus Request:\n\n` +
      `👤 ${userData.name || 'Anonymous'}\n` +
      `🆔 ${userData.id}\n` +
      `📅 ${new Date().toLocaleString()}`
    );

    res.json({ 
      status: 'success',
      message: 'Our team will review your prospectus shortly'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve Static Files
app.use(express.static('public'));

// Fallback route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error Handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Server Initialization
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  // Set webhook on startup
  bot.setWebHook(
    `${process.env.WEBAPP_URL}/bot${process.env.TELEGRAM_TOKEN}`
  ).then(() => console.log('✅ Webhook configured'));
});
