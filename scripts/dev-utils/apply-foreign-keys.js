/**
 * Supabase에 Foreign Key 추가 스크립트
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import fs from 'fs';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyForeignKeys() {
  console.log('\n🔧 Foreign Key 추가 시작...\n');

  const statements = [
    // 기존 FK 삭제 (있다면)
    `ALTER TABLE "deployments" DROP CONSTRAINT IF EXISTS "deployments_equipment_id_equipment_id_fk"`,
    `ALTER TABLE "deployments" DROP CONSTRAINT IF EXISTS "deployments_worker_id_workers_id_fk"`,
    `ALTER TABLE "deployments" DROP CONSTRAINT IF EXISTS "deployments_guide_worker_id_workers_id_fk"`,
    `ALTER TABLE "deployments" DROP CONSTRAINT IF EXISTS "deployments_inspector_id_workers_id_fk"`,

    // FK 추가
    `ALTER TABLE "deployments" ADD CONSTRAINT "deployments_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    `ALTER TABLE "deployments" ADD CONSTRAINT "deployments_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    `ALTER TABLE "deployments" ADD CONSTRAINT "deployments_guide_worker_id_workers_id_fk" FOREIGN KEY ("guide_worker_id") REFERENCES "public"."workers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    `ALTER TABLE "deployments" ADD CONSTRAINT "deployments_inspector_id_workers_id_fk" FOREIGN KEY ("inspector_id") REFERENCES "public"."workers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
  ];

  for (const [index, sql] of statements.entries()) {
    console.log(`[${index + 1}/${statements.length}] 실행 중...`);
    console.log(`SQL: ${sql.substring(0, 80)}...`);

    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.error(`❌ 실패:`, error.message);
      // DROP IF EXISTS는 실패해도 괜찮음
      if (!sql.includes('DROP')) {
        throw error;
      }
    } else {
      console.log(`✅ 성공\n`);
    }
  }

  // 확인
  console.log('📋 Foreign Key 확인...\n');
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        con.conname AS constraint_name,
        att.attname AS column_name
      FROM pg_constraint con
      JOIN pg_class cl ON con.conrelid = cl.oid
      JOIN pg_namespace ns ON cl.relnamespace = ns.oid
      JOIN pg_attribute att ON att.attrelid = cl.oid AND att.attnum = ANY(con.conkey)
      WHERE ns.nspname = 'public'
        AND cl.relname = 'deployments'
        AND con.contype = 'f'
      ORDER BY con.conname
    `
  });

  if (error) {
    console.error('❌ 확인 실패:', error);
  } else {
    console.log('✅ Foreign Keys:\n');
    console.table(data);
  }

  console.log('\n✅ 완료\n');
}

applyForeignKeys().catch(error => {
  console.error('\n❌ 오류 발생:', error.message);
  console.log('\n📝 수동 실행 방법:');
  console.log('1. Supabase Dashboard → SQL Editor 열기');
  console.log('2. add-foreign-keys.sql 파일 내용 복사');
  console.log('3. SQL Editor에 붙여넣고 실행\n');
});
