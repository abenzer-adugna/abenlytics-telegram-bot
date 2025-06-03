// public/app.js

// ... existing code ...

// Service request handler with better error handling
async function requestService(serviceType, formData = null) {
  if (!userData?.id) {
    alert('Please open this app in Telegram to use our services.');
    return;
  }

  try {
    // Add form data to userData if provided
    const requestData = {
      serviceType,
      userData: formData ? {...userData, ...formData} : userData
    };

    const response = await fetch('/api/service', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(requestData)
    });

    // Handle HTTP errors
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.status === 'success') {
      alert('✅ Request successful! Check your Telegram for confirmation.');
    } else {
      throw new Error(result.message || 'Service request failed');
    }
  } catch (err) {
    console.error('Service request error:', err);
    alert(`❌ Error: ${err.message}`);
  }
}

// ... existing code ...
// Toggle mobile menu
document.getElementById('menuBtn').addEventListener('click', function() {
  const dropdownMenu = document.getElementById('dropdownMenu');
  dropdownMenu.classList.toggle('hidden');
});

// Initialize Telegram Web App
let userData = null;
const tg = window.Telegram?.WebApp;

if (tg) {
  tg.expand();
  tg.enableClosingConfirmation();
  
  // Get user data from Telegram
  userData = {
    id: tg.initDataUnsafe.user?.id,
    firstName: tg.initDataUnsafe.user?.first_name,
    lastName: tg.initDataUnsafe.user?.last_name,
    username: tg.initDataUnsafe.user?.username
  };
  
  // Update UI for Telegram users
  if (userData.id) {
    document.getElementById('userStatus').classList.remove('hidden');
    document.getElementById('welcomeMessage').textContent = `📊 Welcome ${userData.firstName || ''}!`;
  }
}

// Fetch crypto prices
async function fetchCryptoPrices() {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana&per_page=3');
    const data = await response.json();
    
    let cryptoHTML = '';
    data.forEach(crypto => {
      const changeClass = crypto.price_change_percentage_24h >= 0 ? 
        'text-green-500' : 'text-red-500';
      const changeIcon = crypto.price_change_percentage_24h >= 0 ? '▲' : '▼';
      
      cryptoHTML += `
        <div class="bg-gray-50 p-4 rounded-lg shadow-sm">
          <div class="flex items-center">
            <img src="${crypto.image}" alt="${crypto.name}" class="w-8 h-8 mr-3">
            <h4 class="font-semibold">${crypto.name}</h4>
          </div>
          <p class="mt-2 text-lg font-semibold">$${crypto.current_price.toLocaleString()}</p>
          <p class="${changeClass}">
            ${changeIcon} ${crypto.price_change_percentage_24h.toFixed(2)}%
          </p>
        </div>
      `;
    });
    
    document.getElementById('cryptoFeed').innerHTML = cryptoHTML;
  } catch (error) {
    console.error('Failed to fetch crypto prices:', error);
    document.getElementById('cryptoFeed').innerHTML = `
      <div class="md:col-span-3 text-center py-8 text-red-500">
        Could not load crypto prices. Please try again later.
      </div>
    `;
  }
}

// Service request handler
async function requestService(serviceType, formData = null) {
  if (!userData?.id) {
    alert('Please open this app in Telegram to use our services.');
    return;
  }

  try {
    // Add form data to userData if provided
    const requestData = {
      serviceType,
      userData: formData ? {...userData, ...formData} : userData
    };

    const response = await fetch('/api/service', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(requestData)
    });

    const result = await response.json();
    
    if (result.status === 'success') {
      alert('✅ Request successful! Check your Telegram for confirmation.');
    } else {
      alert('❌ Error: ' + (result.message || 'Service request failed'));
    }
  } catch (error) {
    console.error('Service request error:', error);
    alert('❌ Network error. Please try again.');
  }
}

// Setup service buttons
document.getElementById('bookDownloadBtn').addEventListener('click', () => {
  requestService('book_download');
});

document.getElementById('newsletterBtn').addEventListener('click', () => {
  requestService('newsletter');
});

// 1-on-1 consultation modal
const oneOnOneModal = document.getElementById('oneOnOneModal');
const consultationForm = document.getElementById('consultationForm');

document.getElementById('oneOnOneBtn').addEventListener('click', () => {
  if (!userData?.id) {
    alert('Please open this app in Telegram to request a consultation.');
    return;
  }
  oneOnOneModal.classList.remove('hidden');
});

document.getElementById('cancelConsultation').addEventListener('click', () => {
  oneOnOneModal.classList.add('hidden');
});

consultationForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const formData = {
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    topic: document.getElementById('topic').value
  };
  
  oneOnOneModal.classList.add('hidden');
  requestService('one_on_one', formData);
});

// Close modal when clicking outside
oneOnOneModal.addEventListener('click', (e) => {
  if (e.target === oneOnOneModal) {
    oneOnOneModal.classList.add('hidden');
  }
});

// Initialize crypto prices and service buttons
document.addEventListener('DOMContentLoaded', () => {
  fetchCryptoPrices();
  
  // Auto-refresh prices every 60 seconds
  setInterval(fetchCryptoPrices, 60000);
});
