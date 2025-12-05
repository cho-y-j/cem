/**
 * emergency_alerts 테이블 존재 확인
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL 또는 SUPABASE_KEY가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  console.log('🔍 emergency_alerts 테이블 확인 중...\n');

  // 1. 간단하게 조회 (외래 키 없이)
  const { data, error, count } = await supabase
    .from('emergency_alerts')
    .select('*', { count: 'exact' })
    .limit(5);

  if (error) {
    console.error('❌ 테이블 조회 실패:', error);
    console.log('\n💡 테이블이 존재하지 않거나 권한이 없습니다.');
    return;
  }

  console.log(`✅ 테이블이 존재합니다!`);
  console.log(`📊 총 레코드 수: ${count}\n`);

  if (data && data.length > 0) {
    console.log('📋 최근 5개 레코드:\n');
    data.forEach((alert, index) => {
      console.log(`${index + 1}. ${alert.alert_type || 'N/A'} - ${alert.status || 'N/A'}`);
      console.log(`   ID: ${alert.id}`);
      console.log(`   Worker ID: ${alert.worker_id}`);
      console.log(`   Equipment ID: ${alert.equipment_id || 'N/A'}`);
      console.log(`   Created: ${alert.created_at}`);
      console.log('');
    });
  } else {
    console.log('⚠️  데이터가 없습니다.\n');
  }
}

checkTable()
  .then(() => {
    console.log('✅ 확인 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  });
