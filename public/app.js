// Toggle mobile menu
document.getElementById('menuBtn')?.addEventListener('click', function() {
  const dropdownMenu = document.getElementById('dropdownMenu');
  if (dropdownMenu) {
    dropdownMenu.classList.toggle('hidden');
  }
});

// Initialize Telegram Web App
let userData = null;

try {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.expand();
    tg.enableClosingConfirmation();
    userData = tg.initDataUnsafe?.user || {};
  }
} catch (e) {
  console.error('Telegram init error:', e);
}

// Service request handler
async function requestService(serviceType, formData = null) {
  try {
    // Basic validation
    if (!serviceType) {
      alert('Missing service type');
      return;
    }
    
    // Prepare request data
    const requestData = {
      serviceType,
      userData: {
        id: userData?.id || 'unknown',
        ...formData
      }
    };
    
    console.log('Request data:', requestData);
    
    // Send request
    const response = await fetch('/api/service', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }
    
    const result = await response.json();
    alert(result.status === 'success' 
      ? '✅ Request successful!' 
      : '❌ Request failed');
  } catch (err) {
    console.error('Request error:', err);
    alert(`❌ Error: ${err.message || 'Request failed'}`);
  }
}

// Service button handlers
document.querySelectorAll('[data-service]').forEach(button => {
  button.addEventListener('click', () => {
    const serviceType = button.dataset.service;
    
    if (serviceType === 'one_on_one') {
      // For 1-on-1, show form and handle separately
      document.getElementById('consultationModal').classList.remove('hidden');
    } else {
      requestService(serviceType);
    }
  });
});

// Consultation form handler
document.getElementById('consultationForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const formData = {
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    topic: document.getElementById('topic').value
  };
  
  document.getElementById('consultationModal').classList.add('hidden');
  requestService('one_on_one', formData);
});

// Close modal
document.getElementById('cancelConsultation')?.addEventListener('click', () => {
  document.getElementById('consultationModal').classList.add('hidden');
});

// Initialize crypto prices
try {
  // ... (your existing crypto price code) ...
} catch (e) {
  console.error('Crypto init error:', e);
}
