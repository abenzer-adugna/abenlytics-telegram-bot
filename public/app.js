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
            
            if (result.status === 'success') {
                // Render books
                booksContainer.innerHTML = `
                    <div class="book-grid">
                        ${result.books.map(book => `
                            <div class="book-card">
                                <div class="book-cover">
                                    <i class="fas fa-book-open text-white text-5xl opacity-80"></i>
                                </div>
                                <h4 class="font-bold text-lg mb-2">${book.title}</h4>
                                <div class="text-gray-400 mb-2">By ${book.author}</div>
                                <p class="mb-3 text-gray-300">${book.description}</p>
                                <a href="${book.url}" 
                                    class="btn-primary inline-block px-3 py-1 text-sm"
                                    download="${book.title.replace(/ /g, '-')}.pdf">
                                    <i class="fas fa-download mr-1"></i>Download
                                </a>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                throw new Error(result.error || 'Invalid response format');
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
                    requestService('group_access');
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
        
        // Consultation modal handling
        document.getElementById('consultation-submit')?.addEventListener('click', handleConsultationRequest);
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

    // Initialize crypto
    function initializeCrypto() {
        updateCryptoPrices();
        // Refresh crypto prices every 60 seconds
        setInterval(updateCryptoPrices, 60000);
    }

    // =====================================================
    // Additional Functions
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

    // Service request handler
    async function requestService(serviceType, data = null) {
        try {
            let user, userName;
            
            if (serviceType === 'one_on_one' && data) {
                user = { id: data.userData.id };
                userName = data.userData.name;
            } else {
                const telegramUser = await getTelegramUser();
                user = telegramUser;
                userName = `${telegramUser.first_name} ${telegramUser.last_name}`.trim();
            }

            const body = serviceType === 'one_on_one' 
                ? { ...data } 
                : {
                    userData: {
                        id: user.id,
                        name: userName
                    }
                };
            
            const response = await fetch(`/api/service/${serviceType}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(body)
            });
            
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
        
        // Get user data
        const user = getTelegramUserSync() || {
            id: Math.floor(Math.random() * 1000000),
            first_name: "User",
            last_name: ""
        };
        
        // In a real app, this would upload to your server
        alert('Prospectus submitted successfully! Our team will review it shortly.');
        
        // Reset form and close modal
        fileInput.value = '';
        document.getElementById('prospectus-modal').classList.add('hidden');
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
            const result = await response.json();
            
            if (result.status === 'success') {
                // Render reviews
                container.innerHTML = result.reviews.map(review => `
                    <div class="bg-gray-700 p-4 rounded-lg">
                        <div class="flex justify-between items-start mb-2">
                            <h4 class="font-bold text-lg">${review.bookTitle}</h4>
                            <span class="text-sm text-gray-400">${review.date}</span>
                        </div>
                        <div class="flex items-center mb-3">
                            ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                            <span class="ml-2 text-yellow-400">${review.rating}/5</span>
                        </div>
                        <p class="mb-3"><strong class="text-cyan-300">Summary:</strong> ${review.summary}</p>
                        <div>
                            <strong class="text-cyan-300">Key Insights:</strong>
                            <ul class="list-disc list-inside mt-1">
                                ${review.keyInsights.map(insight => `<li>${insight}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                `).join('');
            } else {
                throw new Error(result.error || 'Failed to load reviews');
            }
        } catch (error) {
            console.error('Review loading error:', error);
            const container = document.getElementById('reviews-container');
            if (container) {
                container.innerHTML = `
                    <div class="text-center py-8 text-red-400">
                        <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                        <p>Error loading reviews. Please try again.</p>
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
            const result = await response.json();
            
            if (result.status === 'success') {
                // Create download links
                const roadmapLinks = result.roadmaps.map(r => 
                    `<li class="mb-3"><a href="${r.url}" class="text-cyan-400 hover:underline font-medium" download>${r.title}</a></li>`
                ).join('');
                
                // Show alert with download links
                alert(`
                    <div class="text-left p-4">
                        <h3 class="text-lg font-bold mb-3">Available Roadmaps:</h3>
                        <ul class="list-disc pl-5">
                            ${roadmapLinks}
                        </ul>
                    </div>
                `);
            } else {
                throw new Error('Failed to load roadmaps');
            }
        } catch (error) {
            console.error('Roadmap loading error:', error);
            alert('Error loading roadmaps. Please try again.');
        }
    }

    // Newsletter subscription
    async function subscribeNewsletter() {
        try {
            const user = await getTelegramUser();
            
            // In a real app, this would call your API
            alert('🎉 You have successfully subscribed to our newsletter!');
        } catch (error) {
            console.error('Newsletter subscription error:', error);
            alert('❌ Network error. Please try again.');
        }
    }

    // Fetch live crypto data from CoinGecko
    async function fetchCryptoData() {
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,cardano&per_page=4&sparkline=true');
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
        const height = 80;
        const width = 300;
        
        const points = prices.map((price, i) => {
            const x = (i / (prices.length - 1)) * width;
            const y = height - ((price - min) / range) * height;
            return `${x},${y}`;
        });
        
        return `M${points.join(' L')}`;
    }

    // Update crypto prices
    async function updateCryptoPrices() {
        try {
            const cryptoData = await fetchCryptoData();
            
            if (!cryptoData || cryptoData.length === 0) {
                cryptoContainer.innerHTML = `
                    <div class="col-span-4 text-center py-10 text-red-400">
                        <i class="fas fa-exclamation-triangle text-3xl mb-4"></i>
                        <p>Failed to load crypto data. Please try again later.</p>
                    </div>
                `;
                return;
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
            cryptoUpdated.textContent = `Updated: ${new Date().toLocaleTimeString()}`;
            
        } catch (error) {
            console.error('Crypto update error:', error);
            cryptoContainer.innerHTML = `
                <div class="col-span-4 text-center py-10 text-red-400">
                    <i class="fas fa-exclamation-triangle text-3xl mb-4"></i>
                    <p>Error loading crypto data. Please try again.</p>
                    <button class="mt-4 btn-primary px-4 py-2" onclick="updateCryptoPrices()">
                        <i class="fas fa-sync-alt mr-2"></i>Retry
                    </button>
                </div>
            `;
        }
    }
});
