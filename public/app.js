document.addEventListener('DOMContentLoaded', function() {
    // =====================================================
    // DOM Elements
    // =====================================================
    const menuBtn = document.getElementById('menuBtn');
    const dropdownMenu = document.getElementById('dropdownMenu');
    const toggleBooksBtn = document.getElementById('toggle-books-btn');
    const booksContainer = document.getElementById('books-container');
    const reviewsBtn = document.getElementById('reviews-btn');
    const roadmapsBtn = document.getElementById('roadmaps-btn');
    const closeReviewModal = document.getElementById('close-review-modal');
    const reviewModal = document.getElementById('review-modal');
    const refreshCryptoBtn = document.getElementById('refresh-crypto');
    const cryptoContainer = document.getElementById('crypto-container');
    const cryptoUpdated = document.getElementById('crypto-updated');
    const consultationSubmitBtn = document.getElementById('consultation-submit');
    const learnMoreBtn = document.getElementById('learn-more-btn');
const aboutModal = document.getElementById('about-modal');
const closeAboutModal = document.getElementById('close-about-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
    
    // =====================================================
    // Initialize Event Listeners
    // =====================================================
    
    // Mobile menu toggle
    if (menuBtn && dropdownMenu) {
        menuBtn.addEventListener('click', () => {
            dropdownMenu.classList.toggle('hidden');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (event) => {
            if (!dropdownMenu.contains(event.target) && event.target !== menuBtn) {
                dropdownMenu.classList.add('hidden');
            }
        });
    }

    // Books toggle button
    if (toggleBooksBtn) {
        toggleBooksBtn.addEventListener('click', toggleBooks);
    }

    // Reviews button
    if (reviewsBtn) {
        reviewsBtn.addEventListener('click', loadReviews);
    }

    // Roadmaps button
    if (roadmapsBtn) {
        roadmapsBtn.addEventListener('click', loadRoadmaps);
    }

    // Review modal close button
    if (closeReviewModal && reviewModal) {
        closeReviewModal.addEventListener('click', () => {
            reviewModal.classList.add('hidden');
        });
    }

    // Crypto refresh button
    if (refreshCryptoBtn) {
        refreshCryptoBtn.addEventListener('click', () => {
            refreshCryptoBtn.classList.add('spinner');
            updateCryptoPrices().finally(() => {
                refreshCryptoBtn.classList.remove('spinner');
            });
        });
    }
    if (learnMoreBtn) {
    learnMoreBtn.addEventListener('click', () => {
        aboutModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
    });
}

[closeAboutModal, modalCloseBtn].forEach(btn => {
    if (btn) {
        btn.addEventListener('click', () => {
            aboutModal.classList.add('hidden');
            document.body.style.overflow = ''; // Restore scrolling
        });
    }
});


    // Initialize service handlers
    initializeServiceHandlers();
    
    // Initialize modals
    initializeModals();
    
    // Initialize crypto
    initializeCrypto();
    
    // =====================================================
    // Core Functions
    // =====================================================
    
    // Toggle books visibility
    function toggleBooks() {
        if (booksContainer.classList.contains('hidden')) {
            loadBooks();
        } else {
            booksContainer.classList.add('hidden');
            toggleBooksBtn.innerHTML = '<i class="fas fa-book mr-2"></i>Show Books';
        }
    }

    // Load books function
    async function loadBooks() {
        try {
            console.log('Loading books...');
            
            // Show loading state
            booksContainer.innerHTML = `
                <div class="books-loading">
                    <i class="fas fa-spinner spinner text-cyan-400 text-3xl mb-4"></i>
                    <p>Loading investment books...</p>
                </div>
            `;
            booksContainer.classList.remove('hidden');
            
            // Fetch books from API
            const response = await fetch('/api/books');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.status === 'success' && result.books && result.books.length > 0) {
                // Render books
                booksContainer.innerHTML = `
                    <div class="book-grid">
                        ${result.books.map(book => `
                            <div class="book-card">
                                <div class="book-cover">
                                    <i class="fas fa-book-open text-white text-5xl opacity-80"></i>
                                </div>
                                <h4 class="font-bold text-lg mb-2">${book.title}</h4>
                                <div class="text-gray-400 mb-2">By ${book.author || 'Unknown Author'}</div>
                                <p class="mb-3 text-gray-300">${book.description || book.note || 'No description available'}</p>
                                <a href="${book.url}" 
                                    class="btn-primary inline-block px-3 py-1 text-sm"
                                    target="_blank">
                                    <i class="fas fa-download mr-1"></i>Download
                                </a>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                throw new Error(result.error || 'No books found');
            }
            
            // Update button text
            toggleBooksBtn.innerHTML = '<i class="fas fa-eye-slash mr-2"></i>Hide Books';
        } catch (error) {
            console.error('Book loading failed:', error);
            booksContainer.innerHTML = `
                <div class="books-error">
                    <i class="fas fa-exclamation-triangle text-red-400 text-xl mb-2"></i>
                    <p class="text-red-300">Error loading books: ${error.message}</p>
                    <button class="mt-3 btn-primary px-3 py-1 text-sm" onclick="loadBooks()">
                        <i class="fas fa-sync-alt mr-1"></i>Try Again
                    </button>
                </div>
            `;
        }
    }

    // Initialize service handlers
    function initializeServiceHandlers() {
        document.querySelectorAll('[data-service]').forEach(button => {
            button.addEventListener('click', function() {
                const serviceType = this.dataset.service;
                
                if (serviceType === 'prospectus') {
                    document.getElementById('prospectus-modal').classList.remove('hidden');
                } else if (serviceType === 'one_on_one') {
                    document.getElementById('consultation-modal').classList.remove('hidden');
                    
                    // Pre-fill Telegram username if available
                    const user = getTelegramUserSync();
                    if (user && user.username) {
                        document.getElementById('telegram-username').value = `@${user.username}`;
                    }
                } else if (serviceType === 'newsletter') {
                    subscribeNewsletter();
                } else if (serviceType === 'group_access') {
                    requestGroupAccess();
                }
            });
        });
    }

    // Initialize modals
    function initializeModals() {
        // Prospectus modal handling
        document.getElementById('prospectus-submit')?.addEventListener('click', handleProspectusUpload);
        document.getElementById('prospectus-cancel')?.addEventListener('click', () => {
            document.getElementById('prospectus-modal').classList.add('hidden');
        });
        
        // Consultation modal handling (updated)
        if (consultationSubmitBtn) {
            consultationSubmitBtn.addEventListener('click', handleConsultationRequest);
        }
        document.getElementById('consultation-cancel')?.addEventListener('click', () => {
            document.getElementById('consultation-modal').classList.add('hidden');
        });
        
        // Close modal when clicking outside
        document.addEventListener('click', (e) => {
            const modals = [
                'consultation-modal',
                'prospectus-modal',
                'review-modal'
            ];
            
            modals.forEach(id => {
                const modal = document.getElementById(id);
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });
    }
aboutModal?.addEventListener('click', (e) => {
    if (e.target === aboutModal) {
        aboutModal.classList.add('hidden');
        document.body.style.overflow = '';
    }
});
    // Initialize crypto
    function initializeCrypto() {
        updateCryptoPrices();
        // Refresh crypto prices every 60 seconds
        setInterval(updateCryptoPrices, 60000);
    }

    // =====================================================
    // Service Functions
    // =====================================================
    
    // Telegram user functions
    function getTelegramUserSync() {
        if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
            const user = window.Telegram.WebApp.initDataUnsafe.user;
            return {
                id: user.id,
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                username: user.username || ''
            };
        }
        return null;
    }

    async function getTelegramUser() {
        return new Promise((resolve) => {
            if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
                const user = window.Telegram.WebApp.initDataUnsafe.user;
                resolve({
                    id: user.id,
                    first_name: user.first_name || '',
                    last_name: user.last_name || '',
                    username: user.username || ''
                });
            } else {
                resolve({
                    id: Math.floor(Math.random() * 1000000),
                    first_name: "User",
                    last_name: ""
                });
            }
        });
    }

    // Handle consultation request (updated)
    async function handleConsultationRequest() {
        const nameInput = document.getElementById('user-name');
        const usernameInput = document.getElementById('telegram-username');
        const problemInput = document.getElementById('problem-description');
        
        const name = nameInput.value.trim();
        const telegramUsername = usernameInput.value.trim();
        const problem = problemInput.value.trim();
        
        // Validate inputs
        if (!name || !telegramUsername || !problem) {
            alert('Please fill in all fields');
            return;
        }

        try {
            // Show loading state
            const submitBtn = document.getElementById('consultation-submit');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner spinner"></i> Sending...';
            
            // Get user data (Telegram or fallback)
            const user = await getTelegramUser();
            
            // Send to server
            const response = await fetch('/api/service/one_on_one', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    name,
                    telegramUsername,
                    problem,
                    userData: {
                        id: user.id,
                        name: `${user.first_name} ${user.last_name}`.trim() || name
                    }
                })
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                // Show success message
                alert('✅ Help is on the way! Our team will contact you shortly on Telegram.\n\nWe\'re happy to help!');
                
                // Reset form
                nameInput.value = '';
                usernameInput.value = '';
                problemInput.value = '';
                document.getElementById('consultation-modal').classList.add('hidden');
            } else {
                throw new Error(result.message || 'Failed to send request');
            }
        } catch (error) {
            console.error('Consultation error:', error);
            alert(`❌ Error: ${error.message}`);
        } finally {
            // Reset button state
            const submitBtn = document.getElementById('consultation-submit');
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Get Help';
        }
    }

    // Prospectus upload handler
    async function handleProspectusUpload() {
        const fileInput = document.getElementById('prospectus-file');
        if (!fileInput.files.length) {
            alert('Please select a file');
            return;
        }
        
        try {
            const user = await getTelegramUser();
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            formData.append('userData', JSON.stringify({
                id: user.id,
                name: `${user.first_name} ${user.last_name}`.trim() || "Anonymous User"
            }));
            
            const response = await fetch('/api/service/prospectus', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                alert('✅ Prospectus submitted successfully!');
                // Reset form and close modal
                fileInput.value = '';
                document.getElementById('prospectus-modal').classList.add('hidden');
            } else {
                throw new Error(result.message || 'Upload failed');
            }
        } catch (error) {
            console.error('Prospectus upload error:', error);
            alert(`❌ Error: ${error.message}`);
        }
    }

    // Load reviews
    async function loadReviews() {
        try {
            const modal = document.getElementById('review-modal');
            const container = document.getElementById('reviews-container');
            
            if (!modal || !container) return;
            
            // Show loading state
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-spinner spinner text-cyan-400 text-2xl"></i>
                    <p class="mt-2">Loading reviews...</p>
                </div>
            `;
            modal.classList.remove('hidden');
            
            // Fetch reviews from API
            const response = await fetch('/api/reviews');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.status === 'success' && result.reviews && result.reviews.length > 0) {
                // Render reviews
                container.innerHTML = result.reviews.map(review => `
                    <div class="bg-gray-700 p-4 rounded-lg">
                        <div class="flex justify-between items-start mb-2">
                            <h4 class="font-bold text-lg">${review.bookTitle}</h4>
                            <span class="text-sm text-gray-400">${review.date || 'No date'}</span>
                        </div>
                        <div class="flex items-center mb-3">
                            ${'★'.repeat(review.rating || 0)}${'☆'.repeat(5 - (review.rating || 0))}
                            <span class="ml-2 text-yellow-400">${review.rating || 0}/5</span>
                        </div>
                        <p class="mb-3"><strong class="text-cyan-300">Summary:</strong> ${review.summary || 'No summary available'}</p>
                        <div>
                            <strong class="text-cyan-300">Key Insights:</strong>
                            <ul class="list-disc list-inside mt-1">
                                ${(review.keyInsights || ['No insights available']).map(insight => `<li>${insight}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                `).join('');
            } else {
                throw new Error(result.error || 'No reviews found');
            }
        } catch (error) {
            console.error('Review loading error:', error);
            const container = document.getElementById('reviews-container');
            if (container) {
                container.innerHTML = `
                    <div class="text-center py-8 text-red-400">
                        <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                        <p>Error loading reviews: ${error.message}</p>
                        <button class="mt-4 btn-primary px-4 py-2" onclick="loadReviews()">
                            <i class="fas fa-sync-alt mr-2"></i>Retry
                        </button>
                    </div>
                `;
            }
        }
    }

    // Load roadmaps
    async function loadRoadmaps() {
        try {
            // Fetch roadmaps from API
            const response = await fetch('/api/roadmaps');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.status === 'success' && result.roadmaps && result.roadmaps.length > 0) {
                // Create download links
                const roadmapLinks = result.roadmaps.map(r => 
                    `<li class="mb-3"><a href="${r.url}" class="text-cyan-400 hover:underline font-medium" download>${r.title}</a></li>`
                ).join('');
                
                // Show modal with download links
                const modal = document.createElement('div');
                modal.className = 'fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4';
                modal.innerHTML = `
                    <div class="bg-gray-800 rounded-lg w-full max-w-md p-6">
                        <h3 class="text-xl font-bold mb-4">Available Roadmaps</h3>
                        <ul class="list-disc pl-5">
                            ${roadmapLinks}
                        </ul>
                        <div class="mt-4 flex justify-end">
                            <button class="btn-primary px-4 py-2" onclick="this.parentElement.parentElement.parentElement.remove()">
                                Close
                            </button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            } else {
                throw new Error(result.error || 'No roadmaps found');
            }
        } catch (error) {
            console.error('Roadmap loading error:', error);
            alert(`Error loading roadmaps: ${error.message}`);
        }
    }

    // Newsletter subscription
    async function subscribeNewsletter() {
        try {
            const user = await getTelegramUser();
            
            const response = await fetch('/api/service/newsletter', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    userData: {
                        id: user.id,
                        name: `${user.first_name} ${user.last_name}`.trim() || "Anonymous"
                    }
                })
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                alert('🎉 You have successfully subscribed to our newsletter!');
            } else {
                throw new Error(result.message || 'Subscription failed');
            }
        } catch (error) {
            console.error('Newsletter subscription error:', error);
            alert(`❌ Error: ${error.message}`);
        }
    }

    // Group access request
    async function requestGroupAccess() {
        try {
            const user = await getTelegramUser();
            
            const response = await fetch('/api/service/group_access', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    userData: {
                        id: user.id,
                        name: `${user.first_name} ${user.last_name}`.trim() || "Anonymous"
                    }
                })
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                if (result.link) {
                    window.open(result.link, '_blank');
                } else {
                    alert('✅ Group access request received!');
                }
            } else {
                throw new Error(result.message || 'Request failed');
            }
        } catch (error) {
            console.error('Group access error:', error);
            alert(`❌ Error: ${error.message}`);
        }
    }

  // ... existing code above ...

    // =====================================================
    // Updated Crypto Functions with Free Lifetime Access
    // =====================================================
    
    // Fetch crypto data from Binance (free, no API key needed)
    async function fetchCryptoData() {
        try {
            // First try Binance API (fast and reliable)
            const response = await fetch(
                'https://api.binance.com/api/v3/ticker/24hr?symbols=["BTCUSDT","ETHUSDT","SOLUSDT","ADAUSDT"]'
            );
            
            if (!response.ok) {
                throw new Error(`Binance API error: ${response.status}`);
            }
            
            const binanceData = await response.json();
            
            // Map Binance data to match CoinGecko format
            return binanceData.map(coin => {
                const symbol = coin.symbol.replace('USDT', '').toLowerCase();
                return {
                    id: symbol,
                    name: symbol.charAt(0).toUpperCase() + symbol.slice(1),
                    symbol: symbol.toUpperCase(),
                    current_price: parseFloat(coin.lastPrice),
                    price_change_percentage_24h: parseFloat(coin.priceChangePercent),
                    // Add sparkline data from Binance
                    sparkline_in_7d: {
                        price: coin.weightedAvgPrice ? 
                            Array(7).fill(parseFloat(coin.weightedAvgPrice)) : 
                            Array(7).fill(parseFloat(coin.lastPrice))
                    }
                };
            });
            
        } catch (binanceError) {
            console.warn('Binance failed, trying CoinGecko...', binanceError);
            
            try {
                // Fallback to CoinGecko if Binance fails
                const geckoResponse = await fetch(
                    'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,cardano&per_page=4'
                );
                
                if (!geckoResponse.ok) {
                    throw new Error(`CoinGecko API error: ${geckoResponse.status}`);
                }
                
                return await geckoResponse.json();
                
            } catch (geckoError) {
                console.error('All crypto APIs failed:', geckoError);
                return [];
            }
        }
    }

    // Update crypto prices
    async function updateCryptoPrices() {
        try {
            // Show loading state
            cryptoContainer.innerHTML = `
                <div class="col-span-4 text-center py-10">
                    <i class="fas fa-spinner spinner text-cyan-400 text-3xl mb-4"></i>
                    <p>Loading crypto data...</p>
                </div>
            `;
            
            const cryptoData = await fetchCryptoData();
            
            if (!cryptoData || cryptoData.length === 0) {
                throw new Error('No crypto data received');
            }
            
            cryptoContainer.innerHTML = cryptoData.map(crypto => {
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
                    ? generateSparklinePath(crypto.sparkline_in_7d.price)
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
                                    <div class="text-sm text-gray-400">${crypto.symbol}/USD</div>
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
            cryptoUpdated.textContent = `Updated: ${new Date().toLocaleTimeString()}`;
            
        } catch (error) {
            console.error('Crypto update error:', error);
            cryptoContainer.innerHTML = `
                <div class="col-span-4 text-center py-10 text-red-400">
                    <i class="fas fa-exclamation-triangle text-3xl mb-4"></i>
                    <p>Error loading crypto data: ${error.message}</p>
                    <button class="mt-4 btn-primary px-4 py-2" onclick="updateCryptoPrices()">
                        <i class="fas fa-sync-alt mr-2"></i>Retry
                    </button>
                </div>
            `;
        }
    }

// ... existing code below ...
