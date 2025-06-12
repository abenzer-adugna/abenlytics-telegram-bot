require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ dest: 'uploads/' });

let bot;
if (process.env.TELEGRAM_BOT_TOKEN) {
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
    console.log('Telegram bot initialized');
} else {
    console.log('No Telegram bot token provided - notifications disabled');
}

app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || '*'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: JSON.stringify({ 
        status: 'error',
        error: 'Too many requests, please try again later.' 
    })
}));
app.set('trust proxy', 1);

app.use((req, res, next) => {
    const publicPaths = ['/login', '/static', '/auth-status'];
    if (publicPaths.some(path => req.path.startsWith(path))) {
        return next();
    }
    if (req.cookies.authToken === 'verified') {
        return next();
    }
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const validCreds = (
        username === (process.env.AUTH_USER || 'admin') && 
        password === (process.env.AUTH_PASS || 'yourpassword123')
    );
    if (validCreds) {
        res.cookie('authToken', 'verified', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 86400000
        });
        return res.json({ status: 'success' });
    }
    return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
});

app.post('/logout', (req, res) => {
    res.clearCookie('authToken');
    res.json({ status: 'success' });
});

app.get('/auth-status', (req, res) => {
    res.json({ authenticated: req.cookies.authToken === 'verified' });
});

app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/books', express.static(path.join(__dirname, 'public', 'books'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.pdf')) {
            res.set('Content-Type', 'application/pdf');
        }
    }
}));
app.use('/roadmaps', express.static(path.join(__dirname, 'public', 'roadmaps')));

app.get('/api/books', (req, res) => {
    try {
        const booksPath = path.join(__dirname, 'public', 'data', 'books.json');
        if (!fs.existsSync(booksPath)) {
            return res.status(404).json({ 
                status: 'error',
                error: 'Books file not found'
            });
        }
        const rawData = fs.readFileSync(booksPath, 'utf8');
        const books = JSON.parse(rawData);
        const verifiedBooks = books.map(book => {
            const filePath = path.join(__dirname, 'public', 'books', book.file);
            if (!fs.existsSync(filePath)) {
                console.warn(`Missing book file: ${book.file}`);
                return null;
            }
            return {
                title: book.title,
                author: book.author || 'Unknown Author',
                description: book.description || book.note || 'No description available',
                file: book.file,
                url: `/books/${encodeURIComponent(book.file)}`
            };
        }).filter(Boolean);
        res.json({ 
            status: 'success',
            books: verifiedBooks 
        });
    } catch (error) {
        console.error('Books endpoint error:', error);
        res.status(500).json({ 
            status: 'error',
            error: 'Failed to load books',
            details: error.message 
        });
    }
});

app.get('/api/roadmaps', (req, res) => {
    try {
        const roadmapsPath = path.join(__dirname, 'public', 'data', 'roadmaps.json');
        if (!fs.existsSync(roadmapsPath)) {
            return res.status(404).json({ 
                status: 'error',
                error: 'Roadmaps file not found'
            });
        }
        const rawData = fs.readFileSync(roadmapsPath, 'utf8');
        const roadmaps = JSON.parse(rawData);
        const verifiedRoadmaps = roadmaps.map(roadmap => {
            const filePath = path.join(__dirname, 'public', 'roadmaps', roadmap.file);
            if (!fs.existsSync(filePath)) {
                console.warn(`Missing roadmap file: ${roadmap.file}`);
                return null;
            }
            return {
                title: roadmap.title,
                description: roadmap.description || 'No description available',
                file: roadmap.file,
                url: `/roadmaps/${encodeURIComponent(roadmap.file)}`
            };
        }).filter(Boolean);
        res.json({ 
            status: 'success',
            roadmaps: verifiedRoadmaps 
        });
    } catch (error) {
        console.error('Roadmaps endpoint error:', error);
        res.status(500).json({ 
            status: 'error',
            error: 'Failed to load roadmaps',
            details: error.message 
        });
    }
});

app.get('/api/reviews', (req, res) => {
    try {
        const reviewsPath = path.join(__dirname, 'public', 'data', 'reviews.json');
        if (!fs.existsSync(reviewsPath)) {
            return res.status(404).json({ 
                status: 'error',
                error: 'Reviews file not found'
            });
        }
        const rawData = fs.readFileSync(reviewsPath, 'utf8');
        const reviews = JSON.parse(rawData);
        res.json({
            status: 'success',
            reviews: reviews.map(review => ({
                bookTitle: review.bookTitle || 'Unknown Book',
                date: review.date || 'No date',
                rating: review.rating || 0,
                summary: review.summary || 'No summary available',
                keyInsights: review.keyInsights || ['No insights available']
            }))
        });
    } catch (error) {
        console.error('Reviews endpoint error:', error);
        res.status(500).json({ 
            status: 'error',
            error: 'Failed to load reviews',
            details: error.message 
        });
    }
});

app.post('/api/service/group_access', async (req, res) => {
    try {
        const { userData } = req.body;
        if (!userData?.id) {
            return res.status(400).json({ 
                status: 'error',
                error: 'User data required' 
            });
        }
        console.log(`Group access request from user: ${userData.id}`);
        res.json({ 
            status: 'success',
            link: process.env.TELEGRAM_GROUP_LINK || 'https://t.me/yourgroup'
        });
    } catch (error) {
        console.error('Group access error:', error);
        res.status(500).json({ 
            status: 'error',
            error: error.message 
        });
    }
});

app.post('/api/service/newsletter', async (req, res) => {
    try {
        const { userData } = req.body;
        if (!userData?.id) {
            return res.status(400).json({ 
                status: 'error',
                error: 'User data required' 
            });
        }
        console.log(`New newsletter subscriber: ${userData.id}`);
        res.json({ 
            status: 'success',
            message: 'Subscribed successfully'
        });
    } catch (error) {
        console.error('Newsletter error:', error);
        res.status(500).json({ 
            status: 'error',
            error: error.message 
        });
    }
});

app.post('/api/service/prospectus', upload.single('file'), async (req, res) => {
    try {
        const userData = JSON.parse(req.body.userData);
        if (!userData?.id) {
            return res.status(400).json({ 
                status: 'error',
                error: 'User data required' 
            });
        }
        if (!req.file) {
            return res.status(400).json({ 
                status: 'error',
                error: 'No file uploaded' 
            });
        }
        console.log(`Prospectus uploaded by user: ${userData.id}`);
        console.log(`File: ${req.file.originalname} (${req.file.size} bytes)`);
        fs.unlinkSync(req.file.path);
        res.json({ 
            status: 'success',
            message: 'Prospectus received for review'
        });
    } catch (error) {
        console.error('Prospectus error:', error);
        res.status(500).json({ 
            status: 'error',
            error: error.message 
        });
    }
});

app.post('/api/service/one_on_one', async (req, res) => {
    try {
        const { name, telegramUsername, problem, userData } = req.body;
        if (!name || !telegramUsername || !problem || !userData?.id) {
            return res.status(400).json({ 
                status: 'error',
                error: 'All fields are required' 
            });
        }
        console.log(`
        New Consultation Request:
        -------------------------
        Name: ${name}
        Telegram: ${telegramUsername}
        User ID: ${userData.id}
        Problem: ${problem}
        `);
        if (bot && process.env.ADMIN_CHAT_ID) {
            try {
                await bot.sendMessage(
                    process.env.ADMIN_CHAT_ID,
                    `🆕 *New Consultation Request*\n\n` +
                    `👤 *Name:* ${name}\n` +
                    `📱 *Telegram:* @${telegramUsername.replace('@', '')}\n` +
                    `❓ *Problem:* ${problem}\n\n` +
                    `🆔 *User ID:* ${userData.id}`,
                    { parse_mode: 'Markdown' }
                );
                console.log('Telegram notification sent to admin');
            } catch (telegramError) {
                console.error('Failed to send Telegram notification:', telegramError);
            }
        }
        res.json({ 
            status: 'success',
            message: 'Help is on the way! We will contact you shortly.'
        });
    } catch (error) {
        console.error('Consultation endpoint error:', error);
        res.status(500).json({ 
            status: 'error',
            error: 'Failed to process request' 
        });
    }
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        status: 'error',
        error: 'Internal server error' 
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔒 Authentication enabled`);
    console.log(`📚 API endpoints protected`);
    console.log(`🌐 Static files served from /static`);
});
