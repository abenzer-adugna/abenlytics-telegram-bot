// Initialize Telegram user
async function getTelegramUser() {
  if (window.Telegram && window.Telegram.WebApp) {
    try {
      const initData = window.Telegram.WebApp.initData;
      if (initData) {
        const params = new URLSearchParams(initData);
        const user = JSON.parse(params.get('user'));
        return {
          id: user.id,
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          username: user.username || '',
          language_code: user.language_code || 'en'
        };
      }
    } catch (e) {
      console.error('Error parsing Telegram user', e);
    }
  }
  return null;
}

// Service request handler
async function requestService(serviceType, formData = null) {
  try {
    const user = await getTelegramUser() || {
      id: Math.floor(Math.random() * 1000000),
      first_name: "Test",
      last_name: "User"
    };
    
    let response;
    const userName = `${user.first_name} ${user.last_name}`.trim();
    
    if (serviceType === 'prospectus' && formData) {
      // Special handling for file upload
      formData.append('userData', JSON.stringify({
        id: user.id,
        name: userName
      }));
      
      response = await fetch('/api/service/prospectus', {
        method: 'POST',
        body: formData
      });
    } else {
      // Standard service request
      response = await fetch(`/api/service/${serviceType}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          userData: {
            id: user.id,
            name: userName
          }
        })
      });
    }
    
    const result = await response.json();
    
    if (result.status === 'success') {
      alert(`✅ ${serviceType.replace(/_/g, ' ')} request successful!`);
      if (serviceType === 'group_access' && result.link) {
        window.open(result.link, '_blank');
      }
    } else {
      alert(`❌ Error: ${result.message}`);
    }
    
    return result;
  } catch (error) {
    console.error('Service error:', error);
    alert('❌ Network error. Please try again.');
    return { status: 'error', message: 'Network error' };
  }
}

// Prospectus upload handler
function handleProspectusUpload() {
  const fileInput = document.getElementById('prospectus-file');
  if (!fileInput.files.length) return alert('Please select a file');
  
  const formData = new FormData();
  formData.append('prospectus', fileInput.files[0]);
  requestService('prospectus', formData);
  
  // Reset form and close modal
  fileInput.value = '';
  document.getElementById('prospectus-modal').classList.add('hidden');
}

// Load data services
async function loadServiceData(serviceType) {
  try {
    const response = await fetch(`/api/${serviceType}`);
    const result = await response.json();
    
    if (result.status === 'success') {
      // Render data in UI
      const container = document.getElementById(`${serviceType}-container`);
      if (container) {
        container.innerHTML = result[serviceType].map(item => {
          let content = `
            <div class="card p-6 mb-6">
              <h3 class="text-xl font-bold mb-2">${item.title}</h3>
              ${item.author ? `<div class="text-gray-400 mb-2">By ${item.author}</div>` : ''}
              ${item.date ? `<div class="text-sm text-gray-500 mb-3">${item.date}</div>` : ''}
              <p class="mb-4">${item.description || item.summary}</p>
          `;
          
          if (item.file) {
            content += `<a href="/data/${serviceType}/${item.file}" 
                          class="btn-primary inline-block px-4 py-2"
                          download>
                          <i class="fas fa-download mr-2"></i>Download
                        </a>`;
          }
          
          if (item.steps) {
            content += `<div class="mt-4">
                          <h4 class="font-bold mb-2">Key Steps:</h4>
                          <ul class="list-disc pl-5 space-y-1">`;
            item.steps.forEach(step => {
              content += `<li>${step}</li>`;
            });
            content += `</ul></div>`;
          }
          
          content += `</div>`;
          return content;
        }).join('');
      }
    }
  } catch (error) {
    console.error(`Error loading ${serviceType}:`, error);
  }
}

// Initialize services
document.addEventListener('DOMContentLoaded', () => {
  // Add service handlers
  document.querySelectorAll('[data-service]').forEach(button => {
    button.addEventListener('click', () => {
      const serviceType = button.dataset.service;
      
      if (serviceType === 'prospectus') {
        document.getElementById('prospectus-modal').classList.remove('hidden');
      } else {
        requestService(serviceType);
      }
    });
  });
  
  // Prospectus modal handling
  document.getElementById('prospectus-submit').addEventListener('click', handleProspectusUpload);
  document.getElementById('prospectus-cancel').addEventListener('click', () => {
    document.getElementById('prospectus-modal').classList.add('hidden');
  });
  
  // Load data-driven services
  ['books', 'reviews', 'newsletters', 'roadmaps'].forEach(service => {
    loadServiceData(service);
  });
  
  // Close modal when clicking outside
  document.addEventListener('click', (e) => {
    const modal = document.getElementById('prospectus-modal');
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });
});
