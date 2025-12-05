import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDeployments() {
  console.log('=== Deployment work_zone_id 상태 확인 ===\n');

  const { data: deployments, error } = await supabase
    .from('deployments')
    .select('id, worker_id, guide_worker_id, status, work_zone_id')
    .eq('status', 'active');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const total = deployments?.length || 0;
  console.log(`총 Active Deployment: ${total}개\n`);

  const withWorkZone = deployments?.filter(d => d.work_zone_id) || [];
  const withoutWorkZone = deployments?.filter(d => !d.work_zone_id) || [];

  console.log(`✅ work_zone_id 있음: ${withWorkZone.length}개`);
  console.log(`❌ work_zone_id 없음: ${withoutWorkZone.length}개\n`);

  if (withoutWorkZone.length > 0) {
    console.log('⚠️ work_zone_id가 없는 deployment:');
    withoutWorkZone.forEach(d => {
      console.log(`  - ID: ${d.id.substring(0, 8)}...`);
      console.log(`    worker_id: ${d.worker_id?.substring(0, 8) || 'null'}`);
      console.log(`    guide_worker_id: ${d.guide_worker_id?.substring(0, 8) || 'null'}`);
      console.log('');
    });
  }
}

checkDeployments().then(() => process.exit(0));
