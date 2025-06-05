// Mobile menu toggle
document.getElementById('menuBtn').addEventListener('click', function() {
  const dropdownMenu = document.getElementById('dropdownMenu');
  dropdownMenu.classList.toggle('hidden');
});

// Close menu when clicking outside
document.addEventListener('click', function(event) {
  const dropdownMenu = document.getElementById('dropdownMenu');
  const menuBtn = document.getElementById('menuBtn');
  
  if (!dropdownMenu.contains(event.target) && event.target !== menuBtn) {
    dropdownMenu.classList.add('hidden');
  }
});

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

// Get Telegram user synchronously
function getTelegramUserSync() {
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
          username: user.username || ''
        };
      }
    } catch (e) {
      console.error('Error parsing Telegram user', e);
    }
  }
  return null;
}

// Service request handler
async function requestService(serviceType, data = null, formData = null) {
  try {
    let user, userName;
    
    if (serviceType === 'one_on_one' && data) {
      // Use provided data for 1-on-1 requests
      user = { id: data.userData.id };
      userName = data.userData.name;
    } else {
      // Get user for other services
      const telegramUser = await getTelegramUser() || {
        id: Math.floor(Math.random() * 1000000),
        first_name: "Test",
        last_name: "User"
      };
      
      user = telegramUser;
      userName = `${telegramUser.first_name} ${telegramUser.last_name}`.trim();
    }

    let response;
    
    if (serviceType === 'prospectus' && formData) {
      // File upload handling
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
      const body = serviceType === 'one_on_one' 
        ? { ...data } 
        : {
            userData: {
              id: user.id,
              name: userName
            }
          };
          
      response = await fetch(`/api/service/${serviceType}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
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

// Handle consultation request
function handleConsultationRequest() {
  const usernameInput = document.getElementById('telegram-username');
  const problemInput = document.getElementById('problem-description');
  
  const telegramUsername = usernameInput.value.trim();
  const problem = problemInput.value.trim();
  
  if (!telegramUsername || !problem) {
    alert('Please provide both your Telegram username and problem description');
    return;
  }
  
  // Get user data
  const user = getTelegramUserSync() || {
    id: Math.floor(Math.random() * 1000000),
    first_name: "User",
    last_name: ""
  };
  
  requestService('one_on_one', {
    telegramUsername,
    problem,
    userData: {
      id: user.id,
      name: `${user.first_name} ${user.last_name}`.trim() || "Anonymous User"
    }
  });
  
  // Reset form and close modal
  usernameInput.value = '';
  problemInput.value = '';
  document.getElementById('consultation-modal').classList.add('hidden');
}

// Prospectus upload handler
function handleProspectusUpload() {
  const fileInput = document.getElementById('prospectus-file');
  if (!fileInput.files.length) return alert('Please select a file');
  
  const formData = new FormData();
  formData.append('prospectus', fileInput.files[0]);
  requestService('prospectus', null, formData);
  
  // Reset form and close modal
  fileInput.value = '';
  document.getElementById('prospectus-modal').classList.add('hidden');
}

// Function to load books
async function loadBooks() {
  try {
    const booksContainer = document.getElementById('books-container');
    const toggleBtn = document.getElementById('toggle-books-btn');
    
    // Show loading state
    booksContainer.innerHTML = `
      <div class="text-center py-4">
        <i class="fas fa-spinner spinner text-cyan-400 text-xl"></i>
        <p class="mt-2">Loading books...</p>
      </div>
    `;
    booksContainer.classList.remove('hidden');
    
    // Fetch books
    const response = await fetch('/api/books');
    const result = await response.json();
    
    if (result.status === 'success') {
      // Render books
      booksContainer.innerHTML = result.books.map(book => `
        <div class="book-card">
          <h4 class="font-bold text-lg mb-2">${book.title}</h4>
          <div class="text-gray-400 mb-2">By ${book.author}</div>
          <p class="mb-3">${book.description}</p>
          <a href="/data/books/${book.file}" 
            class="btn-primary inline-block px-3 py-1 text-sm"
            download>
            <i class="fas fa-download mr-1"></i>Download
          </a>
        </div>
      `).join('');
      
      // Update button text
      toggleBtn.innerHTML = '<i class="fas fa-eye-slash mr-2"></i>Hide Books';
    } else {
      booksContainer.innerHTML = `
        <div class="text-center py-4 text-red-400">
          <i class="fas fa-exclamation-triangle text-xl mb-2"></i>
          <p>Failed to load books</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading books:', error);
    document.getElementById('books-container').innerHTML = `
      <div class="text-center py-4 text-red-400">
        <i class="fas fa-exclamation-triangle text-xl mb-2"></i>
        <p>Error loading books</p>
      </div>
    `;
  }
}

// Toggle books visibility
function toggleBooks() {
  const booksContainer = document.getElementById('books-container');
  const toggleBtn = document.getElementById('toggle-books-btn');
  
  if (booksContainer.classList.contains('hidden')) {
    // Load books if not loaded
    if (booksContainer.innerHTML === '') {
      loadBooks();
    } else {
      booksContainer.classList.remove('hidden');
      toggleBtn.innerHTML = '<i class="fas fa-eye-slash mr-2"></i>Hide Books';
    }
  } else {
    booksContainer.classList.add('hidden');
    toggleBtn.innerHTML = '<i class="fas fa-book mr-2"></i>Show Books';
  }
}

// Fetch live crypto data from CoinGecko
async function fetchCryptoData() {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,cardano&per_page=4');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Crypto data error:', error);
    return [];
  }
}

// Generate SVG path from price data
function generateSparklinePath(prices) {
  if (!prices || prices.length < 2) return '';
  
  const max = Math.max(...prices);
  const min = Math.min(...prices);
  const range = max - min || 1;
  
  const points = prices.map((price, i) => {
    const x = (i / (prices.length - 1)) * 300;
    const y = 80 - ((price - min) / range) * 70;
    return `${x},${y}`;
  });
  
  return `M${points.join(' L')}`;
}

// Update crypto prices
async function updateCryptoPrices() {
  try {
    const cryptoData = await fetchCryptoData();
    const container = document.getElementById('crypto-container');
    
    if (!cryptoData || cryptoData.length === 0) {
      container.innerHTML = `
        <div class="col-span-4 text-center py-10 text-red-400">
          <i class="fas fa-exclamation-triangle text-3xl mb-4"></i>
          <p>Failed to load crypto data. Please try again later.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = cryptoData.map(crypto => {
      const change = crypto.price_change_percentage_24h;
      const isUp = change >= 0;
      const iconClass = {
        bitcoin: 'fab fa-bitcoin text-yellow-400',
        ethereum: 'fab fa-ethereum text-purple-400',
        solana: 'fas fa-coins text-cyan-400',
        cardano: 'fas fa-chart-line text-blue-400'
      }[crypto.id] || 'fas fa-coins text-gray-400';
      
      // Generate sparkline path
      const sparklinePath = crypto.sparkline_in_7d?.price 
        ? generateSparklinePath(crypto.sparkline_in_7d.price.slice(0, 20))
        : '';
        
      return `
        <div class="crypto-card p-5" data-crypto="${crypto.id}">
          <div class="flex justify-between items-start mb-4">
            <div class="flex items-center">
              <div class="w-10 h-10 rounded-full bg-opacity-20 flex items-center justify-center mr-3">
                <i class="${iconClass} text-lg"></i>
              </div>
              <div>
                <h3 class="font-bold">${crypto.name}</h3>
                <div class="text-sm text-gray-400">${crypto.symbol.toUpperCase()}/USD</div>
              </div>
            </div>
            <div class="${isUp ? 'price-up' : 'price-down'} text-lg font-bold">
              $${crypto.current_price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </div>
          </div>
          
          <div class="flex justify-between items-center mb-3">
            <div class="text-sm">24h Change</div>
            <div class="${isUp ? 'price-up' : 'price-down'}">
              ${isUp ? '+' : ''}${change.toFixed(2)}% 
              <i class="fas fa-arrow-${isUp ? 'up' : 'down'} ml-1"></i>
            </div>
          </div>
          
          <div class="chart-container">
            <svg viewBox="0 0 300 80" class="w-full h-full">
              <path class="chart-line ${isUp ? 'chart-up' : 'chart-down'}" d="${sparklinePath}"></path>
            </svg>
          </div>
        </div>
      `;
    }).join('');
    
    // Update timestamp
    document.getElementById('crypto-updated').textContent = 
      `Updated: ${new Date().toLocaleTimeString()}`;
      
  } catch (error) {
    console.error('Crypto update error:', error);
  }
}

// Initialize services
document.addEventListener('DOMContentLoaded', () => {
  // Add service handlers
  document.querySelectorAll('[data-service]').forEach(button => {
    button.addEventListener('click', function() {
      const serviceType = button.dataset.service;
      
      if (serviceType === 'prospectus') {
        document.getElementById('prospectus-modal').classList.remove('hidden');
      } else if (serviceType === 'one_on_one') {
        document.getElementById('consultation-modal').classList.remove('hidden');
        
        // Pre-fill Telegram username if available
        const user = getTelegramUserSync();
        if (user && user.username) {
          document.getElementById('telegram-username').value = `@${user.username}`;
        }
      } else {
        requestService(serviceType);
      }
    });
  });
  
  // Book toggle button
  document.getElementById('toggle-books-btn').addEventListener('click', toggleBooks);
  
  // Prospectus modal handling
  document.getElementById('prospectus-submit').addEventListener('click', handleProspectusUpload);
  document.getElementById('prospectus-cancel').addEventListener('click', () => {
    document.getElementById('prospectus-modal').classList.add('hidden');
  });
  
  // Consultation modal handling
  document.getElementById('consultation-submit').addEventListener('click', handleConsultationRequest);
  document.getElementById('consultation-cancel').addEventListener('click', () => {
    document.getElementById('consultation-modal').classList.add('hidden');
  });
  
  // Crypto refresh button
  document.getElementById('refresh-crypto').addEventListener('click', () => {
    document.getElementById('refresh-crypto').classList.add('spinner');
    updateCryptoPrices().finally(() => {
      document.getElementById('refresh-crypto').classList.remove('spinner');
    });
  });
  
  // Load crypto data
  updateCryptoPrices();
  
  // Update crypto prices periodically
  setInterval(updateCryptoPrices, 60000);
  
  // Close modal when clicking outside
  document.addEventListener('click', (e) => {
    const modals = [
      'consultation-modal',
      'prospectus-modal'
    ];
    
    modals.forEach(id => {
      const modal = document.getElementById(id);
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  });
});
