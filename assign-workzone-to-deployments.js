import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function assignWorkZones() {
  console.log('=== Work Zone 할당 시작 ===\n');

  // 1. 모든 active work_zones 조회
  const { data: workZones, error: wzError } = await supabase
    .from('work_zones')
    .select('id, name, company_id, is_active')
    .eq('is_active', true);

  if (wzError) {
    console.error('Work zones 조회 에러:', wzError);
    return;
  }

  console.log(`활성 Work Zones: ${workZones?.length || 0}개`);
  workZones?.forEach(wz => {
    console.log(`  - ${wz.name} (${wz.id.substring(0, 8)}...) - Company: ${wz.company_id?.substring(0, 8) || 'null'}`);
  });
  console.log('');

  // 2. work_zone_id가 null인 active deployments 조회
  const { data: deployments, error: depError } = await supabase
    .from('deployments')
    .select('id, ep_company_id, bp_company_id')
    .eq('status', 'active')
    .is('work_zone_id', null);

  if (depError) {
    console.error('Deployments 조회 에러:', depError);
    return;
  }

  console.log(`work_zone_id가 없는 Deployment: ${deployments?.length || 0}개\n`);

  if (!deployments || deployments.length === 0) {
    console.log('✅ 할당할 deployment가 없습니다.');
    return;
  }

  // 3. 각 deployment에 적절한 work_zone 할당
  let assignedCount = 0;
  for (const dep of deployments) {
    // EP company의 work_zone 찾기
    let targetWorkZone = workZones?.find(wz => wz.company_id === dep.ep_company_id);

    // EP company의 work_zone이 없으면 첫 번째 work_zone 사용
    if (!targetWorkZone && workZones && workZones.length > 0) {
      targetWorkZone = workZones[0];
      console.log(`⚠️ Deployment ${dep.id.substring(0, 8)}... EP company의 work_zone이 없어서 기본 work_zone 사용`);
    }

    if (targetWorkZone) {
      const { error: updateError } = await supabase
        .from('deployments')
        .update({ work_zone_id: targetWorkZone.id })
        .eq('id', dep.id);

      if (updateError) {
        console.error(`❌ Deployment ${dep.id.substring(0, 8)}... 업데이트 실패:`, updateError);
      } else {
        console.log(`✅ Deployment ${dep.id.substring(0, 8)}... → Work Zone: ${targetWorkZone.name}`);
        assignedCount++;
      }
    } else {
      console.log(`❌ Deployment ${dep.id.substring(0, 8)}... 할당 가능한 work_zone이 없음`);
    }
  }

  console.log(`\n총 ${assignedCount}개 deployment에 work_zone 할당 완료!`);
}

assignWorkZones().then(() => process.exit(0));
