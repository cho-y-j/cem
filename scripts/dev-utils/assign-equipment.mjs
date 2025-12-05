import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

console.log('🚗 장비를 Worker에게 배정 중...\n');

const equipmentId = '9LJAI2UaIrwsNbETql2yM';
const workerId = 'worker-test-001';

const { data, error } = await supabase
  .from('equipment')
  .update({ assigned_worker_id: workerId })
  .eq('id', equipmentId)
  .select();

if (error) {
  console.error('❌ 배정 실패:', error.message);
  process.exit(1);
}

console.log('✅ 장비 배정 완료!\n');
console.log(`장비 ID: ${equipmentId}`);
console.log(`운전자 ID: ${workerId}`);
console.log('\n이제 Worker 로그인 후 메인 화면에서 배정된 장비를 볼 수 있습니다.');

process.exit(0);
