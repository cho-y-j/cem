import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

console.log('🔍 Worker 사용자 확인 중...\n');

// users 테이블에서 worker 역할 조회
const { data: workers, error } = await supabase
  .from('users')
  .select('*')
  .eq('role', 'worker');

if (error) {
  console.error('❌ 에러:', error.message);
  process.exit(1);
}

if (!workers || workers.length === 0) {
  console.log('⚠️  등록된 Worker가 없습니다.\n');
  console.log('📝 Worker 사용자를 생성해야 합니다.');
} else {
  console.log(`✅ ${workers.length}명의 Worker 발견:\n`);
  workers.forEach((worker, index) => {
    console.log(`${index + 1}. ${worker.name || '이름 없음'}`);
    console.log(`   - ID: ${worker.id}`);
    console.log(`   - Email: ${worker.email || '없음'}`);
    console.log(`   - PIN: ${worker.pin || '⚠️ PIN 미설정'}`);
    console.log(`   - Company ID: ${worker.company_id || '없음'}`);
    console.log('');
  });
}

process.exit(0);
