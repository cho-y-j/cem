import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRequests() {
  console.log('\n=== 반입 요청 전체 목록 ===');

  const { data: requests, error } = await supabase
    .from('entry_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!requests || requests.length === 0) {
    console.log('❌ 반입 요청이 하나도 없습니다!');
    return;
  }

  console.log(`총 ${requests.length}개의 반입 요청 발견\n`);

  requests.forEach((req, idx) => {
    console.log(`\n[${idx + 1}] ${req.request_number || req.id}`);
    console.log('  상태:', req.status);
    console.log('  Owner 회사:', req.owner_company_id);
    console.log('  BP 회사 (target):', req.target_bp_company_id);
    console.log('  BP 회사 (legacy):', req.bp_company_id);
    console.log('  EP 회사 (target):', req.target_ep_company_id);
    console.log('  EP 회사 (legacy):', req.ep_company_id);
    console.log('  생성일:', req.created_at);
  });

  // BP 회사 ID 확인
  console.log('\n=== BP 사용자 정보 ===');
  const { data: bpUser } = await supabase
    .from('users')
    .select('email, company_id')
    .eq('email', 'bp@test.com')
    .single();

  console.log('bp@test.com의 company_id:', bpUser?.company_id);

  // 해당 company_id로 필터링
  if (bpUser?.company_id) {
    const matchingRequests = requests.filter(r =>
      r.target_bp_company_id === bpUser.company_id ||
      r.bp_company_id === bpUser.company_id
    );

    console.log(`\nbp@test.com이 볼 수 있는 요청: ${matchingRequests.length}개`);
  }
}

checkRequests();
