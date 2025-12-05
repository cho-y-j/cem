import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function compareDeployments() {
  console.log('기존 vs 새 deployment 비교 중...\n');

  const { data: deployments, error } = await supabase
    .from('deployments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!deployments || deployments.length === 0) {
    console.log('투입 데이터가 없습니다.');
    return;
  }

  // active 상태인 것들 찾기
  const activeOnes = deployments.filter(d => d.status === 'active');
  const pendingBpOnes = deployments.filter(d => d.status === 'pending_bp');

  console.log('=== ACTIVE 상태 (기존 - 정상 작동) ===\n');
  activeOnes.forEach((d, i) => {
    console.log(`[${i+1}] ID: ${d.id}`);
    console.log(`  Created: ${d.created_at}`);
    console.log(`  Status: ${d.status}`);
    console.log(`  Worker: ${d.worker_id}`);
    console.log(`  Guide Worker: ${d.guide_worker_id || '없음'}`);
    console.log(`  Work Zone: ${d.work_zone_id || '없음'}`);
    console.log(`  Site Name: ${d.site_name || '없음'}`);
    console.log(`  BP Company: ${d.bp_company_id}`);
    console.log(`  EP Company: ${d.ep_company_id || '없음'}`);
    console.log('  전체 필드:', Object.keys(d).join(', '));
    console.log('');
  });

  console.log('\n=== PENDING_BP 상태 (오늘 만든 것 - 버튼 안 보임) ===\n');
  pendingBpOnes.forEach((d, i) => {
    console.log(`[${i+1}] ID: ${d.id}`);
    console.log(`  Created: ${d.created_at}`);
    console.log(`  Status: ${d.status}`);
    console.log(`  Worker: ${d.worker_id}`);
    console.log(`  Guide Worker: ${d.guide_worker_id || '없음'}`);
    console.log(`  Work Zone: ${d.work_zone_id || '없음'}`);
    console.log(`  Site Name: ${d.site_name || '없음'}`);
    console.log(`  BP Company: ${d.bp_company_id}`);
    console.log(`  EP Company: ${d.ep_company_id || '없음'}`);
    console.log('  전체 필드:', Object.keys(d).join(', '));
    console.log('');
  });

  // 차이점 분석
  if (activeOnes.length > 0 && pendingBpOnes.length > 0) {
    console.log('\n=== 차이점 분석 ===\n');
    const activeKeys = Object.keys(activeOnes[0]);
    const pendingKeys = Object.keys(pendingBpOnes[0]);

    const onlyInActive = activeKeys.filter(k => !pendingKeys.includes(k));
    const onlyInPending = pendingKeys.filter(k => !activeKeys.includes(k));

    if (onlyInActive.length > 0) {
      console.log('Active에만 있는 필드:', onlyInActive.join(', '));
    }
    if (onlyInPending.length > 0) {
      console.log('Pending_bp에만 있는 필드:', onlyInPending.join(', '));
    }

    // 값 비교
    console.log('\n주요 필드 값 비교:');
    ['status', 'work_zone_id', 'site_name', 'ep_company_id', 'guide_worker_id'].forEach(field => {
      const activeVal = activeOnes[0][field];
      const pendingVal = pendingBpOnes[0][field];
      const same = activeVal === pendingVal;
      console.log(`  ${field}:`);
      console.log(`    Active: ${activeVal || '(null)'}`);
      console.log(`    Pending: ${pendingVal || '(null)'}`);
      console.log(`    ${same ? '✅ 같음' : '❌ 다름'}`);
    });
  }
}

compareDeployments().catch(console.error);
