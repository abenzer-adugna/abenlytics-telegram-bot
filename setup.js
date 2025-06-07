const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function initStorage() {
  // Create buckets if they don't exist
  const { data: buckets } = await supabase.storage.listBuckets();
  
  if (!buckets.some(b => b.name === 'books')) {
    await supabase.storage.createBucket('books', { public: true });
  }
  
  if (!buckets.some(b => b.name === 'uploads')) {
    await supabase.storage.createBucket('uploads', { public: true });
  }

  // Upload default books
  const books = JSON.parse(fs.readFileSync('./data/books.json'));
  for (const book of books) {
    const file = fs.readFileSync(`./data/books/${book.file}`);
    await supabase.storage
      .from('books')
      .upload(book.file, file);
  }
}

initStorage().then(() => console.log('✅ Storage initialized'));
