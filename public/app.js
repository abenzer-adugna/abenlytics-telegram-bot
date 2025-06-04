// Debug function to test service endpoint
async function testServiceEndpoint() {
  try {
    const response = await fetch('/api/service', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        serviceType: 'book_download',
        userData: {id: 123456789}
      })
    });
    
    console.log('Service test response:', response);
    const result = await response.text();
    console.log('Service test result:', result);
  } catch (error) {
    console.error('Service test error:', error);
  }
}

// Run test on load
document.addEventListener('DOMContentLoaded', () => {
  console.log('App loaded');
  
  // Test service endpoint after 3 seconds
  setTimeout(testServiceEndpoint, 3000);
});
