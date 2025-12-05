import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkWorkZones() {
  console.log('작업 구역 데이터 확인 중...\n');

  const { data: workZones, error } = await supabase
    .from('work_zones')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`총 ${workZones?.length || 0}개의 작업 구역 발견\n`);

  if (workZones && workZones.length > 0) {
    workZones.forEach((zone, index) => {
      console.log(`[${index + 1}] ${zone.name}`);
      console.log(`  - ID: ${zone.id}`);
      console.log(`  - 활성 상태: ${zone.is_active ? '✅ 활성' : '❌ 비활성'}`);
      console.log(`  - GPS: ${zone.latitude}, ${zone.longitude}`);
      console.log(`  - 반경: ${zone.radius_meters}m`);
      console.log(`  - 생성일: ${zone.created_at}`);
      console.log('');
    });

    const activeZones = workZones.filter(z => z.is_active);
    console.log(`\n활성화된 작업 구역: ${activeZones.length}개`);

    if (activeZones.length === 0) {
      console.log('\n⚠️  문제 발견: 작업 구역은 있지만 모두 비활성 상태입니다!');
      console.log('해결: 작업 구역 관리에서 작업 구역을 활성화해야 합니다.');
    }
  } else {
    console.log('⚠️  문제 발견: 작업 구역이 하나도 없습니다!');
    console.log('해결: EP 계정으로 로그인하여 "작업 구역 관리"에서 작업 구역을 먼저 생성해야 합니다.');
  }
}

checkWorkZones().catch(console.error);
