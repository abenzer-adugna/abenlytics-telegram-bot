const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const app = express();

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  const welcomeMessage = `👋 Welcome to *Abenlytics Club!*

Here's what you can access:
📚 Book Reviews  
🧭 Roadmaps  
📩 Newsletter  
🔎 Prospectus Review  
👥 1-on-1 Help  

Join our Telegram group for live discussion!`;

  bot.sendMessage(msg.chat.id, welcomeMessage, { parse_mode: 'Markdown' });
});

app.get('/', (req, res) => {
  res.send('Abenlytics Club Bot is running!');
});

app.listen(process.env.PORT || 3000);
