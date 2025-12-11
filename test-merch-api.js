#!/usr/bin/env node

// Simple script to test the merch API endpoints
const https = require('https');

async function testAPI(path, description) {
  console.log(`\n🔄 Testing: ${description}`);
  console.log(`URL: http://localhost:3000${path}`);
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = require('http').request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        try {
          const parsed = JSON.parse(data);
          console.log('Response:', JSON.stringify(parsed, null, 2));
        } catch (e) {
          console.log('Raw Response:', data);
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      console.error(`❌ Error: ${err.message}`);
      resolve();
    });

    req.setTimeout(5000, () => {
      console.error('❌ Timeout');
      req.destroy();
      resolve();
    });

    req.end();
  });
}

async function main() {
  console.log('🚀 Testing Merch API Endpoints...');
  
  await testAPI('/api/merch/items', 'Fetch merch items');
  await testAPI('/api/health', 'Health check');
  
  console.log('\n✅ Test complete');
}

main().catch(console.error);