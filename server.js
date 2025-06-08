require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ dest: 'uploads/' });

// ======================
// SECURITY MIDDLEWARE
// ======================
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting (100 requests per 15 minutes)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
}));

// ======================
// API ENDPOINTS
// ======================

// 1. Get Books
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
        
        // Verify each book file exists
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

// 2. Get Roadmaps
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
        
        // Verify each roadmap file exists
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

// 3. Get Reviews
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

// 4. Group Access Service
app.post('/api/service/group_access', async (req, res) => {
    try {
        const { userData } = req.body;
        
        if (!userData?.id) {
            return res.status(400).json({ 
                status: 'error',
                error: 'User data required' 
            });
        }

        // In a real app, you would verify user and log this request
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

// 5. Newsletter Subscription
app.post('/api/service/newsletter', async (req, res) => {
    try {
        const { userData } = req.body;
        
        if (!userData?.id) {
            return res.status(400).json({ 
                status: 'error',
                error: 'User data required' 
            });
        }

        // In a real app, you would save to database here
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

// 6. Prospectus Service
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

        // In a real app, you would process the file here
        console.log(`Prospectus uploaded by user: ${userData.id}`);
        console.log(`File: ${req.file.originalname} (${req.file.size} bytes)`);
        
        // Clean up the uploaded file
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

// 7. 1-on-1 Consultation
app.post('/api/service/one_on_one', async (req, res) => {
    try {
        const { telegramUsername, problem, userData } = req.body;
        
        if (!telegramUsername || !problem || !userData?.id) {
            return res.status(400).json({ 
                status: 'error',
                error: 'All fields are required' 
            });
        }

        // In a real app, you would save this request to a database
        console.log(`New consultation request from: ${telegramUsername}`);
        console.log(`Problem: ${problem}`);
        console.log(`User ID: ${userData.id}`);
        
        res.json({ 
            status: 'success',
            message: 'Consultation request received'
        });
    } catch (error) {
        console.error('Consultation error:', error);
        res.status(500).json({ 
            status: 'error',
            error: error.message 
        });
    }
});

// ======================
// STATIC FILE SERVING
// ======================
app.use('/books', express.static(path.join(__dirname, 'public', 'books'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.pdf')) {
            res.set('Content-Type', 'application/pdf');
        }
    }
}));

app.use('/roadmaps', express.static(path.join(__dirname, 'public', 'roadmaps')));

// Serve other static files
app.use(express.static(path.join(__dirname, 'public')));

// Fallback route for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error Handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        status: 'error',
        error: 'Something broke!' 
    });
});

// Server Initialization
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
