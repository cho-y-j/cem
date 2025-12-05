import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createSkyEquipmentTemplate() {
  console.log('=== 스카이장비 안전점검 템플릿 생성 ===\n');

  // 1. 장비 타입 찾기 (스카이장비)
  console.log('1. 장비 타입 조회 중...');
  const { data: equipTypes } = await supabase
    .from('equip_types')
    .select('*')
    .ilike('name', '%스카이%');

  let equipTypeId = null;
  if (equipTypes && equipTypes.length > 0) {
    equipTypeId = equipTypes[0].id;
    console.log(`✓ 스카이장비 타입 찾음: ${equipTypes[0].name} (${equipTypeId})`);
  } else {
    console.log('⚠️  스카이장비 타입을 찾을 수 없습니다. 전체 장비용으로 생성합니다.');
  }

  // 2. 템플릿 생성
  console.log('\n2. 템플릿 생성 중...');
  const templateId = nanoid();

  const { data: template, error: templateError } = await supabase
    .from('safety_inspection_templates')
    .insert({
      id: templateId,
      name: '스카이장비 안전점검',
      equip_type_id: equipTypeId,
      inspector_type: 'inspector',
      description: '고소작업대(스카이장비) 일일/주별/월별 안전점검 체크리스트',
      is_active: true,
      created_by: 'admin-test-001',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (templateError) {
    console.error('❌ 템플릿 생성 실패:', templateError);
    return;
  }

  console.log(`✓ 템플릿 생성 완료: ${template.id}`);

  // 3. 체크 항목 생성
  console.log('\n3. 체크 항목 생성 중...\n');

  const items = [
    // 일별 점검 항목
    {
      category: '일일점검',
      item_text: '작업계획서 비치',
      check_frequency: 'daily',
      check_timing: 'before_use',
      result_type: 'status',
      display_order: 1,
      is_required: true,
    },
    {
      category: '일일점검',
      item_text: '후진 경보장치 작동 유무',
      check_frequency: 'daily',
      check_timing: 'before_use',
      result_type: 'status',
      display_order: 2,
      is_required: true,
    },
    {
      category: '일일점검',
      item_text: '비상 정지버튼 정상작동 여부 및 버튼 복귀시 조작직전의 작동이 자동으로 되지 않는지 확인',
      check_frequency: 'daily',
      check_timing: 'before_use',
      result_type: 'status',
      display_order: 3,
      is_required: true,
    },
    {
      category: '일일점검',
      item_text: '브레이크 클러치 조정장치 및 인디케이터의 정상작동 유무',
      check_frequency: 'daily',
      check_timing: 'before_use',
      result_type: 'status',
      display_order: 4,
      is_required: true,
    },
    {
      category: '일일점검',
      item_text: '작업 반경내 장애물 및 위험요인 확인',
      check_frequency: 'daily',
      check_timing: 'before_use',
      result_type: 'status',
      display_order: 5,
      is_required: true,
    },
    {
      category: '일일점검',
      item_text: '유압 호스 및 연결부 누유 확인',
      check_frequency: 'daily',
      check_timing: 'before_use',
      result_type: 'status',
      display_order: 6,
      is_required: true,
    },

    // 주간 점검 항목
    {
      category: '주간점검',
      item_text: '비파괴검사 실시여부 확인 (3개월 내)',
      check_frequency: 'weekly',
      check_timing: 'before_use',
      result_type: 'status',
      display_order: 101,
      is_required: true,
    },
    {
      category: '주간점검',
      item_text: '붐, 선회장비 등 주요 구조부 및 차륜의 풀림, 균열, 변경, 누유, 이상 유무 확인',
      check_frequency: 'weekly',
      check_timing: 'before_use',
      result_type: 'status',
      display_order: 102,
      is_required: true,
    },
    {
      category: '주간점검',
      item_text: '소화기 비치 및 소화기 상태 유무',
      check_frequency: 'weekly',
      check_timing: 'before_use',
      result_type: 'status',
      display_order: 103,
      is_required: true,
    },
    {
      category: '주간점검',
      item_text: '와이어로프 및 체인 마모, 변형 상태 확인',
      check_frequency: 'weekly',
      check_timing: 'before_use',
      result_type: 'status',
      display_order: 104,
      is_required: true,
    },
    {
      category: '주간점검',
      item_text: '안전난간 및 작업대 손상 여부 확인',
      check_frequency: 'weekly',
      check_timing: 'before_use',
      result_type: 'status',
      display_order: 105,
      is_required: true,
    },

    // 월간 점검 항목
    {
      category: '월간점검',
      item_text: '임의부착장치(구조변경 미승인 장치) 설치 유무 확인 (없을 경우 N/A 표기)',
      check_frequency: 'monthly',
      check_timing: 'before_use',
      result_type: 'status',
      display_order: 201,
      is_required: true,
    },
    {
      category: '월간점검',
      item_text: '유압실린더 및 펌프 작동 상태 점검',
      check_frequency: 'monthly',
      check_timing: 'before_use',
      result_type: 'status',
      display_order: 202,
      is_required: true,
    },
    {
      category: '월간점검',
      item_text: '전기 계통 및 배선 상태 점검',
      check_frequency: 'monthly',
      check_timing: 'before_use',
      result_type: 'status',
      display_order: 203,
      is_required: true,
    },
    {
      category: '월간점검',
      item_text: '안전벨트 및 안전고리 상태 점검',
      check_frequency: 'monthly',
      check_timing: 'before_use',
      result_type: 'status',
      display_order: 204,
      is_required: true,
    },

    // 필요시 점검 항목
    {
      category: '필요시점검',
      item_text: '작업 중 붐 최대 인출 시 고압선로와의 이격 거리 (m)',
      check_frequency: 'as_needed',
      check_timing: 'during_use',
      result_type: 'text',
      display_order: 301,
      is_required: false,
    },
    {
      category: '필요시점검',
      item_text: '악천후(강풍, 폭우, 폭설) 시 작업 중단 여부',
      check_frequency: 'as_needed',
      check_timing: 'during_use',
      result_type: 'status',
      display_order: 302,
      is_required: false,
    },
    {
      category: '필요시점검',
      item_text: '긴급 상황 발생 시 조치 사항',
      check_frequency: 'as_needed',
      check_timing: 'after_use',
      result_type: 'text',
      display_order: 303,
      is_required: false,
    },
  ];

  console.log(`총 ${items.length}개의 체크 항목 생성 중...\n`);

  for (const item of items) {
    const itemId = nanoid();
    const { error: itemError } = await supabase
      .from('safety_inspection_template_items')
      .insert({
        id: itemId,
        template_id: templateId,
        ...item,
        created_at: new Date().toISOString(),
      });

    if (itemError) {
      console.error(`❌ 항목 생성 실패: ${item.item_text}`, itemError);
    } else {
      const timingLabel = {
        before_use: '사용전',
        during_use: '사용중',
        after_use: '사용후',
      }[item.check_timing] || item.check_timing;

      const freqLabel = {
        daily: '일일',
        weekly: '주간',
        monthly: '월간',
        as_needed: '필요시',
      }[item.check_frequency];

      console.log(`✓ [${freqLabel}/${timingLabel}] ${item.item_text.substring(0, 40)}${item.item_text.length > 40 ? '...' : ''}`);
    }
  }

  console.log('\n=== 스카이장비 안전점검 템플릿 생성 완료! ===');
  console.log(`\n템플릿 ID: ${templateId}`);
  console.log(`체크 항목: ${items.length}개`);
  console.log('\n이제 어드민 화면에서 템플릿을 확인할 수 있습니다! 🚀');
}

createSkyEquipmentTemplate().catch(console.error);
