import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateWorkerUserId() {
  console.log('=== workers.user_id 업데이트 시작 ===\n');

  // worker-test-001의 user_id를 업데이트
  const { data, error } = await supabase
    .from('workers')
    .update({ user_id: 'worker-test-001' })
    .eq('id', 'worker-test-001')
    .select();

  if (error) {
    console.error('❌ 업데이트 실패:', error);
  } else {
    console.log('✅ 업데이트 성공:', data);
  }

  // worker-record-001도 업데이트 (PIN이 1234인 경우)
  const { data: data2, error: error2 } = await supabase
    .from('workers')
    .update({ user_id: 'worker-test-001' })
    .eq('id', 'worker-record-001')
    .select();

  if (error2) {
    console.error('❌ 두 번째 레코드 업데이트 실패:', error2);
  } else {
    console.log('✅ 두 번째 레코드 업데이트 성공:', data2);
  }

  // 결과 확인
  console.log('\n=== 최종 확인 ===');
  const { data: workers } = await supabase
    .from('workers')
    .select('id, name, user_id')
    .in('id', ['worker-test-001', 'worker-record-001']);

  console.log('Workers:', JSON.stringify(workers, null, 2));
}

updateWorkerUserId().catch(console.error);
