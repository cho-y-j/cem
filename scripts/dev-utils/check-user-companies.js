import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUsers() {
  console.log('\n=== 사용자별 회사 연결 상태 ===');
  
  const { data: users } = await supabase
    .from('users')
    .select('email, name, role, company_id')
    .in('email', ['owner@test.com', 'bp@test.com', 'ep@test.com']);
  
  console.table(users);
  
  if (users) {
    for (const user of users) {
      if (user.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('*')
          .eq('id', user.company_id)
          .single();
        
        console.log(`\n${user.email}의 회사:`, company);
      } else {
        console.log(`\n❌ ${user.email}: company_id가 NULL입니다!`);
      }
    }
  }
  
  console.log('\n=== BP/EP 회사 목록 ===');
  const { data: companies } = await supabase
    .from('companies')
    .select('*')
    .in('company_type', ['bp', 'ep']);
  
  console.table(companies);
}

checkUsers();
