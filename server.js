const express = require('express');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const TOKEN = process.env.BOT_TOKEN;

// Initialize bot (switch to webhook if deployed)
const bot = process.env.NODE_ENV === 'production' 
  ? new TelegramBot(TOKEN) 
  : new TelegramBot(TOKEN, { polling: true });

// Serve static files (for web app)
app.use(express.static(path.join(__dirname, 'public')));

// Webhook setup (for production)
if (process.env.NODE_ENV === 'production') {
  const WEBHOOK_URL = `https://${process.env.RENDER_EXTERNAL_HOSTNAME}/bot${TOKEN}`; // ✅ Fixed: Use backticks
  bot.setWebHook(WEBHOOK_URL);
  app.post(`/bot${TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });
}

// Telegram bot commands
bot.onText(/\/start/, (msg) => {
  const welcomeMessage = `👋 Welcome to *Abenlytics Club!*\n\nChoose an option below to get started.`;
  const options = {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{
          text: '📘 Courses', 
          web_app: { url: `https://${process.env.RENDER_EXTERNAL_HOSTNAME}` } // ✅ Fixed: Use backticks
        }],
        [{
          text: '📩 Contact', 
          url: 'https://t.me/YOUR_TELEGRAM_USERNAME' 
        }]
      ]
    }
  };
  bot.sendMessage(msg.chat.id, welcomeMessage, options);
});

// Health check route
app.get('/', (req, res) => {
  res.send('Abenlytics Bot is running!');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
