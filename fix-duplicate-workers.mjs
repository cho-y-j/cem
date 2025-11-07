import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixDuplicateWorkers() {
  console.log('=== 중복 Worker user_id 수정 ===\n');

  // worker-test-001은 메인으로 유지
  console.log('✓ worker-test-001: user_id 유지');

  // worker-record-001의 user_id 제거
  const { error: error1 } = await supabase
    .from('workers')
    .update({ user_id: null })
    .eq('id', 'worker-record-001');

  if (error1) {
    console.error('❌ worker-record-001 업데이트 실패:', error1);
  } else {
    console.log('✓ worker-record-001: user_id 제거');
  }

  // VRonmkWXjpsXgqlzUUiWJ의 user_id 제거
  const { error: error2 } = await supabase
    .from('workers')
    .update({ user_id: null })
    .eq('id', 'VRonmkWXjpsXgqlzUUiWJ');

  if (error2) {
    console.error('❌ VRonmkWXjpsXgqlzUUiWJ 업데이트 실패:', error2);
  } else {
    console.log('✓ VRonmkWXjpsXgqlzUUiWJ: user_id 제거');
  }

  // 확인
  console.log('\n=== 최종 결과 ===');
  const { data: workers } = await supabase
    .from('workers')
    .select('id, name, user_id')
    .eq('user_id', 'worker-test-001');

  console.log('user_id가 worker-test-001인 Workers:', JSON.stringify(workers, null, 2));

  // Deployment 확인
  console.log('\n=== Deployment 확인 ===');
  const { data: deps } = await supabase
    .from('deployments')
    .select('id, site_name, worker_id, status')
    .eq('worker_id', 'worker-test-001')
    .eq('status', 'active');

  console.log('worker-test-001의 Active Deployments:', JSON.stringify(deps, null, 2));
}

fixDuplicateWorkers().catch(console.error);
