require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const fs = require('fs');

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
// SUPABASE STORAGE
// ======================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Initialize storage buckets on startup
async function initStorage() {
  const requiredBuckets = ['books', 'newsletters', 'prospectus'];
  
  for (const bucket of requiredBuckets) {
    const { data: existing } = await supabase.storage.listBuckets();
    if (!existing.some(b => b.name === bucket)) {
      await supabase.storage.createBucket(bucket, { public: true });
    }
  }
}

// ======================
// TELEGRAM BOT
// ======================
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: false });

// Store active chats (in-memory for simplicity, consider Redis for production)
const activeChats = new Map();

bot.on('message', (msg) => {
  if (msg.chat && msg.from) {
    activeChats.set(msg.from.id, msg.chat.id);
  }
});

// ======================
// API ENDPOINTS
// ======================

// 1. File Upload (Supabase)
app.post('/api/upload', async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.files.file;
    const fileExt = path.extname(file.name);
    const fileName = `${Date.now()}${fileExt}`;
    const bucket = req.body.bucket || 'uploads';

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(`files/${fileName}`, file.data);

    if (error) throw error;

    res.json({
      url: `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${data.path}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Telegram Webhook
app.post(`/bot${process.env.TELEGRAM_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// 3. Group Access Service
app.post('/api/service/group_access', async (req, res) => {
  try {
    const { userData } = req.body;
    
    if (!userData?.id) {
      return res.status(400).json({ error: 'User data required' });
    }

    // Send group invite
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

// 4. Newsletter Subscription
app.post('/api/service/newsletter', async (req, res) => {
  try {
    const { userData } = req.body;
    
    // Notify admin
    await bot.sendMessage(
      process.env.ADMIN_CHAT_ID,
      `📬 New Newsletter Subscriber:\n\n` +
      `👤 ${userData.name || 'Anonymous'}\n` +
      `🆔 ${userData.id}\n` +
      `📅 ${new Date().toLocaleString()}`
    );

    // Confirm to user
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

// 5. Serve Static Files
app.use(express.static('public'));

// Fallback route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ======================
// ERROR HANDLING
// ======================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// ======================
// SERVER INITIALIZATION
// ======================
async function startServer() {
  await initStorage();
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    
    // Set webhook on startup
    bot.setWebHook(
      `${process.env.WEBAPP_URL}/bot${process.env.TELEGRAM_TOKEN}`
    ).then(() => console.log('✅ Webhook configured'));
  });
}

startServer();
