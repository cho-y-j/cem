/**
 * Workers와 Users 테이블 관계 확인
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

async function checkRelation() {
  console.log('\n=== Workers ↔ Users 관계 확인 ===\n');

  // 1. Workers 테이블 조회
  const { data: workers } = await supabase
    .from('workers')
    .select('*')
    .order('created_at', { ascending: false });

  console.log(`📋 Workers 테이블: ${workers?.length || 0}명\n`);

  if (workers && workers.length > 0) {
    workers.forEach((worker, idx) => {
      console.log(`${idx + 1}. ${worker.name} (${worker.email || 'no email'})`);
      console.log(`   - Worker ID: ${worker.id}`);
      console.log(`   - User ID: ${worker.user_id || '❌ NULL'}`);
      console.log(`   - PIN: ${worker.pin_code || 'no PIN'}`);
      console.log('');
    });
  }

  // 2. Users 테이블 조회
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  console.log(`📋 Users 테이블: ${users?.length || 0}명\n`);

  if (users && users.length > 0) {
    users.forEach((user, idx) => {
      console.log(`${idx + 1}. ${user.name} (${user.email})`);
      console.log(`   - User ID: ${user.id}`);
      console.log(`   - Role: ${user.role}`);
      console.log('');
    });
  }

  // 3. 관계 확인
  console.log('🔗 관계 확인:\n');

  let orphanWorkers = 0;
  let linkedWorkers = 0;

  if (workers) {
    for (const worker of workers) {
      if (worker.user_id) {
        const user = users?.find(u => u.id === worker.user_id);

        if (user) {
          console.log(`✅ ${worker.name} → ${user.email} (연결됨)`);
          linkedWorkers++;
        } else {
          console.log(`⚠️  ${worker.name} → user_id: ${worker.user_id} (사용자 없음 - ORPHAN!)`);
          orphanWorkers++;
        }
      } else {
        console.log(`❌ ${worker.name} → user_id가 NULL`);
        orphanWorkers++;
      }
    }
  }

  console.log(`\n📊 통계:`);
  console.log(`   - 연결된 Workers: ${linkedWorkers}명`);
  console.log(`   - Orphan Workers: ${orphanWorkers}명`);

  // 4. Deployments 확인
  console.log('\n📋 Deployments 확인...\n');

  const { data: deployments } = await supabase
    .from('deployments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (deployments && deployments.length > 0) {
    for (const deployment of deployments) {
      const worker = workers?.find(w => w.id === deployment.worker_id);
      console.log(`Deployment: ${deployment.id}`);
      console.log(`   - Worker ID: ${deployment.worker_id}`);
      console.log(`   - Worker: ${worker ? `${worker.name} (${worker.email || 'no email'})` : '❌ Worker 없음'}`);
      console.log(`   - Status: ${deployment.status}`);
      console.log('');
    }
  } else {
    console.log('   (Deployment 없음)');
  }

  console.log('\n=== 확인 완료 ===\n');
}

checkRelation().catch(console.error);
