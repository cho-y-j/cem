import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixCompanies() {
  console.log('\n🔧 BP/EP 사용자에 회사 연결 중...\n');
  
  // 1. BP 사용자에 BP 회사 연결
  const { error: bpError } = await supabase
    .from('users')
    .update({ company_id: 'company-gF-aoO9isheM2rK7IR3Fm' })
    .eq('email', 'bp@test.com');
  
  if (bpError) {
    console.error('❌ BP 업데이트 실패:', bpError);
  } else {
    console.log('✅ bp@test.com → 00협력사 연결 완료');
  }
  
  // 2. EP 사용자에 EP 회사 연결
  const { error: epError } = await supabase
    .from('users')
    .update({ company_id: 'company-aPkqWvf8brzVW5NV_8H75' })
    .eq('email', 'ep@test.com');
  
  if (epError) {
    console.error('❌ EP 업데이트 실패:', epError);
  } else {
    console.log('✅ ep@test.com → 00시행사 연결 완료');
  }
  
  console.log('\n확인 중...\n');
  
  // 3. 확인
  const { data: users } = await supabase
    .from('users')
    .select('email, company_id')
    .in('email', ['bp@test.com', 'ep@test.com']);
  
  console.table(users);
}

fixCompanies();
