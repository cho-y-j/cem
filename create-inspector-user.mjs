import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// SHA-256 해시 함수 (server/password.ts와 동일)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function createInspectorUser() {
  console.log('\n=== 점검원(Inspector) 사용자 생성 ===\n');

  const userId = nanoid();
  const email = 'inspector@test.com';
  const password = 'test123';
  const hashedPassword = hashPassword(password);

  const { data, error } = await supabase
    .from('users')
    .insert({
      id: userId,
      email: email,
      password: hashedPassword,
      name: '테스트 점검원',
      role: 'inspector',
      company_id: null,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('❌ 사용자 생성 오류:', error);
    return;
  }

  console.log('✅ 점검원 사용자가 생성되었습니다!\n');
  console.log('로그인 정보:');
  console.log(`  이메일: ${email}`);
  console.log(`  비밀번호: ${password}`);
  console.log(`  역할: inspector`);
  console.log(`\n모바일 점검원 화면: http://localhost:3000/mobile/inspector`);
  console.log('\n');
}

createInspectorUser();
