import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // service role key 사용
);

console.log('🔍 데이터베이스 스키마 확인 중...\n');

// equipment 테이블 스키마 확인
const { data, error } = await supabase
  .rpc('exec_sql', {
    sql: `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'equipment'
      ORDER BY ordinal_position;
    `
  });

if (error) {
  // rpc가 없으면 직접 조회
  const { data: equipment } = await supabase
    .from('equipment')
    .select('*')
    .limit(1);

  if (equipment && equipment.length > 0) {
    console.log('✅ Equipment 테이블 컬럼:');
    console.log(Object.keys(equipment[0]).join(', '));
  }
} else {
  console.log('✅ Equipment 테이블 스키마:');
  data.forEach(col => {
    console.log(`- ${col.column_name} (${col.data_type})`);
  });
}

process.exit(0);
