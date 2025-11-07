import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔧 workers 테이블에 worker-test-001 레코드 생성 중...\n');

// 1. 먼저 worker-test-001이 workers 테이블에 이미 있는지 확인
const { data: existing } = await supabase
  .from('workers')
  .select('*')
  .eq('id', 'worker-test-001')
  .single();

if (existing) {
  console.log('✅ worker-test-001이 이미 workers 테이블에 존재합니다.');
  console.log(JSON.stringify(existing, null, 2));
  process.exit(0);
}

// 2. worker-record-001에서 필요한 정보 가져오기
const { data: workerRecord } = await supabase
  .from('workers')
  .select('*')
  .eq('id', 'worker-record-001')
  .single();

if (!workerRecord) {
  console.error('❌ worker-record-001을 찾을 수 없습니다.');
  process.exit(1);
}

// 3. workers 테이블에 worker-test-001 레코드 생성
const { data, error } = await supabase
  .from('workers')
  .insert({
    id: 'worker-test-001',
    worker_type_id: workerRecord.worker_type_id,
    name: '테스트 Worker',
    phone: '010-1234-5678',
    pin_code: '1234',
    owner_id: workerRecord.owner_id,
    owner_company_id: workerRecord.owner_company_id
  })
  .select();

if (error) {
  console.error('❌ 오류:', error);
  process.exit(1);
}

console.log('✅ workers 테이블에 worker-test-001 생성 완료:');
console.log(JSON.stringify(data, null, 2));
console.log('');

// 4. 장비를 worker-test-001에 재배정
const { data: equipmentData, error: equipmentError } = await supabase
  .from('equipment')
  .update({ assigned_worker_id: 'worker-test-001' })
  .eq('reg_num', '12거1234')
  .select();

if (equipmentError) {
  console.error('❌ 장비 배정 오류:', equipmentError);
  process.exit(1);
}

console.log('✅ 장비 배정 완료:');
console.log(JSON.stringify(equipmentData, null, 2));
console.log('');
console.log('✅ 모든 작업 완료!');
console.log('   - workers 테이블에 worker-test-001 생성됨');
console.log('   - 장비 12거1234가 worker-test-001에 배정됨');

process.exit(0);
