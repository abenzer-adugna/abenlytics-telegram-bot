const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const token = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN';
const adminId = process.env.ADMIN_CHAT_ID || 'YOUR_ADMIN_CHAT_ID';
const webAppUrl = process.env.WEB_APP_URL || 'https://your-bot-name.onrender.com';

const bot = new TelegramBot(token, { polling: false });
const app = express();

// Middleware setup
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files

// ✅ Set webhook (fixed)
bot.setWebHook(${webAppUrl}/bot${token})
  .then(() => console.log('✅ Webhook set successfully'))
  .catch(console.error);

// Telegram webhook route
app.post(/bot${token}, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Serve your web app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint for web app actions
app.post('/api/service', (req, res) => {
  const { serviceType, userData } = req.body;

  try {
    switch (serviceType) {
      case 'book_download':
        handleBookDownload(userData);
        break;
      case 'one_on_one':
        handleOneOnOneRequest(userData);
        break;
      case 'newsletter':
        handleNewsletterSignup(userData);
        break;
      default:
        throw new Error('Invalid service type');
    }

    res.json({ status: 'success', message: 'Action processed' });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

// Bot commands
bot.onText(/\/start/, (msg) => {
  const welcomeMessage = 📈 Welcome to Abenlytics Club!\n\n +
    Access our investment resources through the menu button or type /services;

  bot.sendMessage(msg.chat.id, welcomeMessage, {
    reply_markup: {
      inline_keyboard: [[{
        text: 'Open Web App',
        web_app: { url: webAppUrl }
      }]]
    }
  });
});

bot.onText(/\/services/, (msg) => {
  const servicesList = 🔍 Available Services:\n\n +
    1. Essential Investment Books\n +
    2. Book Reviews\n +
    3. Investment Roadmaps\n +
    4. Weekly Newsletter\n +
    5. 1-on-1 Consultations;

  bot.sendMessage(msg.chat.id, servicesList);
});

// Service handlers
async function handleBookDownload(user) {
  const bookUrl = 'https://example.com/books.zip'; // replace with actual file
  await bot.sendMessage(user.id, 📚 Here's your download link:\n${bookUrl});
}

async function handleOneOnOneRequest(user) {
  const adminMessage = ❗ New Consultation Request:\n\n +
    From: ${user.first_name} ${user.last_name || ''}\n +
    Username: @${user.username || 'N/A'}\n +
    User ID: ${user.id};
  await bot.sendMessage(adminId, adminMessage);

  await bot.sendMessage(user.id, ✅ Your consultation request has been received!  +
    We'll contact you within 24 hours.);
}

async function handleNewsletterSignup(user) {
  await bot.sendMessage(user.id, 📬 You've been subscribed to our weekly newsletter!  +
    Look out for our next edition on Monday morning.);
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(🚀 Server running on port ${PORT});
  console.log(🌐 Web app URL: ${webAppUrl});
  console.log(🔗 Webhook endpoint: ${webAppUrl}/bot${token});
});
