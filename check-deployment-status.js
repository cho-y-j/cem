import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDeploymentStatus() {
  console.log('투입 현황 상태 확인 중...\n');

  const { data: deployments, error } = await supabase
    .from('deployments')
    .select('id, status, worker_id, guide_worker_id, bp_company_id, ep_company_id, work_zone_id')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`총 ${deployments?.length || 0}개의 투입 발견\n`);

  if (deployments && deployments.length > 0) {
    deployments.forEach((dep, index) => {
      console.log(`[${index + 1}] ID: ${dep.id}`);
      console.log(`  - Status: ${dep.status}`);
      console.log(`  - Worker ID: ${dep.worker_id}`);
      console.log(`  - Guide Worker ID: ${dep.guide_worker_id || '없음'}`);
      console.log(`  - BP Company: ${dep.bp_company_id}`);
      console.log(`  - EP Company: ${dep.ep_company_id || '없음'}`);
      console.log(`  - Work Zone: ${dep.work_zone_id || '없음'}`);
      console.log('');
    });

    const statusCounts = deployments.reduce((acc, dep) => {
      acc[dep.status] = (acc[dep.status] || 0) + 1;
      return acc;
    }, {});

    console.log('\n상태별 개수:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}개`);
    });
  }
}

checkDeploymentStatus().catch(console.error);
