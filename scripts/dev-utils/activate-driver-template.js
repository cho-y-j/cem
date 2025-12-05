/**
 * 덤프카용 템플릿 활성화
 */
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function activateTemplate() {
  console.log('\n=== 템플릿 활성화 ===\n');

  // 덤프카 타입 ID
  const dumpTruckTypeId = 'xggVfqbLm8PM2_AcIJjz9';

  // 1. 덤프카용 템플릿 중 하나 선택 (esms테스트)
  const { data: templates } = await supabase
    .from('driver_inspection_templates')
    .select('id, name, equip_type_id, is_active')
    .eq('equip_type_id', dumpTruckTypeId)
    .order('created_at', { ascending: false });

  if (!templates || templates.length === 0) {
    console.log('❌ 덤프카용 템플릿이 없습니다.');
    return;
  }

  console.log(`📋 덤프카용 템플릿 ${templates.length}개 발견:`);
  templates.forEach((t, idx) => {
    console.log(`   ${idx + 1}. ${t.name} (활성: ${t.is_active})`);
  });

  // 첫 번째 템플릿 활성화
  const templateToActivate = templates[0];
  console.log(`\n🔄 "${templateToActivate.name}" 템플릿 활성화 중...`);

  const { error } = await supabase
    .from('driver_inspection_templates')
    .update({ is_active: true })
    .eq('id', templateToActivate.id);

  if (error) {
    console.error('❌ 활성화 실패:', error.message);
    return;
  }

  console.log('✅ 템플릿 활성화 완료!');

  // 확인
  const { data: updated } = await supabase
    .from('driver_inspection_templates')
    .select('id, name, is_active')
    .eq('id', templateToActivate.id)
    .single();

  console.log('✅ 확인:', updated);

  console.log('\n=== 완료 ===\n');
}

activateTemplate();
