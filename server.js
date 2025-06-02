const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

// Load .env only in development
if (process.env.NODE_ENV !== 'production') require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const TOKEN = process.env.BOT_TOKEN;

// Initialize bot
const bot = new TelegramBot(TOKEN, { polling: true });

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Webhook setup for production (optional)
if (process.env.NODE_ENV === 'production') {
  const webhookUrl = `https://${process.env.RENDER_EXTERNAL_HOSTNAME}/bot${TOKEN}`;
  bot.setWebHook(webhookUrl).catch(err => {
    console.error('Webhook setup failed:', err);
  });

  app.post(`/bot${TOKEN}`, (req, res) => {
    try {
      bot.processUpdate(req.body);
      res.sendStatus(200);
    } catch (err) {
      console.error('Error processing update:', err);
      res.sendStatus(200); // Still return 200 to prevent Telegram from retrying
    }
  });
}

// Basic command handler with error handling
bot.onText(/\/start/, (msg) => {
  try {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Welcome to Abenlytics Bot!').catch(err => {
      console.error('Error sending welcome message:', err);
    });
  } catch (err) {
    console.error('Error in /start handler:', err);
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Bot is running!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
