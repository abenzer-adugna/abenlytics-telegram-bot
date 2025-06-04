const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const crypto = require('crypto');

// Initialize app
const app = express();

// Get environment variables (Render.com style)
const token = process.env.TELEGRAM_TOKEN;
const webAppUrl = process.env.WEBAPP_URL;
const adminId = process.env.ADMIN_CHAT_ID;

if (!token || !webAppUrl || !adminId) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: false });

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Telegram webhook
bot.setWebHook(`${webAppUrl}/bot${token}`)
  .then(() => console.log('✅ Telegram webhook set'))
  .catch(console.error);

// Webhook handler
app.post(`/bot${token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Parse query string into object
function parseQueryString(query) {
  return Object.fromEntries(new URLSearchParams(query));
}

// Validate Telegram initData using the bot token
function verifyInitData(initData) {
  const parsed = parseQueryString(initData);
  const { hash } = parsed;
  delete parsed.hash;

  const dataCheckString = Object.keys(parsed)
    .sort()
    .map(k => `${k}=${parsed[k]}`)
    .join('\n');

  const secret = crypto
    .createHash('sha256')
    .update(token)
    .digest();

  const hmac = crypto
    .createHmac('sha256', secret)
    .update(dataCheckString)
    .digest('hex');

  return hmac === hash ? parsed : null;
}

// POST /verify-initdata for frontend auth
app.post('/verify-initdata', (req, res) => {
  const { initData } = req.body;
  if (!initData) {
    return res.status(400).json({ ok: false, error: 'Missing initData' });
  }

  const verified = verifyInitData(initData);
  if (verified) {
    return res.json({ ok: true, user: verified });
  } else {
    return res.status(403).json({ ok: false, error: 'Invalid initData' });
  }
});

// API endpoint for service actions
app.post('/api/service', async (req, res) => {
  const { serviceType, userData } = req.body;

  if (!serviceType || !userData || !userData.id) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required parameters'
    });
  }

  try {
    switch (serviceType) {
      case 'book_download':
        await bot.sendMessage(
          userData.id,
          '📚 Download your book here:\nhttps://example.com/books.zip'
        );
        break;

      case 'one_on_one':
        const safeUserData = {
          name: (userData.name || '').substring(0, 100),
          email: (userData.email || '').substring(0, 100),
          id: userData.id
        };

        await bot.sendMessage(
          adminId,
          `📞 New 1-on-1 request:\n\n${JSON.stringify(safeUserData, null, 2)}`
        );
        await bot.sendMessage(
          userData.id,
          '✅ Got it! We\'ll reach out within 24 hrs.'
        );
        break;

      case 'newsletter':
        await bot.sendMessage(
          userData.id,
          '📬 You\'re now subscribed to the Abenlytics Newsletter.'
        );
        break;

      default:
        return res.status(400).json({
          status: 'error',
          message: 'Invalid service type'
        });
    }

    res.json({ status: 'success' });

  } catch (err) {
    console.error('API Error:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Telegram bot commands
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '👋 Welcome to Abenlytics Club!', {
    reply_markup: {
      inline_keyboard: [[{
        text: "🚀 Open Web App",
        web_app: { url: webAppUrl }
      }]]
    }
  });
});

bot.onText(/\/services/, (msg) => {
  const services = `🛠️ Available Services:\n\n` +
                   `1. 📘 Download Investing Books\n` +
                   `2. 🧠 Read Book Reviews\n` +
                   `3. 🛣️ Follow Roadmaps\n` +
                   `4. 📩 Weekly Newsletter\n` +
                   `5. 👥 1-on-1 Consultations`;
  bot.sendMessage(msg.chat.id, services);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Webhook URL: ${webAppUrl}/bot${token}`);
});
