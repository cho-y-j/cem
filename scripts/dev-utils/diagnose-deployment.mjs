import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 투입 현장 연동 문제 진단 중...\n');

// 1. Equipment 테이블 컬럼 확인
console.log('1️⃣ Equipment 테이블 확인');
const { data: equipmentSample, error: equipError } = await supabase
  .from('equipment')
  .select('*')
  .limit(1);

if (equipError) {
  console.log('❌ Equipment 조회 실패:', equipError.message);
} else {
  console.log('✅ Equipment 컬럼:', Object.keys(equipmentSample?.[0] || {}));
  if (!Object.keys(equipmentSample?.[0] || {}).includes('specification')) {
    console.log('❌ specification 컬럼이 없습니다!');
  }
}

// 2. User 확인
console.log('\n2️⃣ Worker 사용자 확인');
const { data: user } = await supabase
  .from('users')
  .select('*')
  .eq('id', 'worker-test-001')
  .single();

console.log('User:', user?.email, 'Role:', user?.role);

// 3. Worker 확인
console.log('\n3️⃣ Workers 테이블 확인');
const { data: workers } = await supabase
  .from('workers')
  .select('*')
  .eq('user_id', 'worker-test-001');

console.log(`user_id='worker-test-001'인 Worker: ${workers?.length || 0}개`);
workers?.forEach(w => {
  console.log(`  - ID: ${w.id}, Name: ${w.name}, user_id: ${w.user_id}`);
});

// 4. Deployment 확인
console.log('\n4️⃣ Active Deployments 확인');
const { data: deployments, error: depError } = await supabase
  .from('deployments')
  .select(`
    *,
    equipment:equipment!deployments_equipment_id_fkey(id, reg_num, equip_type_id)
  `)
  .eq('status', 'active');

if (depError) {
  console.log('❌ Deployment 조회 실패:', depError.message);
} else {
  console.log(`Active Deployments: ${deployments?.length || 0}개`);
  deployments?.forEach(d => {
    console.log(`\n  Deployment ID: ${d.id}`);
    console.log(`    Worker ID: ${d.worker_id}`);
    console.log(`    Equipment: ${d.equipment?.reg_num || '없음'}`);
    console.log(`    Site: ${d.site_name || '없음'}`);
    console.log(`    BP Company: ${d.bp_company_id}`);
  });
}

// 5. Worker-test-001에 해당하는 deployment 찾기
console.log('\n5️⃣ worker-test-001의 Deployment 조회');
const { data: workerDeployment } = await supabase
  .from('deployments')
  .select('*')
  .eq('worker_id', 'worker-test-001')
  .eq('status', 'active');

console.log(`worker_id='worker-test-001'인 Active Deployment: ${workerDeployment?.length || 0}개`);

// 6. 문제 요약
console.log('\n📋 문제 요약:');
if (!Object.keys(equipmentSample?.[0] || {}).includes('specification')) {
  console.log('❌ 1. equipment 테이블에 specification 컬럼이 없습니다');
  console.log('   👉 Supabase SQL Editor에서 다음 SQL 실행 필요:');
  console.log('      ALTER TABLE equipment ADD COLUMN specification VARCHAR(200);');
}

if (!workers || workers.length === 0) {
  console.log('❌ 2. user_id로 worker를 찾을 수 없습니다');
  console.log('   👉 workers.user_id가 users.id와 매칭되지 않습니다');
}

if (!workerDeployment || workerDeployment.length === 0) {
  console.log('❌ 3. worker-test-001에 active deployment가 없습니다');
  console.log('   👉 deployment를 생성해야 합니다');
}

console.log('\n');
process.exit(0);
