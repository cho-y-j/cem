import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 데이터베이스 테이블 확인 중...\n');

// 주요 테이블들 확인
const tables = [
  'users',
  'companies',
  'equipment',
  'workers',
  'deployments',
  'work_sessions',
  'work_confirmations_daily',
  'work_confirmations_monthly',
  'equipment_inspections_worker',
  'equipment_inspections_inspector'
];

for (const table of tables) {
  try {
    const { error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`❌ ${table}: 없음 (${error.message})`);
    } else {
      console.log(`✅ ${table}: 있음 (${count || 0}개 레코드)`);
    }
  } catch (err) {
    console.log(`❌ ${table}: 오류 - ${err.message}`);
  }
}

process.exit(0);
