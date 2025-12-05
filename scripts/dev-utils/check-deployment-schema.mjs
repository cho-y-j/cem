import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 deployments 테이블 스키마 확인...\n');

// 샘플 데이터 조회
const { data, error } = await supabase
  .from('deployments')
  .select('*')
  .limit(1);

if (error) {
  console.error('오류:', error);
} else if (data && data.length > 0) {
  console.log('✅ 테이블 구조:');
  console.log(JSON.stringify(data[0], null, 2));
  console.log('\n컬럼 목록:');
  console.log(Object.keys(data[0]).join(', '));
} else {
  console.log('테이블이 비어있습니다. 테이블 정보를 직접 조회합니다...');

  // 빈 insert로 컬럼 확인
  const { error: insertError } = await supabase
    .from('deployments')
    .insert({});

  if (insertError) {
    console.log('\n필수 컬럼 정보:');
    console.log(insertError.message);
  }
}

process.exit(0);
