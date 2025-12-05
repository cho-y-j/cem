/**
 * 최근 생성된 Workers 확인
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

async function checkLatestWorkers() {
  console.log('\n=== 최근 생성된 Workers 확인 ===\n');

  // 최근 생성된 workers
  const { data: workers } = await supabase
    .from('workers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log(`📋 최근 5명의 Workers:\n`);

  if (workers && workers.length > 0) {
    workers.forEach((worker, idx) => {
      console.log(`${idx + 1}. ${worker.name} (${worker.email || 'no email'})`);
      console.log(`   - Worker ID: ${worker.id}`);
      console.log(`   - User ID: ${worker.user_id || 'NULL'}`);
      console.log(`   - PIN: ${worker.pin_code || 'no PIN'}`);
      console.log(`   - Created: ${worker.created_at}`);
      console.log('');
    });
  }

  // 최근 생성된 users
  console.log(`\n📋 최근 5명의 Users:\n`);

  const { data: users } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (users && users.length > 0) {
    users.forEach((user, idx) => {
      console.log(`${idx + 1}. ${user.name} (${user.email})`);
      console.log(`   - User ID: ${user.id}`);
      console.log(`   - Role: ${user.role}`);
      console.log(`   - PIN: ${user.pin || 'no PIN'}`);
      console.log(`   - Created: ${user.created_at}`);
      console.log('');
    });
  }

  console.log('=== 완료 ===\n');
}

checkLatestWorkers().catch(console.error);
