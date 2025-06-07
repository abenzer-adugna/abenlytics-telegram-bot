const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function migrateFiles() {
  const directories = ['books', 'newsletters', 'prospectus'];
  
  for (const dir of directories) {
    const files = fs.readdirSync(`./data/${dir}`);
    
    for (const file of files) {
      const fileData = fs.readFileSync(`./data/${dir}/${file}`);
      await supabase.storage
        .from(dir)
        .upload(file, fileData);
      
      console.log(`Uploaded ${dir}/${file}`);
    }
  }
}

migrateFiles();
