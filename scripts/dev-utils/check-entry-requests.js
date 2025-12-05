import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkEntryRequests() {
  console.log('\n=== 반입 요청 목록 ===');
  const { data: requests } = await supabase
    .from('entry_requests')
    .select('id, status, bp_company_id, ep_company_id, owner_id, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  
  console.table(requests);
  
  if (requests && requests.length > 0) {
    console.log('\n=== 최근 요청 상세 ===');
    const latestRequest = requests[0];
    
    // BP, EP 회사 정보
    const { data: bpCompany } = await supabase
      .from('companies')
      .select('*')
      .eq('id', latestRequest.bp_company_id)
      .single();
    
    const { data: epCompany } = await supabase
      .from('companies')
      .select('*')
      .eq('id', latestRequest.ep_company_id)
      .single();
    
    console.log('\nBP Company:', bpCompany);
    console.log('EP Company:', epCompany);
    console.log('\nRequest Status:', latestRequest.status);
  }
}

checkEntryRequests();
