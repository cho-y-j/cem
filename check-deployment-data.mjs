import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkData() {
  console.log('=== 1. Worker 사용자 확인 ===');
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'worker');
  
  console.log('Worker Users:', JSON.stringify(users, null, 2));

  console.log('\n=== 2. Workers 테이블 확인 ===');
  const { data: workers } = await supabase
    .from('workers')
    .select('*');
  
  console.log('Workers:', JSON.stringify(workers, null, 2));

  console.log('\n=== 3. Active Deployments 확인 ===');
  const { data: deployments } = await supabase
    .from('deployments')
    .select(`
      *,
      equipment:equipment!deployments_equipment_id_fkey(
        id,
        reg_num,
        equip_type:equip_types!equipment_equip_type_id_fkey(id, name)
      ),
      worker:workers!deployments_worker_id_fkey(id, name, user_id),
      bp_company:companies!deployments_bp_company_id_fkey(id, name)
    `)
    .eq('status', 'active');
  
  console.log('Active Deployments:', JSON.stringify(deployments, null, 2));

  // 특정 user_id로 조회 테스트
  if (users && users.length > 0) {
    const testUserId = users[0].id;
    console.log(`\n=== 4. User ID로 Worker 찾기 (${testUserId}) ===`);
    
    const { data: worker, error } = await supabase
      .from('workers')
      .select('*')
      .eq('user_id', testUserId)
      .single();
    
    if (error) {
      console.error('오류:', error.message);
    } else {
      console.log('찾은 Worker:', JSON.stringify(worker, null, 2));

      if (worker) {
        console.log(`\n=== 5. Worker의 Deployments (worker_id: ${worker.id}) ===`);
        
        const { data: workerDeps, error: depsError } = await supabase
          .from('deployments')
          .select(`
            *,
            equipment:equipment!deployments_equipment_id_fkey(
              id,
              reg_num,
              equip_type:equip_types!equipment_equip_type_id_fkey(id, name)
            )
          `)
          .eq('worker_id', worker.id)
          .eq('status', 'active');
        
        if (depsError) {
          console.error('오류:', depsError);
        } else {
          console.log('Worker의 Active Deployments:', JSON.stringify(workerDeps, null, 2));
        }
      }
    }
  }
}

checkData().catch(console.error);
