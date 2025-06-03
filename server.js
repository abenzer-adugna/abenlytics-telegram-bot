require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const TOKEN = process.env.BOT_TOKEN;

// Initialize Telegram Bot
const bot = new TelegramBot(TOKEN, { polling: true });

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Handle /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = `👋 Welcome to *Abenlytics Club!*\n\nYour premier stock and crypto investment hub.`;
  
  const menuOptions = {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📘 Courses', web_app: { url: process.env.WEB_APP_URL } }],
        [{ text: '📩 Contact', url: 'https://t.me/AbenlyticsSupport' }],
        [{ text: '💬 Join Community', url: 'https://t.me/AbenlyticsCommunity' }]
      ]
    }
  };
  
  bot.sendMessage(chatId, welcomeMessage, menuOptions);
});

// Additional commands
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Need help? Contact @AbenlyticsSupport');
});

bot.onText(/\/resources/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Explore our resources: ' + process.env.WEB_APP_URL);
});

// Webhook for production
if (process.env.NODE_ENV === 'production') {
  const WEBHOOK_URL = `${process.env.BASE_URL}/bot${TOKEN}`;
  bot.setWebHook(WEBHOOK_URL);
  
  app.post(`/bot${TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });
}

// Basic route
app.get('/', (req, res) => {
  res.send('Abenlytics Club Bot is running!');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Web App: ${process.env.WEB_APP_URL || 'Set WEB_APP_URL in .env'}`);
});
