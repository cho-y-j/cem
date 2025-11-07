import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Supabase SQL로 컬럼 정보 직접 조회
const { data, error } = await supabase.rpc('exec_sql', {
  sql: `
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'deployments'
    ORDER BY ordinal_position;
  `
});

if (error) {
  console.error('RPC 실패, 다른 방법 시도...');

  // INSERT 시도로 컬럼 확인
  const { error: err2 } = await supabase
    .from('deployments')
    .insert({ id: 'test' });

  if (err2) console.log('\n컬럼 정보:', err2.message);
} else {
  console.log('✅ Deployments 테이블 컬럼:\n');
  data.forEach(col => {
    console.log(`${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
  });
}

process.exit(0);
