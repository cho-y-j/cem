import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkBpRequests() {
  const bpCompanyId = 'company-tSMrSTYp2-3TLwYjlEoLg'; // Test BP Company

  // BP 회사를 타겟으로 하는 모든 요청 조회
  const { data: requests, error } = await supabase
    .from('entry_requests')
    .select('id, request_number, status, target_bp_company_id')
    .eq('target_bp_company_id', bpCompanyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n=== BP Company Requests ===');
  console.log(`Total requests: ${requests?.length || 0}\n`);

  if (requests) {
    requests.forEach(r => {
      console.log(`${r.request_number}: status = "${r.status}"`);
    });
  }

  console.log('\n=== Fixing Status ===');

  // owner_requested 상태로 변경할 요청들 (아직 BP가 승인 안 한 것들)
  const toFix = requests?.filter(r =>
    r.status !== 'owner_requested' &&
    r.status !== 'bp_approved' &&
    r.status !== 'ep_approved' &&
    r.status !== 'ep_reviewing'
  ) || [];

  for (const req of toFix) {
    const { error: updateError } = await supabase
      .from('entry_requests')
      .update({ status: 'owner_requested' })
      .eq('id', req.id);

    if (updateError) {
      console.error(`Error updating ${req.request_number}:`, updateError);
    } else {
      console.log(`✅ ${req.request_number}: "${req.status}" → "owner_requested"`);
    }
  }

  console.log('\n=== Done ===');
}

checkBpRequests().catch(console.error);
