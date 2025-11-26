/**
 * 테스트용 긴급 알림 생성 스크립트
 *
 * 실행 방법:
 * node test-emergency-create.js
 */

import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';
import dotenv from 'dotenv';

// .env 파일 로드
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL 또는 SUPABASE_ANON_KEY가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestEmergencyAlert() {
  console.log('🔍 Active deployment 조회 중...\n');

  // 1. Active deployment 조회
  const { data: deployments, error: deploymentError } = await supabase
    .from('deployments')
    .select(`
      id,
      worker_id,
      equipment_id,
      workers:worker_id (id, name),
      equipment:equipment_id (id, reg_num)
    `)
    .eq('status', 'active')
    .limit(1);

  if (deploymentError) {
    console.error('❌ Deployment 조회 실패:', deploymentError);
    return;
  }

  if (!deployments || deployments.length === 0) {
    console.error('❌ Active deployment가 없습니다.');
    return;
  }

  const deployment = deployments[0];
  console.log('✅ Active deployment 발견:');
  console.log(`   - Worker: ${deployment.workers?.name} (${deployment.worker_id})`);
  console.log(`   - Equipment: ${deployment.equipment?.reg_num} (${deployment.equipment_id})`);
  console.log('');

  // 2. 긴급 알림 생성
  const emergencyAlert = {
    id: `emergency-${nanoid()}`,
    worker_id: deployment.worker_id,
    equipment_id: deployment.equipment_id,
    alert_type: '사고',
    latitude: 37.5665,  // 서울 시청 좌표 (테스트용)
    longitude: 126.9780,
    description: '테스트 긴급 알림 - 사고 발생 신고',
    status: 'active',
    created_at: new Date().toISOString(),
  };

  console.log('🚨 긴급 알림 생성 중...\n');

  const { data: createdAlert, error: createError } = await supabase
    .from('emergency_alerts')
    .insert(emergencyAlert)
    .select()
    .single();

  if (createError) {
    console.error('❌ 긴급 알림 생성 실패:', createError);
    return;
  }

  console.log('✅ 긴급 알림이 성공적으로 생성되었습니다!');
  console.log('');
  console.log('📋 생성된 알림 정보:');
  console.log(`   - ID: ${createdAlert.id}`);
  console.log(`   - Type: ${createdAlert.alert_type}`);
  console.log(`   - Worker: ${deployment.workers?.name}`);
  console.log(`   - Equipment: ${deployment.equipment?.reg_num}`);
  console.log(`   - Status: ${createdAlert.status}`);
  console.log('');
  console.log('🔗 확인 방법:');
  console.log('   1. EP로 로그인: http://localhost:3000 (ep@test.com / test123)');
  console.log('   2. EP 대시보드에서 긴급 알림 섹션 확인');
  console.log('   3. 또는 http://localhost:3000/emergency-alerts 페이지 방문');
  console.log('');
}

// 스크립트 실행
createTestEmergencyAlert()
  .then(() => {
    console.log('✅ 스크립트 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 스크립트 실행 중 오류:', error);
    process.exit(1);
  });
