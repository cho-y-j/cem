import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// toCamelCase 함수
function toCamelCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = toCamelCase(value);
  }
  return result;
}

console.log('=== API 응답 테스트 ===\n');

const { data } = await supabase
  .from('deployments')
  .select(`
    *,
    equipment:equipment!deployments_equipment_id_fkey(
      id,
      reg_num,
      equip_type:equip_types!equipment_equip_type_id_fkey(id, name, description)
    ),
    bp_company:companies!deployments_bp_company_id_fkey(id, name, company_type)
  `)
  .eq('worker_id', 'worker-test-001')
  .eq('status', 'active');

console.log('조회된 deployments 수:', data.length);

if (data.length > 0) {
  const deployment = data[0];
  console.log('\nSupabase 원본 (snake_case):');
  console.log('  equipment.reg_num:', deployment.equipment?.reg_num);
  console.log('  equipment.equip_type:', deployment.equipment?.equip_type);
  console.log('  bp_company.name:', deployment.bp_company?.name);

  console.log('\ntoCamelCase 변환 후:');
  const camelData = toCamelCase(deployment);
  console.log('  equipment.regNum:', camelData.equipment?.regNum);
  console.log('  equipment.equipType:', camelData.equipment?.equipType);
  console.log('  bpCompany.name:', camelData.bpCompany?.name);

  console.log('\n전체 camelCase 데이터:');
  console.log(JSON.stringify(camelData, null, 2));
}
