import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixBpCompany() {
  console.log('\n🔧 bp@test.com을 Test BP Company에 연결...\n');
  
  const { error } = await supabase
    .from('users')
    .update({ company_id: 'company-tSMrSTYp2-3TLwYjlEoLg' })
    .eq('email', 'bp@test.com');
  
  if (error) {
    console.error('❌ 업데이트 실패:', error);
  } else {
    console.log('✅ bp@test.com → Test BP Company 연결 완료');
    
    // 확인
    const { data } = await supabase
      .from('users')
      .select('email, company_id')
      .eq('email', 'bp@test.com')
      .single();
    
    console.log('\n확인:', data);
  }
}

fixBpCompany();
