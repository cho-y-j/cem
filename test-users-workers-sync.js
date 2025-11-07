import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSync() {
  console.log('\n=== Users 테이블 ===');
  const { data: users } = await supabase.from('users').select('id, name, email, role');
  console.table(users);

  console.log('\n=== Workers 테이블 ===');
  const { data: workers } = await supabase.from('workers').select('id, name, email, pin_code, user_id');
  console.table(workers);

  console.log('\n=== 동기화 분석 ===');
  const workerUsers = users?.filter(u => u.role === 'worker' || u.role === 'inspector') || [];
  console.log(`Users 테이블의 worker/inspector: ${workerUsers.length}명`);
  console.log(`Workers 테이블의 레코드: ${workers?.length || 0}개`);

  // User_id 연결 확인
  const linkedWorkers = workers?.filter(w => w.user_id) || [];
  const unlinkedWorkers = workers?.filter(w => !w.user_id) || [];
  console.log(`\nWorkers 중 users와 연결된 것: ${linkedWorkers.length}개`);
  console.log(`Workers 중 연결 안 된 것: ${unlinkedWorkers.length}개`);

  if (unlinkedWorkers.length > 0) {
    console.log('\n❌ 연결 안 된 Workers:');
    console.table(unlinkedWorkers);
  }

  // Users에는 있는데 Workers에는 없는 경우
  const workersUserIds = new Set(workers?.map(w => w.user_id) || []);
  const missingInWorkers = workerUsers.filter(u => !workersUserIds.has(u.id));
  if (missingInWorkers.length > 0) {
    console.log('\n❌ Users에는 있지만 Workers에 없는 worker/inspector:');
    console.table(missingInWorkers);
  }
}

checkSync();
