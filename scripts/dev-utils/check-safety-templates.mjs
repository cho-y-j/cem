import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTemplates() {
  console.log('\n=== 안전점검 템플릿 확인 ===\n');

  // 1. 모든 템플릿 조회
  const { data: templates, error: templatesError } = await supabase
    .from('safety_inspection_templates')
    .select('*')
    .order('created_at', { ascending: false });

  if (templatesError) {
    console.error('템플릿 조회 오류:', templatesError);
    return;
  }

  console.log(`총 ${templates.length}개의 템플릿이 있습니다.\n`);

  for (const template of templates) {
    console.log('---');
    console.log(`ID: ${template.id}`);
    console.log(`이름: ${template.name}`);
    console.log(`장비 종류 ID: ${template.equip_type_id || '없음 (범용 템플릿)'}`);
    console.log(`점검자 유형: ${template.inspector_type}`);
    console.log(`활성: ${template.is_active}`);
    console.log(`생성일: ${template.created_at}`);
  }

  console.log('\n=== 장비 종류 확인 ===\n');

  // 2. 모든 장비 종류 조회
  const { data: equipTypes, error: equipTypesError } = await supabase
    .from('equip_types')
    .select('*')
    .order('name');

  if (equipTypesError) {
    console.error('장비 종류 조회 오류:', equipTypesError);
    return;
  }

  console.log(`총 ${equipTypes.length}개의 장비 종류가 있습니다.\n`);

  for (const equipType of equipTypes) {
    console.log('---');
    console.log(`ID: ${equipType.id}`);
    console.log(`이름: ${equipType.name}`);
    console.log(`설명: ${equipType.description || '없음'}`);

    // 이 장비 종류를 사용하는 템플릿 찾기
    const matchingTemplates = templates.filter(t => t.equip_type_id === equipType.id);
    console.log(`연결된 템플릿: ${matchingTemplates.length}개`);
    if (matchingTemplates.length > 0) {
      matchingTemplates.forEach(t => {
        console.log(`  - ${t.name}`);
      });
    }
  }

  console.log('\n=== 템플릿 항목 개수 확인 ===\n');

  // 3. 각 템플릿의 항목 개수 확인
  for (const template of templates) {
    const { data: items, error: itemsError } = await supabase
      .from('safety_inspection_template_items')
      .select('*')
      .eq('template_id', template.id);

    if (!itemsError && items) {
      console.log(`${template.name}: ${items.length}개 항목`);
    }
  }

  console.log('\n완료!\n');
}

checkTemplates();
