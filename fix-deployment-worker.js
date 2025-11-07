/**
 * Deployment의 worker를 test@test.com에서 01@test.com으로 변경
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

async function fixDeploymentWorker() {
  console.log('\n=== Deployment Worker 변경 ===\n');

  const oldWorkerEmail = 'test@test.com';
  const newWorkerEmail = '01@test.com';

  // 1. 기존 worker (test@test.com) 찾기
  const { data: oldWorker, error: oldError } = await supabase
    .from('workers')
    .select('id, name, email')
    .eq('email', oldWorkerEmail)
    .maybeSingle();

  if (oldError || !oldWorker) {
    console.error(`❌ ${oldWorkerEmail} worker를 찾을 수 없습니다.`);
    return;
  }

  console.log(`✅ 기존 Worker: ${oldWorker.name} (${oldWorker.email})`);
  console.log(`   ID: ${oldWorker.id}`);

  // 2. 새 worker (01@test.com) 찾기
  const { data: newWorker, error: newError } = await supabase
    .from('workers')
    .select('id, name, email')
    .eq('email', newWorkerEmail)
    .maybeSingle();

  if (newError || !newWorker) {
    console.error(`❌ ${newWorkerEmail} worker를 찾을 수 없습니다.`);
    return;
  }

  console.log(`✅ 새 Worker: ${newWorker.name} (${newWorker.email})`);
  console.log(`   ID: ${newWorker.id}`);

  // 3. 기존 worker의 active deployments 찾기
  const { data: deployments, error: deployError } = await supabase
    .from('deployments')
    .select('id, equipment_id, start_date, planned_end_date')
    .eq('worker_id', oldWorker.id)
    .eq('status', 'active');

  if (deployError) {
    console.error('❌ Deployment 조회 에러:', deployError.message);
    return;
  }

  if (!deployments || deployments.length === 0) {
    console.log('\n⚠️  기존 worker에게 active deployment가 없습니다.');
    return;
  }

  console.log(`\n📋 변경할 Active Deployment ${deployments.length}개 발견:`);
  for (const d of deployments) {
    // Equipment 정보 조회
    const { data: equipment } = await supabase
      .from('equipment')
      .select('reg_num')
      .eq('id', d.equipment_id)
      .maybeSingle();

    console.log(`\n   Deployment ID: ${d.id}`);
    console.log(`   장비: ${equipment?.reg_num || d.equipment_id}`);
    console.log(`   기간: ${d.start_date} ~ ${d.planned_end_date}`);
  }

  // 4. worker_id 변경
  console.log(`\n🔄 Worker 변경 중...`);
  console.log(`   ${oldWorker.email} (${oldWorker.id})`);
  console.log(`   ↓`);
  console.log(`   ${newWorker.email} (${newWorker.id})`);

  const { error: updateError } = await supabase
    .from('deployments')
    .update({ worker_id: newWorker.id })
    .eq('worker_id', oldWorker.id)
    .eq('status', 'active');

  if (updateError) {
    console.error('\n❌ 업데이트 실패:', updateError.message);
    return;
  }

  console.log('\n✅ Deployment worker 변경 완료!');

  // 5. 확인
  const { data: updatedDeployments } = await supabase
    .from('deployments')
    .select('id, worker_id')
    .eq('worker_id', newWorker.id)
    .eq('status', 'active');

  console.log(`\n✅ 확인: ${newWorker.email}의 active deployment ${updatedDeployments?.length || 0}개`);

  console.log('\n=== 완료 ===\n');
}

fixDeploymentWorker();
