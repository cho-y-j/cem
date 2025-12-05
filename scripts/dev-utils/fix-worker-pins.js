/**
 * Worker PIN 고유화 스크립트
 * shb@test.com → 1111
 * u1@com.com → 2222
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixWorkerPins() {
  console.log('\n🔧 Worker PIN 고유화 시작...\n');

  // 1. shb@test.com worker PIN 업데이트
  console.log('═══════════════════════════════════════');
  console.log('1️⃣  shb@test.com → PIN 1111로 변경');
  console.log('═══════════════════════════════════════\n');

  const { data: worker1, error: err1 } = await supabase
    .from('workers')
    .update({ pin_code: '1111' })
    .eq('email', 'shb@test.com')
    .select()
    .single();

  if (err1) {
    console.error('❌ workers 테이블 업데이트 실패:', err1);
  } else {
    console.log('✅ workers 테이블 업데이트 성공:', worker1.id, worker1.name);
  }

  // users 테이블도 업데이트
  const { data: user1, error: userErr1 } = await supabase
    .from('users')
    .update({ pin: '1111' })
    .eq('email', 'shb@test.com')
    .select()
    .single();

  if (userErr1) {
    console.error('❌ users 테이블 업데이트 실패:', userErr1);
  } else {
    console.log('✅ users 테이블 업데이트 성공:', user1.id, user1.name);
  }

  // 2. u1@com.com worker PIN 업데이트
  console.log('\n═══════════════════════════════════════');
  console.log('2️⃣  u1@com.com → PIN 2222로 변경');
  console.log('═══════════════════════════════════════\n');

  const { data: worker2, error: err2 } = await supabase
    .from('workers')
    .update({ pin_code: '2222' })
    .eq('email', 'u1@com.com')
    .select()
    .single();

  if (err2) {
    console.error('❌ workers 테이블 업데이트 실패:', err2);
  } else {
    console.log('✅ workers 테이블 업데이트 성공:', worker2.id, worker2.name);
  }

  // users 테이블도 업데이트
  const { data: user2, error: userErr2 } = await supabase
    .from('users')
    .update({ pin: '2222' })
    .eq('email', 'u1@com.com')
    .select()
    .single();

  if (userErr2) {
    console.error('❌ users 테이블 업데이트 실패:', userErr2);
  } else {
    console.log('✅ users 테이블 업데이트 성공:', user2.id, user2.name);
  }

  // 3. 확인
  console.log('\n═══════════════════════════════════════');
  console.log('✅ 업데이트 완료 - 확인');
  console.log('═══════════════════════════════════════\n');

  const { data: verify1 } = await supabase
    .from('workers')
    .select('id, name, email, pin_code')
    .eq('email', 'shb@test.com')
    .single();

  console.log('shb@test.com:', verify1);

  const { data: verify2 } = await supabase
    .from('workers')
    .select('id, name, email, pin_code')
    .eq('email', 'u1@com.com')
    .single();

  console.log('u1@com.com:', verify2);

  console.log('\n✅ 완료\n');
  console.log('📝 새로운 로그인 정보:');
  console.log('   - 운전자 (송치봉): PIN 1111 또는 shb@test.com');
  console.log('   - 유도원 (조유도): PIN 2222 또는 u1@com.com\n');
}

fixWorkerPins().catch(console.error);
