/**
 * 운전자 점검 템플릿 및 장비 타입 확인
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

async function checkDriverTemplates() {
  console.log('\n=== 운전자 점검 템플릿 확인 ===\n');

  // 1. 01@test.com worker의 장비 확인
  const { data: worker } = await supabase
    .from('workers')
    .select('id, name')
    .eq('email', '01@test.com')
    .maybeSingle();

  if (!worker) {
    console.log('❌ worker를 찾을 수 없습니다.');
    return;
  }

  console.log('✅ Worker:', worker.name);

  // 2. 이 worker의 deployment 확인
  const { data: deployment } = await supabase
    .from('deployments')
    .select('id, equipment_id, status')
    .eq('worker_id', worker.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!deployment) {
    console.log('\n❌ Active deployment가 없습니다.');
    return;
  }

  console.log('\n✅ Deployment:', deployment.id);

  // 3. Equipment 정보 확인
  const { data: equipment } = await supabase
    .from('equipment')
    .select('id, reg_num, equip_type_id')
    .eq('id', deployment.equipment_id)
    .maybeSingle();

  if (!equipment) {
    console.log('\n❌ Equipment를 찾을 수 없습니다.');
    return;
  }

  console.log('\n✅ Equipment:', {
    id: equipment.id,
    reg_num: equipment.reg_num,
    equip_type_id: equipment.equip_type_id,
  });

  // 4. Equipment Type 확인
  const { data: equipType } = await supabase
    .from('equip_types')
    .select('id, name, description')
    .eq('id', equipment.equip_type_id)
    .maybeSingle();

  if (!equipType) {
    console.log('\n❌ Equipment Type을 찾을 수 없습니다.');
  } else {
    console.log('\n✅ Equipment Type:', {
      id: equipType.id,
      name: equipType.name,
      description: equipType.description,
    });
  }

  // 5. driver_inspection_templates 테이블 확인
  const { data: allTemplates, error: templatesError } = await supabase
    .from('driver_inspection_templates')
    .select('id, name, description, equip_type_id, is_active');

  if (templatesError) {
    console.error('\n❌ 템플릿 조회 에러:', templatesError.message);
    return;
  }

  console.log(`\n📋 전체 템플릿 ${allTemplates?.length || 0}개:`);
  if (allTemplates && allTemplates.length > 0) {
    allTemplates.forEach((t) => {
      console.log(`   - ${t.name}`);
      console.log(`     equip_type_id: ${t.equip_type_id || '(전체 장비)'}`);
      console.log(`     is_active: ${t.is_active}`);
    });
  } else {
    console.log('   ⚠️  템플릿이 하나도 없습니다!');
  }

  // 6. 활성 템플릿만 확인
  const { data: activeTemplates } = await supabase
    .from('driver_inspection_templates')
    .select('id, name, equip_type_id, is_active')
    .eq('is_active', true);

  console.log(`\n✅ 활성 템플릿 ${activeTemplates?.length || 0}개:`);
  if (activeTemplates && activeTemplates.length > 0) {
    activeTemplates.forEach((t) => {
      console.log(`   - ${t.name} (equip_type_id: ${t.equip_type_id || '전체'})`);
    });
  }

  // 7. 이 장비 타입에 맞는 템플릿 확인
  if (equipment.equip_type_id) {
    const matchingTemplates = activeTemplates?.filter(
      (t) => !t.equip_type_id || t.equip_type_id === equipment.equip_type_id
    );

    console.log(`\n🎯 장비 타입(${equipType?.name})에 맞는 템플릿 ${matchingTemplates?.length || 0}개:`);
    if (matchingTemplates && matchingTemplates.length > 0) {
      matchingTemplates.forEach((t) => {
        console.log(`   ✅ ${t.name}`);
      });
    } else {
      console.log('   ⚠️  이 장비 타입에 맞는 템플릿이 없습니다!');
      console.log('\n🔧 해결 방법:');
      console.log('   1. equip_type_id가 NULL인 "전체 장비용" 템플릿 생성');
      console.log(`   2. equip_type_id="${equipment.equip_type_id}"인 전용 템플릿 생성`);
    }
  }

  console.log('\n=== 완료 ===\n');
}

checkDriverTemplates();
