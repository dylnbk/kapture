// Quick test script to debug the download API
const fetch = require('node-fetch');

async function testDownload() {
  console.log('🧪 Testing download API...');
  
  try {
    const response = await fetch('http://localhost:3000/api/downloads/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'your-auth-cookie-here' // This would normally come from browser
      },
      body: JSON.stringify({
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        fileType: 'video',
        quality: 'high'
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());
    
    const data = await response.text();
    console.log('Response body:', data);
    
    if (!response.ok) {
      console.error('❌ Request failed');
    } else {
      console.log('✅ Request successful');
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDownload();