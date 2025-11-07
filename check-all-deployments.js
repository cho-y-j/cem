/**
 * 모든 active deployment 확인
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

async function checkAllDeployments() {
  console.log('\n=== 모든 Active Deployment 확인 ===\n');

  const { data: deployments, error } = await supabase
    .from('deployments')
    .select(`
      id,
      worker_id,
      equipment_id,
      status,
      start_date,
      planned_end_date,
      created_at
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ 에러:', error.message);
    return;
  }

  if (!deployments || deployments.length === 0) {
    console.log('⚠️  Active deployment가 하나도 없습니다.');
    return;
  }

  console.log(`✅ Active deployment ${deployments.length}개 발견:\n`);

  for (const deployment of deployments) {
    console.log(`📋 Deployment ID: ${deployment.id}`);
    console.log(`   worker_id: ${deployment.worker_id}`);
    console.log(`   equipment_id: ${deployment.equipment_id}`);
    console.log(`   기간: ${deployment.start_date} ~ ${deployment.planned_end_date}`);

    // Worker 정보 조회
    const { data: worker } = await supabase
      .from('workers')
      .select('id, name, email, pin_code')
      .eq('id', deployment.worker_id)
      .maybeSingle();

    if (worker) {
      console.log(`   👷 Worker: ${worker.name} (email: ${worker.email || '없음'}, PIN: ${worker.pin_code || '없음'})`);
    } else {
      console.log(`   ⚠️  Worker 정보를 찾을 수 없음`);
    }

    // Equipment 정보 조회
    const { data: equipment } = await supabase
      .from('equipment')
      .select('id, reg_num, equip_type_id')
      .eq('id', deployment.equipment_id)
      .maybeSingle();

    if (equipment) {
      console.log(`   🚜 Equipment: ${equipment.reg_num}`);
    } else {
      console.log(`   ⚠️  Equipment 정보를 찾을 수 없음`);
    }

    console.log('');
  }

  console.log('=== 확인 완료 ===\n');
}

checkAllDeployments();
