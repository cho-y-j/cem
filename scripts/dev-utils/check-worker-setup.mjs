import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

console.log('🔍 Worker 설정 확인 중...\n');

// 1. Worker 확인
const { data: worker, error: workerError } = await supabase
  .from('users')
  .select('*')
  .eq('id', 'worker-test-001')
  .single();

if (workerError || !worker) {
  console.error('❌ Worker를 찾을 수 없습니다.');
  process.exit(1);
}

console.log(`✅ Worker 발견: ${worker.name} (${worker.id})`);
console.log(`   PIN: ${worker.pin}\n`);

// 2. 장비 확인
const { data: equipment, error: equipError } = await supabase
  .from('equipment')
  .select('*')
  .eq('assigned_worker_id', 'worker-test-001');

if (equipError) {
  console.error('❌ 장비 조회 에러:', equipError.message);
}

if (!equipment || equipment.length === 0) {
  console.log('⚠️  Worker에게 배정된 장비가 없습니다.\n');

  // 전체 장비 조회
  const { data: allEquipment } = await supabase
    .from('equipment')
    .select('*')
    .limit(5);

  if (!allEquipment || allEquipment.length === 0) {
    console.log('💡 시스템에 등록된 장비가 없습니다.');
    console.log('   Admin 대시보드에서 장비를 먼저 등록해주세요.\n');
  } else {
    console.log(`📋 등록된 장비 목록 (총 ${allEquipment.length}개):\n`);
    allEquipment.forEach((eq, idx) => {
      console.log(`${idx + 1}. ID: ${eq.id}`);
      console.log(`   등록번호: ${eq.reg_num || '없음'}`);
      console.log(`   배정된 운전자: ${eq.assigned_worker_id || '없음'}`);
      console.log('');
    });

    console.log('💡 장비를 Worker에게 배정하려면:');
    console.log('   Admin 대시보드 → 장비 관리 → 운전자 배정\n');
  }
} else {
  console.log(`✅ Worker에게 배정된 장비:\n`);
  equipment.forEach((eq, idx) => {
    console.log(`${idx + 1}. ID: ${eq.id}`);
    console.log(`   등록번호: ${eq.reg_num || '없음'}`);
    console.log(`   상태: ${eq.status || '없음'}`);
    console.log('');
  });
}

process.exit(0);
