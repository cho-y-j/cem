import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function fix() {
  console.log('\n=== 1. EP 회사 수정 ===');
  
  // EP를 Test EP Company로 변경
  const { error: epError } = await supabase
    .from('users')
    .update({ company_id: 'company-aINGYYBiR9rMApb5m9gui' })
    .eq('email', 'ep@test.com');
  
  if (epError) {
    console.error('❌ EP 업데이트 실패:', epError);
  } else {
    console.log('✅ ep@test.com → Test EP Company 연결 완료');
  }
  
  console.log('\n=== 2. Admin 비밀번호 확인 및 재설정 ===');
  
  const { data: admin } = await supabase
    .from('users')
    .select('email, password')
    .eq('email', 'admin@test.com')
    .single();
  
  if (admin) {
    console.log('현재 admin 정보:', admin);
    
    // test123의 해시값
    const correctHash = hashPassword('test123');
    console.log('\ntest123의 정확한 해시:', correctHash);
    console.log('DB의 현재 해시:', admin.password);
    console.log('매칭 여부:', admin.password === correctHash);
    
    if (admin.password !== correctHash) {
      console.log('\n❌ 비밀번호 불일치! 재설정 중...');
      
      const { error: pwError } = await supabase
        .from('users')
        .update({ password: correctHash })
        .eq('email', 'admin@test.com');
      
      if (pwError) {
        console.error('비밀번호 업데이트 실패:', pwError);
      } else {
        console.log('✅ admin@test.com 비밀번호를 test123으로 재설정 완료');
      }
    } else {
      console.log('✅ 비밀번호가 정상입니다.');
    }
  } else {
    console.log('❌ admin@test.com을 찾을 수 없습니다!');
  }
  
  console.log('\n=== 3. 모든 테스트 계정 확인 ===');
  const { data: users } = await supabase
    .from('users')
    .select('email, role, company_id, password')
    .in('email', ['admin@test.com', 'owner@test.com', 'bp@test.com', 'ep@test.com']);
  
  console.table(users?.map(u => ({
    email: u.email,
    role: u.role,
    company_id: u.company_id,
    password_correct: u.password === hashPassword('test123') ? '✅' : '❌'
  })));
}

fix();
