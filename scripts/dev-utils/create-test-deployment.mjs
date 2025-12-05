import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🚀 테스트 투입 데이터 생성 중...\n');

// 1. 기존 데이터 확인
const { data: companies } = await supabase
  .from('companies')
  .select('*');

console.log('📋 회사 목록:');
companies.forEach(c => console.log(`  - ${c.name} (${c.type})`));

const { data: equipment } = await supabase
  .from('equipment')
  .select('*')
  .limit(1)
  .single();

const { data: workers } = await supabase
  .from('workers')
  .select('*')
  .eq('id', 'worker-test-001')
  .single();

const { data: users } = await supabase
  .from('users')
  .select('*')
  .eq('role', 'owner')
  .limit(1)
  .single();

if (!equipment || !workers || !users) {
  console.error('❌ 필수 데이터가 없습니다.');
  process.exit(1);
}

console.log('\n✅ 사용할 데이터:');
console.log(`  장비: ${equipment.reg_num}`);
console.log(`  운전자: worker-test-001`);
console.log(`  Owner: ${users.name}`);

// 2. Entry Request 생성 (간단하게)
const entryRequestId = nanoid();
const { error: erError } = await supabase
  .from('entry_requests')
  .insert({
    id: entryRequestId,
    request_number: `REQ-${Date.now()}`,
    bp_company_id: companies.find(c => c.type === 'bp')?.id || companies[0].id,
    bp_user_id: users.id,
    purpose: '테스트 투입',
    requested_start_date: new Date().toISOString(),
    requested_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'ep_approved',
  });

if (erError) {
  console.error('❌ Entry Request 생성 실패:', erError.message);
} else {
  console.log(`\n✅ Entry Request 생성: ${entryRequestId}`);
}

// 3. Deployment 생성
const deploymentId = nanoid();
const { error: depError } = await supabase
  .from('deployments')
  .insert({
    id: deploymentId,
    entry_request_id: entryRequestId,
    equipment_id: equipment.id,
    worker_id: 'worker-test-001',
    owner_id: users.id,
    bp_company_id: companies.find(c => c.type === 'bp')?.id || companies[0].id,
    ep_company_id: companies.find(c => c.type === 'ep')?.id,
    start_date: new Date().toISOString(),
    planned_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    site_name: '서울 강남구 테스트 현장',
    work_type: 'daily',
    daily_rate: 500000,
    ot_rate: 70000,
    night_rate: 100000,
  });

if (depError) {
  console.error('❌ Deployment 생성 실패:', depError.message);
} else {
  console.log(`✅ Deployment 생성: ${deploymentId}`);
  console.log('\n🎉 테스트 투입 데이터 생성 완료!');
  console.log(`\n📍 이제 Worker (PIN: 1234)로 로그인하면 투입 정보가 표시됩니다.`);
}

process.exit(0);
