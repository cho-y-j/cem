import fetch from 'node-fetch';

console.log('🔐 Worker 로그인 테스트\n');
console.log('PIN: 1234로 로그인 시도 중...\n');

// tRPC 호출 형식
const response = await fetch('http://localhost:3000/api/trpc/authPin.loginWithPin', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    pinCode: '1234'
  })
});

console.log('Status:', response.status);
console.log('Status Text:', response.statusText);

const data = await response.text();
console.log('\nResponse:');
console.log(data);

if (response.ok) {
  console.log('\n✅ 로그인 성공!');

  // 쿠키 확인
  const cookies = response.headers.get('set-cookie');
  if (cookies) {
    console.log('\n🍪 쿠키:', cookies);
  }
} else {
  console.log('\n❌ 로그인 실패');
}
