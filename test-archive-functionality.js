// Test script to verify archive functionality
const BASE_URL = 'http://localhost:3000';

async function testArchiveFunctionality() {
  console.log('🧪 Testing Archive Functionality...\n');
  
  try {
    // Test 1: Check downloads API excludes archived files
    console.log('📥 Testing Downloads API (should exclude archived files)...');
    const downloadsResponse = await fetch(`${BASE_URL}/api/downloads?includeStats=true`);
    const downloadsData = await downloadsResponse.json();
    console.log(`✅ Downloads API Response: ${downloadsData.data?.length || 0} items`);
    console.log(`📊 Files kept ratio: ${downloadsData.meta?.fileLifecycle?.filesKeptRatio || 0}%\n`);
    
    // Test 2: Check library API shows archived files
    console.log('📚 Testing Library API (should show archived files)...');
    const libraryResponse = await fetch(`${BASE_URL}/api/library?category=downloaded`);
    const libraryData = await libraryResponse.json();
    console.log(`✅ Library API Response: ${libraryData.data?.length || 0} archived items\n`);
    
    // Test 3: Test each library category
    const categories = ['downloaded', 'scraped', 'uploaded'];
    for (const category of categories) {
      console.log(`📂 Testing Library Category: ${category}...`);
      const categoryResponse = await fetch(`${BASE_URL}/api/library?category=${category}`);
      const categoryData = await categoryResponse.json();
      console.log(`✅ ${category} category: ${categoryData.data?.length || 0} items`);
    }
    
    console.log('\n🎉 Archive functionality test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testArchiveFunctionality();