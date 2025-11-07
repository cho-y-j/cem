import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Worker 데이터 확인 중...\n');

// workers 테이블 조회
const { data: workers, error } = await supabase
  .from('workers')
  .select('*')
  .order('created_at', { ascending: false });

if (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

console.log(`총 ${workers.length}개의 Worker 레코드:\n`);

workers.forEach((w, index) => {
  console.log(`${index + 1}. ID: ${w.id}`);
  console.log(`   이름: ${w.name}`);
  console.log(`   user_id: ${w.user_id || '❌ NULL'}`);
  console.log(`   PIN: ${w.pin || '없음'}`);
  console.log('');
});

// user_id로 users 확인
console.log('\n📋 Users 테이블 확인:\n');

const { data: users } = await supabase
  .from('users')
  .select('id, email, role')
  .eq('role', 'worker');

users?.forEach(u => {
  console.log(`  - ID: ${u.id}, Email: ${u.email}`);
});

// deployments 확인
console.log('\n🚀 Deployments 확인:\n');

const { data: deployments } = await supabase
  .from('deployments')
  .select('id, worker_id, status, site_name')
  .eq('status', 'active');

deployments?.forEach(d => {
  console.log(`  - ID: ${d.id}`);
  console.log(`    Worker: ${d.worker_id}`);
  console.log(`    Site: ${d.site_name}`);
  console.log('');
});

process.exit(0);
