const { initDataFiles } = require('./server');
const fs = require('fs');
const path = require('path');

// Initialize data files
initDataFiles();

// Create placeholder files
const dataDirs = [
  'books',
  'newsletters',
  'roadmaps',
  'prospectus'
];

dataDirs.forEach(dir => {
  const fullPath = path.join(__dirname, 'data', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Create placeholder PDFs
const placeholderText = 'This is a placeholder file. Replace with actual content.';
const placeholders = {
  books: [
    'the_intelligent_investor.pdf',
    'random_walk.pdf'
  ],
  newsletters: [
    'newsletter_q1_2025.pdf'
  ],
  roadmaps: [
    'long_term_roadmap.pdf'
  ]
};

Object.entries(placeholders).forEach(([dir, files]) => {
  files.forEach(file => {
    const filePath = path.join(__dirname, 'data', dir, file);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, placeholderText);
    }
  });
});

console.log('✅ Data files and placeholders initialized successfully');
