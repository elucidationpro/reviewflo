// Test script to debug Place ID extraction
// Run with: node test-place-id.js "YOUR_GOOGLE_REVIEW_URL"

const url = process.argv[2] || 'https://g.page/r/CbHvObp1VFePEBM/review';

console.log('Testing Place ID extraction for:', url);
console.log('');

// Test redirect following
async function testExtraction() {
  try {
    console.log('1. Testing redirect following...');
    const response = await fetch(url, {
      redirect: 'follow',
      method: 'GET'
    });

    const finalUrl = response.url;
    console.log('   Final URL:', finalUrl);
    console.log('');

    // Test business name extraction
    console.log('2. Testing business name extraction...');
    const businessNameMatch = finalUrl.match(/maps\/place\/([^/@?]+)/);
    if (businessNameMatch) {
      const businessName = decodeURIComponent(businessNameMatch[1].replace(/\+/g, ' '));
      console.log('   Business name found:', businessName);
    } else {
      console.log('   ❌ No business name found in URL');
    }

    // Test place_id in URL (with decoding)
    console.log('');
    console.log('3. Testing for direct place_id in URL...');
    const decodedUrl = decodeURIComponent(finalUrl);
    const placeIdMatch = decodedUrl.match(/placeid[=:]([A-Za-z0-9_-]+)/i);
    if (placeIdMatch) {
      console.log('   ✅ Place ID found:', placeIdMatch[1]);
    } else {
      console.log('   ❌ No direct place_id found');
      console.log('   Decoded URL:', decodedUrl);
    }

    console.log('');
    console.log('Full final URL for inspection:');
    console.log(finalUrl);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testExtraction();
