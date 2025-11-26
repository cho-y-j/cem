/**
 * 긴급 알림 조회 테스트 스크립트
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

async function checkEmergencyAlerts() {
  console.log('🔍 긴급 알림 조회 중...\n');

  // 1. 모든 긴급 알림 조회
  const { data: allAlerts, error: allError } = await supabase
    .from('emergency_alerts')
    .select(`
      *,
      workers:worker_id (id, name, phone),
      equipment:equipment_id (id, reg_num)
    `)
    .order('created_at', { ascending: false });

  if (allError) {
    console.error('❌ 긴급 알림 조회 실패:', allError);
    return;
  }

  console.log(`📊 전체 긴급 알림 개수: ${allAlerts?.length || 0}\n`);

  if (!allAlerts || allAlerts.length === 0) {
    console.log('⚠️  긴급 알림이 없습니다.\n');
    return;
  }

  // 2. 활성 알림만 조회
  const activeAlerts = allAlerts.filter(a => a.status === 'active');
  console.log(`🚨 활성 알림 개수: ${activeAlerts.length}\n`);

  // 3. 알림 상세 출력
  console.log('📋 긴급 알림 목록:\n');
  allAlerts.forEach((alert, index) => {
    console.log(`${index + 1}. ${alert.alert_type} - ${alert.status}`);
    console.log(`   ID: ${alert.id}`);
    console.log(`   Worker: ${alert.workers?.name || 'Unknown'} (${alert.worker_id})`);
    console.log(`   Equipment: ${alert.equipment?.reg_num || 'Unknown'} (${alert.equipment_id})`);
    console.log(`   Description: ${alert.description || 'N/A'}`);
    console.log(`   Created: ${new Date(alert.created_at).toLocaleString('ko-KR')}`);
    if (alert.latitude && alert.longitude) {
      console.log(`   Location: ${alert.latitude}, ${alert.longitude}`);
    }
    console.log('');
  });
}

checkEmergencyAlerts()
  .then(() => {
    console.log('✅ 조회 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  });
