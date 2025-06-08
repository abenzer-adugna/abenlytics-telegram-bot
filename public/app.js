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

    // Learn More button
    if (learnMoreBtn) {
        learnMoreBtn.addEventListener('click', () => {
            aboutModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        });
    }

    // About modal close buttons
    [closeAboutModal, modalCloseBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                aboutModal.classList.add('hidden');
                document.body.style.overflow = '';
            });
        }
    });

    // Close about modal when clicking outside
    aboutModal?.addEventListener('click', (e) => {
        if (e.target === aboutModal) {
            aboutModal.classList.add('hidden');
            document.body.style.overflow = '';
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
            booksContainer.innerHTML = `
                <div class="books-loading">
                    <i class="fas fa-spinner spinner text-cyan-400 text-3xl mb-4"></i>
                    <p>Loading investment books...</p>
                </div>
            `;
            booksContainer.classList.remove('hidden');
            
            const response = await fetch('/api/books');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.status === 'success' && result.books?.length > 0) {
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
                    
                    const user = getTelegramUserSync();
                    if (user?.username) {
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
        document.getElementById('prospectus-submit')?.addEventListener('click', handleProspectusUpload);
        document.getElementById('prospectus-cancel')?.addEventListener('click', () => {
            document.getElementById('prospectus-modal').classList.add('hidden');
        });
        
        document.getElementById('consultation-submit')?.addEventListener('click', handleConsultationRequest);
        document.getElementById('consultation-cancel')?.addEventListener('click', () => {
            document.getElementById('consultation-modal').classList.add('hidden');
        });
        
        document.addEventListener('click', (e) => {
            const modals = [
                'consultation-modal',
                'prospectus-modal',
                'review-modal',
                'about-modal'
            ];
            
            modals.forEach(id => {
                const modal = document.getElementById(id);
                if (e.target === modal) {
                    modal.classList.add('hidden');
                    document.body.style.overflow = '';
                }
            });
        });
    }

    // Initialize crypto
    function initializeCrypto() {
        updateCryptoPrices();
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

    // Handle consultation request
    async function handleConsultationRequest() {
        const nameInput = document.getElementById('user-name');
        const usernameInput = document.getElementById('telegram-username');
        const problemInput = document.getElementById('problem-description');
        
        const name = nameInput.value.trim();
        const telegramUsername = usernameInput.value.trim();
        const problem = problemInput.value.trim();
        
        if (!name || !telegramUsername || !problem) {
            alert('Please fill in all fields');
            return;
        }

        try {
            const submitBtn = document.getElementById('consultation-submit');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner spinner"></i> Sending...';
            
            const user = await getTelegramUser();
            
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
                alert('✅ Help is on the way! Our team will contact you shortly on Telegram.');
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
            const submitBtn = document.getElementById('consultation-submit');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Submit Request';
            }
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
            
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-spinner spinner text-cyan-400 text-2xl"></i>
                    <p class="mt-2">Loading reviews...</p>
                </div>
            `;
            modal.classList.remove('hidden');
            
            const response = await fetch('/api/reviews');
            
            if (!response.ok) {
                throw
