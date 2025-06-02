const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

// Load .env only in development
if (process.env.NODE_ENV !== 'production') require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const TOKEN = process.env.BOT_TOKEN;

// Initialize bot based on environment
const bot = process.env.NODE_ENV === 'production' 
  ? new TelegramBot(TOKEN)
  : new TelegramBot(TOKEN, { polling: true });

// Webhook setup for production
if (process.env.NODE_ENV === 'production') {
  const webhookUrl = `https://${process.env.RENDER_EXTERNAL_HOSTNAME}/bot${TOKEN}`;
  bot.setWebHook(webhookUrl);
  app.post(`/bot${TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });
}

// Bot commands
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Welcome to Abenlytics!');
});

// Health check
app.get('/', (req, res) => res.send('Bot is running!'));

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
