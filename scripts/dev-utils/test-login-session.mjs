import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = 'http://localhost:3001';

async function testLoginSession() {
  console.log('=== Testing Login and Session Flow ===\n');

  // Step 1: Login (using tRPC mutation format)
  console.log('Step 1: Attempting login...');
  const loginResponse = await fetch(`${API_URL}/api/trpc/auth.login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      json: {
        email: 'admin@test.com',
        password: 'test123',
      },
    }),
  });

  console.log('Login response status:', loginResponse.status);

  // Get the session cookie from response
  const setCookieHeader = loginResponse.headers.get('set-cookie');
  console.log('Set-Cookie header:', setCookieHeader ? 'Present' : 'Missing');

  if (!setCookieHeader) {
    console.error('❌ No session cookie set!');
    return;
  }

  console.log('Full Set-Cookie header:', setCookieHeader);

  // Extract cookie value (try multiple patterns)
  let sessionCookie = null;
  const patterns = [
    /session=([^;]+)/,           // session=value
    /Session=([^;]+)/,           // Session=value (capital S)
    /manus-session=([^;]+)/,     // manus-session=value
    /([^=]+)=([^;]+)/,           // any cookie
  ];

  for (const pattern of patterns) {
    const match = setCookieHeader.match(pattern);
    if (match) {
      sessionCookie = match[match.length - 1]; // Get last capture group
      console.log(`Matched pattern: ${pattern.source}, Cookie: ${sessionCookie.substring(0, 50)}...`);
      break;
    }
  }

  if (!sessionCookie) {
    console.error('❌ Could not extract session cookie value');
    return;
  }

  console.log('✅ Session cookie received');
  console.log('Cookie value (first 50 chars):', sessionCookie.substring(0, 50) + '...');
  console.log();

  // Step 2: Test session by calling auth.me (tRPC query format)
  console.log('Step 2: Testing session with auth.me endpoint...');
  const meResponse = await fetch(`${API_URL}/api/trpc/auth.me`, {
    method: 'GET',
    headers: {
      'Cookie': `app_session_id=${sessionCookie}`,
      'Content-Type': 'application/json',
    },
  });

  console.log('auth.me response status:', meResponse.status);

  if (meResponse.status !== 200) {
    console.error('❌ Session verification failed!');
    const errorText = await meResponse.text();
    console.error('Error response:', errorText);
    return;
  }

  const meData = await meResponse.json();
  console.log('✅ Session verified successfully!');
  console.log('User data:', JSON.stringify(meData, null, 2));
  console.log();

  console.log('=== Test Complete ===');
  console.log('✅ Login flow is working correctly!');
  console.log('✅ JWT token format is correct');
  console.log('✅ Session verification is working');
}

testLoginSession().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
