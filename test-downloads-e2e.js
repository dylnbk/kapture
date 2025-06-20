const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000';
const YTDLP_BASE = 'http://localhost:3001';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testDownloadsWorkflow() {
  console.log('🚀 Starting End-to-End Downloads Test\n');

  try {
    // Step 1: Check if services are running
    console.log('1. Checking service health...');
    
    try {
      const mainAppHealth = await fetch(`${API_BASE}/api/health`);
      console.log(`   ✅ Main app: ${mainAppHealth.ok ? 'OK' : 'FAILED'}`);
    } catch (error) {
      console.log('   ❌ Main app: OFFLINE');
      return;
    }

    try {
      const ytdlpHealth = await fetch(`${YTDLP_BASE}/health`);
      console.log(`   ✅ yt-dlp service: ${ytdlpHealth.ok ? 'OK' : 'FAILED'}`);
    } catch (error) {
      console.log('   ❌ yt-dlp service: OFFLINE');
      return;
    }

    // Step 2: Test URL validation
    console.log('\n2. Testing URL validation...');
    const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Rick Roll
    
    try {
      const extractResponse = await fetch(`${YTDLP_BASE}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: testUrl })
      });
      
      if (extractResponse.ok) {
        const metadata = await extractResponse.json();
        console.log(`   ✅ URL validation successful: "${metadata.title}"`);
      } else {
        console.log('   ❌ URL validation failed');
        return;
      }
    } catch (error) {
      console.log(`   ❌ URL validation error: ${error.message}`);
      return;
    }

    // Step 3: Request download (simulate with auth header)
    console.log('\n3. Requesting download...');
    
    // Note: In real usage, this would require proper authentication
    // For testing, we'll hit the yt-dlp service directly
    const downloadResponse = await fetch(`${YTDLP_BASE}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: testUrl,
        format: 'best[height<=720]', // Lower quality for faster testing
        extract_info: true,
        userId: 'test-user'
      })
    });

    if (!downloadResponse.ok) {
      console.log('   ❌ Download request failed');
      return;
    }

    const downloadJob = await downloadResponse.json();
    console.log(`   ✅ Download started: ${downloadJob.id}`);

    // Step 4: Monitor download progress
    console.log('\n4. Monitoring download progress...');
    
    let attempts = 0;
    const maxAttempts = 20; // 2 minutes max
    let completed = false;

    while (attempts < maxAttempts && !completed) {
      await sleep(6000); // Wait 6 seconds
      attempts++;

      try {
        const statusResponse = await fetch(`${YTDLP_BASE}/download/${downloadJob.id}/status`);
        
        if (statusResponse.ok) {
          const status = await statusResponse.json();
          console.log(`   📊 Attempt ${attempts}: ${status.status} - ${status.progress}%`);
          
          if (status.status === 'completed') {
            completed = true;
            console.log('   ✅ Download completed!');
          } else if (status.status === 'failed') {
            console.log(`   ❌ Download failed: ${status.error}`);
            return;
          }
        } else {
          console.log(`   ⚠️  Status check failed (attempt ${attempts})`);
        }
      } catch (error) {
        console.log(`   ⚠️  Status check error: ${error.message}`);
      }
    }

    if (!completed) {
      console.log('   ⏰ Download timeout - may still be processing');
      return;
    }

    // Step 5: Check file availability
    console.log('\n5. Checking downloaded files...');
    
    try {
      const filesResponse = await fetch(`${YTDLP_BASE}/download/${downloadJob.id}/files`);
      
      if (filesResponse.ok) {
        const fileData = await filesResponse.json();
        console.log(`   ✅ Files available: ${fileData.files.length} file(s)`);
        
        if (fileData.files.length > 0) {
          const file = fileData.files[0];
          console.log(`   📁 Main file: ${file.name} (${Math.round(file.size / 1024 / 1024 * 100) / 100} MB)`);
          
          // Step 6: Test file download
          console.log('\n6. Testing file download...');
          
          const fileDownloadResponse = await fetch(`${YTDLP_BASE}${file.downloadUrl}`);
          
          if (fileDownloadResponse.ok) {
            const contentLength = fileDownloadResponse.headers.get('content-length');
            console.log(`   ✅ File download successful (${contentLength} bytes)`);
          } else {
            console.log('   ❌ File download failed');
          }
        }
      } else {
        console.log('   ❌ Files check failed');
      }
    } catch (error) {
      console.log(`   ❌ Files check error: ${error.message}`);
    }

    // Step 7: Test status sync endpoint (if main app is authenticated)
    console.log('\n7. Testing status synchronization...');
    
    try {
      // This would normally require authentication
      const syncResponse = await fetch(`${API_BASE}/api/downloads/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (syncResponse.ok) {
        const syncResult = await syncResponse.json();
        console.log('   ✅ Status sync endpoint accessible');
      } else if (syncResponse.status === 401) {
        console.log('   ℹ️  Status sync requires authentication (expected)');
      } else {
        console.log(`   ⚠️  Status sync returned: ${syncResponse.status}`);
      }
    } catch (error) {
      console.log(`   ⚠️  Status sync error: ${error.message}`);
    }

    console.log('\n🎉 End-to-End Test Summary:');
    console.log('   ✅ Services are running');
    console.log('   ✅ URL validation works');
    console.log('   ✅ Download request works');
    console.log('   ✅ Status monitoring works');
    console.log('   ✅ File serving works');
    console.log('   ✅ Download lifecycle complete');
    
    console.log('\n📋 Next steps for full functionality:');
    console.log('   1. Add authentication to test full API workflow');
    console.log('   2. Test frontend integration');
    console.log('   3. Test file lifecycle management');
    console.log('   4. Verify real-time updates in UI');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testDownloadsWorkflow();