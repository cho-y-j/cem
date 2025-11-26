/**
 * 수정된 getEmergencyAlerts 함수 테스트
 * (외래 키 제약조건 없이 수동으로 데이터 조합)
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

async function testGetEmergencyAlerts() {
  console.log('🔍 긴급 알림 조회 중 (수정된 방식)...\n');

  // 1. 긴급 알림 조회 (외래 키 제약조건 없이)
  const { data: alerts, error } = await supabase
    .from('emergency_alerts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ 긴급 알림 조회 실패:', error);
    return;
  }

  if (!alerts || alerts.length === 0) {
    console.log('⚠️  긴급 알림이 없습니다.\n');
    return;
  }

  console.log(`✅ 긴급 알림 ${alerts.length}개 조회 성공!\n`);

  // 2. 필요한 worker_id와 equipment_id 수집
  const workerIds = [...new Set(alerts.map(a => a.worker_id).filter(Boolean))];
  const equipmentIds = [...new Set(alerts.map(a => a.equipment_id).filter(Boolean))];

  console.log(`📋 Worker IDs: ${workerIds.length}개`);
  console.log(`📋 Equipment IDs: ${equipmentIds.length}개\n`);

  // 3. Workers 정보 조회
  const workersMap = new Map();
  if (workerIds.length > 0) {
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('id, name, phone')
      .in('id', workerIds);

    if (workersError) {
      console.error('❌ Workers 조회 실패:', workersError);
    } else if (workers) {
      workers.forEach(w => workersMap.set(w.id, w));
      console.log(`✅ Workers ${workers.length}개 조회 성공`);
    }
  }

  // 4. Equipment 정보 조회
  const equipmentMap = new Map();
  if (equipmentIds.length > 0) {
    const { data: equipment, error: equipmentError } = await supabase
      .from('equipment')
      .select('id, reg_num')
      .in('id', equipmentIds);

    if (equipmentError) {
      console.error('❌ Equipment 조회 실패:', equipmentError);
    } else if (equipment) {
      equipment.forEach(e => equipmentMap.set(e.id, e));
      console.log(`✅ Equipment ${equipment.length}개 조회 성공`);
    }
  }

  console.log('');

  // 5. 데이터 조합
  const enrichedAlerts = alerts.map(alert => ({
    ...alert,
    workers: workersMap.get(alert.worker_id) || null,
    equipment: equipmentMap.get(alert.equipment_id) || null,
  }));

  console.log('📋 긴급 알림 목록 (처음 5개):\n');
  enrichedAlerts.slice(0, 5).forEach((alert, index) => {
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

  console.log(`✅ 총 ${enrichedAlerts.length}개의 긴급 알림이 성공적으로 조회되었습니다!`);
}

testGetEmergencyAlerts()
  .then(() => {
    console.log('\n✅ 테스트 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  });
