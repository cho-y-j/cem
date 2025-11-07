import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixEPUser() {
  console.log('=== Checking EP User ===');

  // EP 사용자 확인
  const { data: epUser, error: epError } = await supabase
    .from('users')
    .select('id, email, name, role, company_id')
    .eq('email', 'ep@test.com')
    .single();

  if (epError) {
    console.error('Error fetching EP user:', epError);
    return;
  }

  console.log('EP User:', JSON.stringify(epUser, null, 2));

  if (!epUser.company_id) {
    console.log('\n⚠️ EP user has no company_id!');

    // EP 회사 찾기
    const { data: companies } = await supabase
      .from('companies')
      .select('*');

    const epCompany = companies?.find(c =>
      c.name && (c.name.includes('EP') || c.company_type === 'ep')
    );

    if (epCompany) {
      console.log('\nUsing EP Company:', epCompany.name, '(ID:', epCompany.id + ')');

      // EP 사용자에게 회사 할당
      const { data: updated, error: updateError } = await supabase
        .from('users')
        .update({ company_id: epCompany.id })
        .eq('email', 'ep@test.com')
        .select();

      if (updateError) {
        console.error('Error updating EP user:', updateError);
        return;
      }

      console.log('\nEP user updated:', JSON.stringify(updated, null, 2));
      console.log('\n✅ SUCCESS! EP user now has company_id:', epCompany.id);

      // EP 회사를 target으로 하는 반입 요청 확인
      const { data: requests } = await supabase
        .from('entry_requests')
        .select('id, request_number, target_ep_company_id, status')
        .eq('target_ep_company_id', epCompany.id);

      console.log('\nEntry requests for EP company:', requests?.length || 0);
      if (requests && requests.length > 0) {
        console.log('Requests:', requests.map(r => r.request_number).join(', '));
      }
    } else {
      console.log('\n❌ No EP company found in database!');
    }
  } else {
    console.log('\n✅ EP user already has company_id:', epUser.company_id);

    // EP 회사를 target으로 하는 반입 요청 확인
    const { data: requests } = await supabase
      .from('entry_requests')
      .select('id, request_number, target_ep_company_id, status')
      .eq('target_ep_company_id', epUser.company_id);

    console.log('Entry requests for EP company:', requests?.length || 0);
    if (requests && requests.length > 0) {
      console.log('Requests:', requests.map(r => r.request_number).join(', '));
    }
  }
}

fixEPUser().catch(console.error);
