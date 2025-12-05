/**
 * 테스트 사용자 제대로 생성 (Auth + DB 동기화)
 */
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// SHA-256 간단 해시 (비밀번호용)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const testUsers = [
  { email: 'owner@test.com', password: 'test123', name: '테스트 Owner', role: 'owner', companyId: null },
  { email: 'bp@test.com', password: 'test123', name: '테스트 BP', role: 'bp', companyId: null },
  { email: 'ep@test.com', password: 'test123', name: '테스트 EP', role: 'ep', companyId: null },
  { email: 'worker@test.com', password: 'test123', name: '테스트 Worker', role: 'worker', pin: '1234', companyId: null },
  { email: 'inspector@test.com', password: 'test123', name: '테스트 점검원', role: 'inspector', pin: '5678', companyId: null },
  { email: '01@test.com', password: 'test123', name: '홍경자', role: 'worker', pin: '0000', companyId: null },
];

async function createTestUsers() {
  console.log('\n=== 테스트 사용자 생성 (Auth + DB 동기화) ===\n');

  for (const testUser of testUsers) {
    console.log(`📝 생성 중: ${testUser.email} (${testUser.role})`);

    // 1. 기존 사용자 확인
    const { data: existing } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', testUser.email)
      .maybeSingle();

    if (existing) {
      console.log(`   ⚠️  이미 존재함: ${existing.id}`);
      continue;
    }

    // 2. Auth 사용자 생성
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testUser.email,
      password: testUser.password,
      email_confirm: true,
    });

    if (authError) {
      console.error(`   ❌ Auth 생성 실패:`, authError.message);
      continue;
    }

    const userId = authData.user.id;
    console.log(`   ✅ Auth 생성: ${userId}`);

    // 3. DB에 사용자 추가
    const { error: dbError } = await supabase.from('users').insert({
      id: userId,
      email: testUser.email,
      name: testUser.name,
      role: testUser.role,
      password: hashPassword(testUser.password),
      company_id: testUser.companyId,
      pin: testUser.pin || null,
      created_at: new Date().toISOString(),
    });

    if (dbError) {
      console.error(`   ❌ DB 추가 실패:`, dbError.message);
      // Auth 삭제 (롤백)
      await supabase.auth.admin.deleteUser(userId);
      continue;
    }

    console.log(`   ✅ DB 추가 성공`);

    // 4. Worker인 경우, workers 테이블에 연결 (01@test.com는 기존 worker와 연결)
    if (testUser.role === 'worker' && testUser.email === '01@test.com') {
      console.log(`   🔗 Worker 연결 시도...`);

      // 기존 worker 찾기 (email로)
      const { data: existingWorker } = await supabase
        .from('workers')
        .select('*')
        .eq('email', testUser.email)
        .maybeSingle();

      if (existingWorker) {
        // worker.user_id 업데이트
        const { error: updateError } = await supabase
          .from('workers')
          .update({ user_id: userId })
          .eq('id', existingWorker.id);

        if (updateError) {
          console.error(`   ❌ Worker 연결 실패:`, updateError.message);
        } else {
          console.log(`   ✅ Worker 연결 성공: ${existingWorker.name}`);
        }
      } else {
        console.log(`   ⚠️  기존 Worker 없음`);
      }
    }

    console.log('');
  }

  // 최종 확인
  console.log('=== 최종 확인 ===\n');

  const { data: users } = await supabase
    .from('users')
    .select('id, email, role')
    .order('created_at', { ascending: false });

  console.log(`✅ 총 ${users?.length || 0}명의 사용자:`);
  users?.forEach((user, idx) => {
    console.log(`   ${idx + 1}. ${user.email} (${user.role})`);
  });

  console.log('\n✅ 완료!\n');
}

createTestUsers().catch(console.error);
