// Simple direct API call to test moderation
console.log('🧪 Testaa suora API kutsu Functions:iin');

async function testDirectModeration() {
  try {
    const response = await fetch('http://127.0.0.1:5001/chat-d8df8/europe-west1/moderateText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: {
          text: 'seksi',
          userId: 'direct-test'
        }
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Direct API call success:', result);
      return result;
    } else {
      console.error('❌ Direct API call failed:', response.status, response.statusText);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Direct API call error:', error);
    return null;
  }
}

// Testaa heti
testDirectModeration();

// Export for global access
window.testDirectModeration = testDirectModeration;