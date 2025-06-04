// Enhanced service request handler with Telegram integration
async function requestService(serviceType) {
  try {
    console.log(`Requesting service: ${serviceType}`);
    
    // Get Telegram user data if available
    let userData = {};
    if (window.Telegram && window.Telegram.WebApp) {
      const initData = window.Telegram.WebApp.initData;
      
      if (initData) {
        // Parse initData string
        const params = new URLSearchParams(initData);
        const user = JSON.parse(params.get('user'));
        
        userData = {
          id: user.id,
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          username: user.username || '',
          language_code: user.language_code || 'en'
        };
      }
    }
    
    // Fallback to test data if Telegram user not available
    if (!userData.id) {
      userData = {
        id: Math.floor(Math.random() * 1000000),
        first_name: "Test",
        last_name: "User",
        username: "test_user",
        language_code: "en"
      };
      console.warn("Using test data - not in Telegram environment");
    }

    const response = await fetch('/api/service', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-InitData': window.Telegram?.WebApp?.initData || 'none'
      },
      body: JSON.stringify({
        serviceType,
        userData
      })
    });
    
    const result = await response.json();
    
    if (result.status === 'success') {
      alert(`✅ ${serviceType} request successful!`);
    } else {
      alert(`❌ Error: ${result.message}`);
    }
  } catch (error) {
    console.error('Service error:', error);
    alert('❌ Network error. Please try again.');
  }
}

// Add click handlers to service buttons
document.querySelectorAll('button[data-service]').forEach(button => {
  button.addEventListener('click', function() {
    const service = this.dataset.service;
    requestService(service);
  });
});
