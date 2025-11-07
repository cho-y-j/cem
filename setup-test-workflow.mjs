import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupTestWorkflow() {
  console.log('=== Setting up test workflow ===\n');

  const bpCompanyId = 'company-tSMrSTYp2-3TLwYjlEoLg'; // Test BP Company
  const epCompanyId = 'company-Id6r-h20NVBH9v8Fd23yW'; // 에코 (EP Company)

  // BP 회사를 타겟으로 하는 요청 찾기
  const { data: bpRequests, error: bpError } = await supabase
    .from('entry_requests')
    .select('*')
    .eq('target_bp_company_id', bpCompanyId)
    .order('created_at', { ascending: false })
    .limit(4);

  if (bpError) {
    console.error('Error fetching BP requests:', bpError);
    return;
  }

  console.log(`Found ${bpRequests?.length || 0} requests for BP company\n`);

  if (bpRequests && bpRequests.length > 0) {
    // 첫 번째 요청: BP 단계 (bp_requested)
    const req1 = bpRequests[0];
    await supabase
      .from('entry_requests')
      .update({
        status: 'bp_requested',
        target_ep_company_id: null
      })
      .eq('id', req1.id);
    console.log(`✅ ${req1.request_number}: Set to BP stage (bp_requested)`);

    // 두 번째 요청: BP 승인됨, EP 검토 중 (ep_reviewing)
    if (bpRequests[1]) {
      const req2 = bpRequests[1];
      await supabase
        .from('entry_requests')
        .update({
          status: 'ep_reviewing',
          target_ep_company_id: epCompanyId
        })
        .eq('id', req2.id);
      console.log(`✅ ${req2.request_number}: Set to EP stage (ep_reviewing)`);
    }

    // 세 번째 요청: BP 단계 (bp_requested)
    if (bpRequests[2]) {
      const req3 = bpRequests[2];
      await supabase
        .from('entry_requests')
        .update({
          status: 'bp_requested',
          target_ep_company_id: null
        })
        .eq('id', req3.id);
      console.log(`✅ ${req3.request_number}: Set to BP stage (bp_requested)`);
    }

    // 네 번째 요청: EP 검토 중
    if (bpRequests[3]) {
      const req4 = bpRequests[3];
      await supabase
        .from('entry_requests')
        .update({
          status: 'ep_reviewing',
          target_ep_company_id: epCompanyId
        })
        .eq('id', req4.id);
      console.log(`✅ ${req4.request_number}: Set to EP stage (ep_reviewing)`);
    }

    console.log('\n=== Summary ===');

    // BP 요청 개수
    const { count: bpCount } = await supabase
      .from('entry_requests')
      .select('*', { count: 'exact', head: true })
      .eq('target_bp_company_id', bpCompanyId)
      .in('status', ['bp_requested', 'owner_requested']);

    console.log(`BP requests (pending approval): ${bpCount || 0}`);

    // EP 요청 개수
    const { count: epCount } = await supabase
      .from('entry_requests')
      .select('*', { count: 'exact', head: true })
      .eq('target_ep_company_id', epCompanyId)
      .in('status', ['ep_reviewing', 'bp_approved']);

    console.log(`EP requests (pending approval): ${epCount || 0}`);
  }
}

setupTestWorkflow().catch(console.error);
