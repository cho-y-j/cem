import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDeploymentEnum() {
  console.log('deployment_status enum 확인 중...\n');

  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        typname,
        enumlabel,
        enumsortorder
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE typname = 'deployment_status'
      ORDER BY enumsortorder;
    `
  });

  if (error) {
    console.error('❌ RPC 호출 실패. 직접 쿼리로 확인...\n');

    // 대체 방법: deployments 테이블의 status 컬럼 정보 확인
    const { data: columnInfo, error: columnError } = await supabase
      .from('deployments')
      .select('status')
      .limit(5);

    if (columnError) {
      console.error('❌ Error:', columnError);
      return;
    }

    console.log('현재 deployments.status 값들:');
    columnInfo?.forEach((row, i) => {
      console.log(`  [${i+1}] ${row.status}`);
    });

    console.log('\n⚠️  enum 타입 확인이 필요합니다!');
    console.log('Supabase SQL Editor에서 다음 쿼리를 실행하세요:');
    console.log(`
SELECT
  typname,
  enumlabel,
  enumsortorder
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname = 'deployment_status'
ORDER BY enumsortorder;
    `);

    console.log('\n만약 pending_bp가 없다면, add-pending-bp-status.sql을 실행하세요!');
    return;
  }

  console.log('deployment_status enum 값들:');
  data?.forEach((row) => {
    console.log(`  - ${row.enumlabel} (순서: ${row.enumsortorder})`);
  });

  const hasPendingBp = data?.some(row => row.enumlabel === 'pending_bp');

  if (hasPendingBp) {
    console.log('\n✅ pending_bp 값이 존재합니다!');
  } else {
    console.log('\n❌ pending_bp 값이 없습니다!');
    console.log('add-pending-bp-status.sql을 Supabase SQL Editor에서 실행하세요!');
  }
}

checkDeploymentEnum().catch(console.error);
