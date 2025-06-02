const express = require('express');
const path = require('path'); // Don't forget to require path
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== FIX 1: PROPER STATIC FILE HANDLING =====
app.use(express.static(path.join(__dirname, 'public')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// ===== FIX 2: EXPLICIT WEB APP ROUTE =====
app.get('/webapp', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== FIX 3: FALLBACK FOR ALL ROUTES =====
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// (Keep your existing bot code here)
const TOKEN = process.env.BOT_TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
  const options = {
    reply_markup: {
      inline_keyboard: [
        [{
          text: '📘 Open Web App', 
          web_app: { 
            // ===== FIX 4: USE THE EXPLICIT ROUTE =====
            url: 'https://abenlytics-telegram-bot.onrender.com/webapp'
          }
        }]
      ]
    }
  };
  bot.sendMessage(msg.chat.id, 'Try our web app:', options);
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
