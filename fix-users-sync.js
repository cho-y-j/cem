/**
 * Auth와 DB 사용자 동기화
 */
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixUsersSync() {
  console.log('\n=== Auth와 DB 동기화 ===\n');

  // 1. 모든 DB 사용자 조회
  const { data: dbUsers } = await supabase
    .from('users')
    .select('*');

  console.log(`📋 DB 사용자: ${dbUsers?.length || 0}명\n`);

  // 2. UUID가 아닌 사용자 (가짜 테스트 데이터) 삭제
  const fakeUsers = dbUsers?.filter(user => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return !uuidRegex.test(user.id);
  });

  console.log(`🗑️  가짜 사용자 삭제 (UUID가 아닌 ID): ${fakeUsers?.length || 0}명`);

  if (fakeUsers && fakeUsers.length > 0) {
    for (const user of fakeUsers) {
      console.log(`   - 삭제: ${user.email} (${user.id})`);

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);

      if (error) {
        console.error(`   ❌ 삭제 실패:`, error.message);
      } else {
        console.log(`   ✅ 삭제 성공`);
      }
    }
  }

  // 3. Auth 사용자 목록 조회
  console.log('\n📋 Auth 사용자 확인...');
  const { data: authData } = await supabase.auth.admin.listUsers();
  const authUsers = authData?.users || [];

  console.log(`✅ Auth 사용자: ${authUsers.length}명\n`);

  // 4. Auth 사용자를 DB에 추가 (없는 경우)
  for (const authUser of authUsers) {
    console.log(`🔍 확인: ${authUser.email} (${authUser.id})`);

    // DB에 이미 있는지 확인
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (existingUser) {
      console.log(`   ✅ 이미 DB에 존재함`);
    } else {
      console.log(`   ➕ DB에 추가 중...`);

      // 기본 role은 admin으로 (나중에 수정 가능)
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          email: authUser.email,
          name: authUser.email.split('@')[0], // 이메일 앞부분을 이름으로
          role: 'admin', // 기본 role
          password: 'dummy_hashed', // Auth에서 관리하므로 더미 값
          created_at: authUser.created_at,
        });

      if (insertError) {
        console.error(`   ❌ 추가 실패:`, insertError.message);
      } else {
        console.log(`   ✅ 추가 성공`);
      }
    }
  }

  // 5. 최종 확인
  console.log('\n=== 최종 확인 ===\n');

  const { data: finalDbUsers } = await supabase
    .from('users')
    .select('id, email, role')
    .order('created_at', { ascending: false });

  console.log(`✅ DB 사용자: ${finalDbUsers?.length || 0}명`);
  finalDbUsers?.forEach((user, idx) => {
    console.log(`   ${idx + 1}. ${user.email} (${user.role}) - ${user.id}`);
  });

  console.log('\n✅ 동기화 완료!\n');
}

fixUsersSync().catch(console.error);
