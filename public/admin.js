// public/admin.js
document.addEventListener('DOMContentLoaded', function() {
  // Toggle mobile sidebar
  document.getElementById('sidebarToggle').addEventListener('click', function() {
    document.querySelector('.sidebar').classList.toggle('hidden');
    document.querySelector('.sidebar').classList.toggle('md:flex');
  });
  
  // Navigation active state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function() {
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      this.classList.add('active');
      
      // Scroll to section
      const targetId = this.querySelector('a').getAttribute('href');
      document.querySelector(targetId).scrollIntoView({ behavior: 'smooth' });
    });
  });
  
  // File upload interaction
  const fileInput = document.querySelector('input[type="file"]');
  if (fileInput) {
    const fileUploadArea = fileInput.closest('label');
    
    fileInput.addEventListener('change', function() {
      if (this.files.length > 0) {
        fileUploadArea.innerHTML = `
          <div class="flex flex-col items-center justify-center h-full p-4">
            <i class="fas fa-file text-3xl text-green-500 mb-2"></i>
            <p class="text-sm font-medium">${this.files[0].name}</p>
            <p class="text-xs text-gray-500">${formatFileSize(this.files[0].size)}</p>
          </div>
        `;
      }
    });
    
    function formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
  }
  
  // Handle file downloads
  document.querySelectorAll('.file-download').forEach(btn => {
    btn.addEventListener('click', function() {
      const fileName = this.closest('tr').querySelector('td:first-child div:first-child').textContent;
      alert(`Downloading: ${fileName}`);
    });
  });
  
  // Handle file deletion
  document.querySelectorAll('.file-delete').forEach(btn => {
    btn.addEventListener('click', function() {
      const fileName = this.closest('tr').querySelector('td:first-child div:first-child').textContent;
      if (confirm(`Are you sure you want to delete ${fileName}?`)) {
        this.closest('tr').remove();
        alert(`${fileName} has been deleted`);
      }
    });
  });
  
  // Newsletter sending
  const sendNewsletterBtn = document.querySelector('.send-newsletter');
  if (sendNewsletterBtn) {
    sendNewsletterBtn.addEventListener('click', function() {
      const subject = document.querySelector('#newsletter-subject').value;
      if (!subject) {
        alert('Please enter a subject for your newsletter');
        return;
      }
      
      alert(`Newsletter "${subject}" sent to subscribers!`);
    });
  }
  
  // File upload submission
  const uploadBtn = document.querySelector('.upload-file-btn');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', function() {
      const fileInput = document.querySelector('input[type="file"]');
      if (!fileInput.files.length) {
        alert('Please select a file to upload');
        return;
      }
      
      const title = document.querySelector('#file-title').value;
      const description = document.querySelector('#file-description').value;
      
      alert(`File "${title}" uploaded successfully!`);
    });
  }
});
