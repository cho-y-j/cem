import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🧪 API 쿼리 테스트 (서버와 동일한 쿼리 실행)\n');

// 서버에서 실행하는 것과 동일한 쿼리
console.log('1️⃣ getDeploymentsByUserId 시뮬레이션');
console.log('   user_id로 worker 찾기...');

const { data: workerData, error: workerError } = await supabase
  .from('workers')
  .select('id')
  .eq('user_id', 'worker-test-001')
  .single();

if (workerError) {
  console.log('❌ Worker 조회 실패:', workerError.message);
  process.exit(1);
}

console.log(`   ✅ Worker ID: ${workerData.id}\n`);

console.log('2️⃣ Deployments 조회 (equipment join 포함)');

const { data: deployments, error: depError } = await supabase
  .from('deployments')
  .select(`
    *,
    equipment:equipment!deployments_equipment_id_fkey(
      id,
      reg_num,
      specification,
      equip_type:equip_types!equipment_equip_type_id_fkey(id, name, description)
    ),
    worker:workers!deployments_worker_id_fkey(id, name, license_num),
    bp_company:companies!deployments_bp_company_id_fkey(id, name, company_type),
    ep_company:companies!deployments_ep_company_id_fkey(id, name, company_type)
  `)
  .eq('worker_id', workerData.id)
  .eq('status', 'active');

if (depError) {
  console.log('❌ Deployment 조회 실패:', depError);
  console.log('\n🔍 에러 상세:');
  console.log('  Code:', depError.code);
  console.log('  Message:', depError.message);
  console.log('  Details:', depError.details);
  console.log('  Hint:', depError.hint);
  process.exit(1);
}

console.log(`✅ 조회 성공! ${deployments.length}개의 deployment 발견\n`);

deployments.forEach((dep, i) => {
  console.log(`📋 Deployment ${i + 1}:`);
  console.log(`  ID: ${dep.id}`);
  console.log(`  Site: ${dep.site_name}`);
  console.log(`  Equipment:`);
  console.log(`    - 차량번호: ${dep.equipment?.reg_num || '없음'}`);
  console.log(`    - 장비명: ${dep.equipment?.equip_type?.name || '없음'}`);
  console.log(`    - 규격: ${dep.equipment?.specification || '없음'}`);
  console.log(`  BP 회사: ${dep.bp_company?.name || '없음'}`);
  console.log('');
});

console.log('🎉 모든 데이터가 정상입니다!');
console.log('\n👉 브라우저를 강력 새로고침 (Ctrl+Shift+R) 해보세요!');

process.exit(0);
