// File Upload Example
async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  });
  
  return response.json();
}

// Get Books from Supabase
async function getBooks() {
  const { data } = await supabase
    .storage
    .from('books')
    .createSignedUrls(['book1.pdf', 'book2.pdf'], 3600);
  
  return data;
}
