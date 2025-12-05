/**
 * Worker의 user_id 연결 확인
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

async function checkWorkerUserId() {
  console.log('\n=== Worker user_id 연결 확인 ===\n');

  // 1. users 테이블에서 01@test.com 확인
  const { data: user } = await supabase
    .from('users')
    .select('id, email, name')
    .eq('email', '01@test.com')
    .maybeSingle();

  if (!user) {
    console.log('❌ users 테이블에 01@test.com이 없습니다.');
    return;
  }

  console.log('✅ User:', {
    id: user.id,
    email: user.email,
    name: user.name,
  });

  // 2. workers 테이블에서 email='01@test.com' 확인
  const { data: worker } = await supabase
    .from('workers')
    .select('id, name, email, user_id')
    .eq('email', '01@test.com')
    .maybeSingle();

  if (!worker) {
    console.log('❌ workers 테이블에 01@test.com이 없습니다.');
    return;
  }

  console.log('\n✅ Worker:', {
    id: worker.id,
    name: worker.name,
    email: worker.email,
    user_id: worker.user_id || '(NULL)',
  });

  // 3. user_id 연결 확인
  if (!worker.user_id) {
    console.log('\n⚠️  문제 발견: worker.user_id가 NULL입니다!');
    console.log('\n🔧 수정 방법:');
    console.log(`   worker.user_id를 ${user.id}로 업데이트 필요`);

    // 자동 수정
    console.log('\n🔄 자동 수정 중...');
    const { error } = await supabase
      .from('workers')
      .update({ user_id: user.id })
      .eq('id', worker.id);

    if (error) {
      console.error('❌ 수정 실패:', error.message);
    } else {
      console.log('✅ worker.user_id 수정 완료!');

      // 확인
      const { data: updated } = await supabase
        .from('workers')
        .select('id, user_id')
        .eq('id', worker.id)
        .single();

      console.log('✅ 확인:', updated);
    }
  } else if (worker.user_id !== user.id) {
    console.log(`\n⚠️  문제 발견: worker.user_id(${worker.user_id})가 user.id(${user.id})와 다릅니다!`);
    console.log('\n🔄 수정 중...');
    const { error } = await supabase
      .from('workers')
      .update({ user_id: user.id })
      .eq('id', worker.id);

    if (error) {
      console.error('❌ 수정 실패:', error.message);
    } else {
      console.log('✅ worker.user_id 수정 완료!');
    }
  } else {
    console.log('\n✅ worker.user_id가 올바르게 연결되어 있습니다!');
  }

  console.log('\n=== 완료 ===\n');
}

checkWorkerUserId();
