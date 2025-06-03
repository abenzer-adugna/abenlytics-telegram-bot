const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const token = '7598133638:AAH1rMAchR0CTwXEZmT6vcBeD_RjWy2LHEE'; // Replace with your real token
const webAppUrl = 'https://your-app-name.onrender.com'; // Replace with your Render domain
const bot = new TelegramBot(token, { polling: false });

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve your front-end

// Webhook setup
bot.setWebHook('${webAppUrl}/bot${token}')
  .then(() => console.log('✅ Telegram webhook set'))
  .catch(console.error);

// Telegram webhook handler
app.post('/bot${token}', (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/service', async (req, res) => {
  const { serviceType, userData } = req.body;

  try {
    if (!userData || !userData.id) throw new Error('Missing user info');

    switch (serviceType) {
      case 'book_download':
        await bot.sendMessage(userData.id, '📚 Download your book here:\nhttps://example.com/books.zip');
        break;
      case 'one_on_one':
        await bot.sendMessage('1139124574', 📞 New 1-on-1 request:\n\n${JSON.stringify(userData, null, 2)});
        await bot.sendMessage(userData.id, ✅ Got it! We'll reach out to you within 24 hrs.);
        break;
      case 'newsletter':
        await bot.sendMessage(userData.id, 📬 You're now subscribed to the Abenlytics Newsletter.);
        break;
      default:
        throw new Error('❌ Invalid serviceType');
    }

    res.json({ status: 'success' });

  } catch (err) {
    console.error(err);
    res.status(400).json({ status: 'error', message: err.message });
  }
});

// Telegram /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const text = 👋 Welcome to Abenlytics Club!\n\nUse the menu below to access investing tools, roadmaps, books, and more.;

  bot.sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [[{
        text: "🚀 Open Web App",
        web_app: { url: webAppUrl }
      }]]
    }
  });
});

// Telegram /services
bot.onText(/\/services/, (msg) => {
  const services = 🛠️ Available Services:\n\n +
                   1. 📘 Download Investing Books\n +
                   2. 🧠 Read Book Reviews\n +
                   3. 🛣️ Follow Roadmaps\n +
                   4. 📩 Weekly Newsletter\n +
                   5. 👥 1-on-1 Consultations;

  bot.sendMessage(msg.chat.id, services);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(✅ Server running at http://localhost:${PORT});
  console.log(🌐 Web App URL: ${webAppUrl});
  console.log(📩 Webhook URL: ${webAppUrl}/bot${token});
});
