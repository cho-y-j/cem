/**
 * PostgreSQL 직접 연결로 Foreign Key 추가
 */

import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL이 설정되지 않았습니다.');
  process.exit(1);
}

async function applyForeignKeys() {
  const client = new Client({ connectionString: databaseUrl });

  try {
    console.log('\n🔗 데이터베이스 연결 중...\n');
    await client.connect();
    console.log('✅ 연결 성공\n');

    console.log('🔧 Foreign Key 추가 시작...\n');

    // 1. 기존 FK 삭제
    console.log('[1/8] 기존 FK 삭제 중...');
    await client.query(`ALTER TABLE "deployments" DROP CONSTRAINT IF EXISTS "deployments_equipment_id_equipment_id_fk"`);
    await client.query(`ALTER TABLE "deployments" DROP CONSTRAINT IF EXISTS "deployments_worker_id_workers_id_fk"`);
    await client.query(`ALTER TABLE "deployments" DROP CONSTRAINT IF EXISTS "deployments_guide_worker_id_workers_id_fk"`);
    await client.query(`ALTER TABLE "deployments" DROP CONSTRAINT IF EXISTS "deployments_inspector_id_workers_id_fk"`);
    console.log('✅ 기존 FK 삭제 완료\n');

    // 2. equipment_id FK
    console.log('[2/8] deployments.equipment_id → equipment.id FK 추가...');
    await client.query(`
      ALTER TABLE "deployments"
      ADD CONSTRAINT "deployments_equipment_id_equipment_id_fk"
      FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    console.log('✅ 추가 완료\n');

    // 3. worker_id FK
    console.log('[3/8] deployments.worker_id → workers.id FK 추가...');
    await client.query(`
      ALTER TABLE "deployments"
      ADD CONSTRAINT "deployments_worker_id_workers_id_fk"
      FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    console.log('✅ 추가 완료\n');

    // 4. guide_worker_id FK ⭐ 핵심!
    console.log('[4/8] deployments.guide_worker_id → workers.id FK 추가...');
    await client.query(`
      ALTER TABLE "deployments"
      ADD CONSTRAINT "deployments_guide_worker_id_workers_id_fk"
      FOREIGN KEY ("guide_worker_id") REFERENCES "public"."workers"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    console.log('✅ 추가 완료\n');

    // 5. inspector_id FK
    console.log('[5/8] deployments.inspector_id → workers.id FK 추가...');
    await client.query(`
      ALTER TABLE "deployments"
      ADD CONSTRAINT "deployments_inspector_id_workers_id_fk"
      FOREIGN KEY ("inspector_id") REFERENCES "public"."workers"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    console.log('✅ 추가 완료\n');

    // 6. 확인
    console.log('[6/8] Foreign Key 확인 중...\n');
    const result = await client.query(`
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
    `);

    console.log('✅ Deployments 테이블 Foreign Keys:\n');
    console.table(result.rows);

    console.log('\n✅ 모든 Foreign Key 추가 완료!\n');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

applyForeignKeys().catch(console.error);
