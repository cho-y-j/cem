import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkInspections() {
  console.log('\n=== 안전점검 데이터 확인 ===\n');

  // 모든 점검 조회
  const { data: inspections, error } = await supabase
    .from('safety_inspections')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('점검 조회 오류:', error);
    return;
  }

  console.log(`전체 점검 기록: ${inspections?.length || 0}개\n`);

  if (!inspections || inspections.length === 0) {
    console.log('⚠️ 점검 기록이 없습니다.');
    console.log('점검원이 모바일에서 점검을 작성하고 제출해야 합니다.\n');
    return;
  }

  // 상태별 분류
  const byStatus = {
    draft: 0,
    submitted: 0,
    reviewed: 0,
  };

  inspections.forEach(i => {
    byStatus[i.status] = (byStatus[i.status] || 0) + 1;
  });

  console.log('📊 상태별 분류:');
  console.log(`  - 임시저장 (draft): ${byStatus.draft}개`);
  console.log(`  - 제출됨 (submitted): ${byStatus.submitted}개`);
  console.log(`  - 확인완료 (reviewed): ${byStatus.reviewed}개\n`);

  // 최근 점검 5개 출력
  console.log('📋 최근 점검 기록:\n');
  inspections.slice(0, 5).forEach((inspection, idx) => {
    console.log(`${idx + 1}. ID: ${inspection.id}`);
    console.log(`   차량번호: ${inspection.vehicle_number}`);
    console.log(`   점검일: ${inspection.inspection_date}`);
    console.log(`   상태: ${inspection.status}`);
    console.log(`   점검 빈도: ${inspection.check_frequency}`);
    console.log(`   제출일시: ${inspection.submitted_at || '미제출'}`);
    console.log(`   확인일시: ${inspection.reviewed_at || '미확인'}`);
    console.log('---');
  });

  console.log('\n✅ 확인 완료!\n');
}

checkInspections();
