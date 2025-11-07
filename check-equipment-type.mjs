import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkEquipment() {
  console.log('\n=== 등록된 장비 확인 ===\n');

  // 모든 장비 조회
  const { data: equipment, error } = await supabase
    .from('equipment')
    .select('id, reg_num, equip_type_id, specification')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('장비 조회 오류:', error);
    return;
  }

  console.log(`최근 등록된 장비 ${equipment.length}개:\n`);

  // 장비 종류 정보도 가져오기
  const { data: equipTypes } = await supabase
    .from('equip_types')
    .select('*');

  const equipTypeMap = new Map(equipTypes?.map(et => [et.id, et]) || []);

  for (const eq of equipment) {
    const equipType = equipTypeMap.get(eq.equip_type_id);

    console.log('---');
    console.log(`차량번호: ${eq.reg_num}`);
    console.log(`장비 종류 ID: ${eq.equip_type_id}`);
    console.log(`장비 종류명: ${equipType?.name || '없음'}`);
    console.log(`규격: ${eq.specification || '없음'}`);

    // 이 장비에 적용 가능한 템플릿 찾기
    const { data: templates } = await supabase
      .from('safety_inspection_templates')
      .select('*')
      .eq('inspector_type', 'inspector')
      .eq('is_active', true)
      .or(`equip_type_id.eq.${eq.equip_type_id},equip_type_id.is.null`);

    console.log(`적용 가능한 템플릿: ${templates?.length || 0}개`);
    if (templates && templates.length > 0) {
      templates.forEach(t => {
        console.log(`  - ${t.name} (${t.equip_type_id ? '전용' : '범용'})`);
      });
    }
  }

  console.log('\n완료!\n');
}

checkEquipment();
