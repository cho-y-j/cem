/**
 * Deployments 테이블의 Foreign Key 확인
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkForeignKeys() {
  console.log('\n🔍 Deployments 테이블 Foreign Keys 확인\n');

  // PostgreSQL 시스템 카탈로그에서 foreign key 정보 조회
  const { data, error } = await supabase.rpc('check_fk', {
    query: `
      SELECT
        con.conname AS constraint_name,
        att.attname AS column_name,
        cl.relname AS table_name,
        ref_cl.relname AS referenced_table,
        ref_att.attname AS referenced_column
      FROM pg_constraint con
      JOIN pg_class cl ON con.conrelid = cl.oid
      JOIN pg_namespace ns ON cl.relnamespace = ns.oid
      JOIN pg_attribute att ON att.attrelid = cl.oid AND att.attnum = ANY(con.conkey)
      JOIN pg_class ref_cl ON con.confrelid = ref_cl.oid
      JOIN pg_attribute ref_att ON ref_att.attrelid = ref_cl.oid AND ref_att.attnum = ANY(con.confkey)
      WHERE ns.nspname = 'public'
        AND cl.relname = 'deployments'
        AND con.contype = 'f'
      ORDER BY con.conname, att.attnum;
    `
  });

  if (error) {
    console.log('⚠️  RPC 함수로 조회 실패. 직접 쿼리를 실행합니다.\n');

    // Alternative: 간단한 테스트 쿼리로 확인
    console.log('📋 Deployments 샘플 데이터 조회...\n');

    const { data: deployment, error: depError } = await supabase
      .from('deployments')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (depError) {
      console.error('❌ Deployments 조회 실패:', depError);
    } else {
      console.log('✅ Deployments 테이블 접근 가능');
      console.log('컬럼:', Object.keys(deployment || {}));
    }

    // worker_id 관계 테스트
    console.log('\n📋 worker_id 조인 테스트...\n');
    const { data: test1, error: err1 } = await supabase
      .from('deployments')
      .select(`
        id,
        worker_id,
        worker:workers(id, name)
      `)
      .limit(1)
      .maybeSingle();

    if (err1) {
      console.error('❌ worker_id 조인 실패:', err1.message);
      console.log('세부 정보:', err1);
    } else {
      console.log('✅ worker_id 조인 성공');
    }

    // guide_worker_id 관계 테스트 (명시적 FK 이름)
    console.log('\n📋 guide_worker_id 조인 테스트 (명시적 FK 이름)...\n');
    const { data: test2, error: err2 } = await supabase
      .from('deployments')
      .select(`
        id,
        guide_worker_id,
        guide_worker:workers!deployments_guide_worker_id_fkey(id, name)
      `)
      .limit(1)
      .maybeSingle();

    if (err2) {
      console.error('❌ guide_worker_id 조인 실패 (명시적 FK 이름):', err2.message);
      console.log('세부 정보:', err2);
    } else {
      console.log('✅ guide_worker_id 조인 성공 (명시적 FK 이름)');
    }

    // guide_worker_id 관계 테스트 (자동 감지)
    console.log('\n📋 guide_worker_id 조인 테스트 (자동 감지)...\n');
    const { data: test3, error: err3 } = await supabase
      .from('deployments')
      .select(`
        id,
        guide_worker_id,
        workers!guide_worker_id(id, name)
      `)
      .limit(1)
      .maybeSingle();

    if (err3) {
      console.error('❌ guide_worker_id 조인 실패 (자동 감지):', err3.message);
      console.log('세부 정보:', err3);
    } else {
      console.log('✅ guide_worker_id 조인 성공 (자동 감지)');
    }

  } else {
    console.log('✅ Foreign Keys:\n');
    console.table(data);
  }

  console.log('\n✅ 확인 완료\n');
}

checkForeignKeys().catch(console.error);
