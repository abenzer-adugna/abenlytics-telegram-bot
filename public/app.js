// Enhanced service request handler with debugging
async function requestService(serviceType) {
  try {
    console.log(`Requesting service: ${serviceType}`);
    
    // Create test user data
    const userData = {
      id: Math.floor(Math.random() * 1000000),
      name: "Test User",
      email: "test@example.com"
    };
    
    const response = await fetch('/api/service', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
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

// Add click handlers to all buttons
document.querySelectorAll('button').forEach(button => {
  button.addEventListener('click', function() {
    const service = this.dataset.service || 'unknown';
    requestService(service);
  });
});

// Add data attributes to your buttons in index.html:
// Example: <button data-service="book_download">Download Book</button>
