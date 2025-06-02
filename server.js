const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const app = express();

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Command: /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 👋 Welcome to *Abenlytics Club*!

Here’s what you can access:
📚 Book Reviews  
🧭 Roadmaps  
📩 Weekly Newsletter  
🔎 Prospectus Reviews  
👥 1-on-1 Help

Join our community and start learning together!);
});

// Web interface
app.get('/', (req, res) => {
  res.send('✅ Abenlytics Bot is Running!');
});

// Keep alive
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(Server is live at http://localhost:${PORT});
});
