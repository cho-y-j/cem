/**
 * Worker와 연결된 사용자 삭제 테스트
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

async function testDeleteUserWithWorker() {
  console.log('\n=== Worker와 연결된 사용자 삭제 테스트 ===\n');

  // 01@test.com 사용자 정보 확인
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', '01@test.com')
    .single();

  if (!user) {
    console.log('❌ 01@test.com 사용자를 찾을 수 없습니다.');
    return;
  }

  console.log('✅ 사용자 확인:');
  console.log(`   - ID: ${user.id}`);
  console.log(`   - Email: ${user.email}`);
  console.log(`   - Name: ${user.name}`);

  // 이 사용자와 연결된 worker 확인
  const { data: workers } = await supabase
    .from('workers')
    .select('*')
    .eq('user_id', user.id);

  console.log(`\n✅ 연결된 Workers: ${workers?.length || 0}명`);
  if (workers && workers.length > 0) {
    workers.forEach(w => {
      console.log(`   - ${w.name} (Worker ID: ${w.id})`);
    });
  }

  // 삭제 시도 (users-router.ts의 delete 로직과 동일)
  console.log('\n🗑️  삭제 시도...\n');

  // 1. Worker 연결 끊기
  if (workers && workers.length > 0) {
    console.log('1️⃣  Worker 연결 끊는 중...');
    const { error: workerError } = await supabase
      .from('workers')
      .update({ user_id: null })
      .eq('user_id', user.id);

    if (workerError) {
      console.error('   ❌ Worker 연결 끊기 실패:', workerError.message);
      return;
    }
    console.log(`   ✅ ${workers.length}개 Worker 연결 끊음`);
  }

  // 2. Auth 삭제
  console.log('\n2️⃣  Supabase Auth에서 삭제 중...');
  const { error: authError } = await supabase.auth.admin.deleteUser(user.id);

  if (authError) {
    console.error('   ❌ Auth 삭제 실패:', authError.message);
    // 계속 진행 (Auth에 없을 수도 있음)
  } else {
    console.log('   ✅ Auth 삭제 성공');
  }

  // 3. DB 삭제
  console.log('\n3️⃣  DB에서 삭제 중...');
  const { error: dbError } = await supabase
    .from('users')
    .delete()
    .eq('id', user.id);

  if (dbError) {
    console.error('   ❌ DB 삭제 실패:', dbError.message);
    console.error('   전체 에러:', dbError);
    return;
  }

  console.log('   ✅ DB 삭제 성공');

  // 4. 확인
  console.log('\n4️⃣  삭제 확인...');
  const { data: deletedUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (deletedUser) {
    console.error('   ❌ 사용자가 여전히 존재합니다!');
  } else {
    console.log('   ✅ 사용자 삭제 완료');
  }

  // Workers 상태 확인
  const { data: updatedWorkers } = await supabase
    .from('workers')
    .select('*')
    .eq('email', '01@test.com');

  if (updatedWorkers && updatedWorkers.length > 0) {
    console.log('\n✅ Workers는 유지됨:');
    updatedWorkers.forEach(w => {
      console.log(`   - ${w.name} (user_id: ${w.user_id || 'NULL'})`);
    });
  }

  console.log('\n✅ 테스트 완료!\n');
}

testDeleteUserWithWorker().catch(console.error);
