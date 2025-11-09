/**
 * 출근 현황 통계 API 테스트 스크립트
 * 로컬 서버에서 직접 테스트
 */

import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';

// tRPC 클라이언트 생성
const trpc = createTRPCProxyClient({
  transformer: superjson,
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/api/trpc',
      headers: async () => {
        // EP 사용자로 로그인한 토큰 필요
        // 실제로는 로그인 API를 먼저 호출해야 함
        return {};
      },
    }),
  ],
});

async function testGetTodayStats() {
  try {
    console.log('=== 출근 현황 통계 API 테스트 ===');
    
    // 먼저 로그인 필요
    // const loginResult = await trpc.auth.login.mutate({
    //   email: 'ep@test.com',
    //   password: 'test1234',
    // });
    
    // const stats = await trpc.checkIn.getTodayStats.query();
    // console.log('출근 현황 통계:', stats);
    
    console.log('로그인 API를 먼저 호출해야 합니다.');
  } catch (error) {
    console.error('테스트 오류:', error);
  }
}

testGetTodayStats();

