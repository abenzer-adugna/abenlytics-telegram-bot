require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ========================
// Middleware
// ========================
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));

// ========================
// Serve Static Files (Frontend)
// ========================
app.use(express.static(path.join(__dirname, 'public')));

// ========================
// API Endpoints (Backend)
// ========================
// Books endpoint
app.get('/api/books', (req, res) => {
  try {
    const booksPath = path.join(__dirname, 'public', 'data', 'books.json');
    const books = require(booksPath);
    
    res.json({
      status: 'success',
      books: books.map(book => ({
        ...book,
        url: `${req.protocol}://${req.get('host')}/books/${encodeURIComponent(book.file)}`
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load books' });
  }
});

// Serve PDFs with correct headers
app.get('/books/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'books', req.params.filename);
  res.type('application/pdf');
  res.download(filePath);
});

// ========================
// Handle SPA Routing
// ========================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ========================
// Start Server
// ========================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebApp URL: ${process.env.WEBAPP_URL || `http://localhost:${PORT}`}`);
});
