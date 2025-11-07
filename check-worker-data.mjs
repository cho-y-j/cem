import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Worker 데이터 확인 중...\n');

// users 테이블에서 PIN 1234인 worker 찾기
const { data: usersWorker } = await supabase
  .from('users')
  .select('*')
  .eq('pin', '1234')
  .eq('role', 'worker')
  .single();

console.log('📋 users 테이블의 Worker:');
console.log(JSON.stringify(usersWorker, null, 2));
console.log('');

// workers 테이블에서 PIN 1234인 worker 찾기
const { data: workersWorker } = await supabase
  .from('workers')
  .select('*')
  .eq('pin_code', '1234');

console.log('📋 workers 테이블의 Worker:');
console.log(JSON.stringify(workersWorker, null, 2));
console.log('');

// 장비 배정 확인
if (workersWorker && workersWorker.length > 0) {
  const { data: equipment } = await supabase
    .from('equipment')
    .select('*')
    .eq('assigned_worker_id', workersWorker[0].id);

  console.log('🚜 배정된 장비:');
  console.log(JSON.stringify(equipment, null, 2));
}

process.exit(0);
