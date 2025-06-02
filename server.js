const express = require('express');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Telegram bot setup
const token = process.env.BOT_TOKEN; // Make sure this is set in your environment variables
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  const welcomeMessage = "👋 Welcome to *Abenlytics Club!*";
  bot.sendMessage(msg.chat.id, welcomeMessage, { parse_mode: "Markdown" });
});

// Start the server
app.listen(port, () => {
  console.log(Server is running on port ${port});
});
