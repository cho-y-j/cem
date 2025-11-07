import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔧 장비 배정 수정 중...\n');

// 장비를 worker-test-001에 재배정
const { data, error } = await supabase
  .from('equipment')
  .update({ assigned_worker_id: 'worker-test-001' })
  .eq('reg_num', '12거1234')
  .select();

if (error) {
  console.error('❌ 오류:', error);
  process.exit(1);
}

console.log('✅ 장비 배정 완료:');
console.log(JSON.stringify(data, null, 2));
console.log('');
console.log('📋 장비 12거1234가 worker-test-001에 배정되었습니다.');

process.exit(0);
