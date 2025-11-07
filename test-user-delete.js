/**
 * 사용자 삭제 테스트 스크립트
 */
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUserDelete() {
  console.log('\n=== 사용자 삭제 테스트 ===\n');

  // 1. 테스트 사용자 생성
  console.log('1️⃣  테스트 사용자 생성 중...');

  const testEmail = `test-delete-${Date.now()}@test.com`;
  const testPassword = 'test123456';

  // Auth 사용자 생성
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    console.error('❌ Auth 사용자 생성 실패:', authError);
    return;
  }

  const userId = authData.user.id;
  console.log(`✅ Auth 사용자 생성 성공: ${userId}`);

  // DB에 사용자 정보 저장
  const { error: dbError } = await supabase.from('users').insert({
    id: userId,
    name: 'Test Delete User',
    email: testEmail,
    password: 'hashed_password',
    role: 'worker',
    company_id: null,
    pin: '9999',
    created_at: new Date().toISOString(),
  });

  if (dbError) {
    console.error('❌ DB 사용자 생성 실패:', dbError);
    // Auth 삭제 (롤백)
    await supabase.auth.admin.deleteUser(userId);
    return;
  }

  console.log(`✅ DB 사용자 생성 성공\n`);

  // 2. 사용자 존재 확인
  console.log('2️⃣  사용자 존재 확인...');
  const { data: user, error: getUserError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (getUserError || !user) {
    console.error('❌ 사용자 조회 실패:', getUserError);
    return;
  }

  console.log('✅ 사용자 확인:', {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  // 3. 사용자 삭제 시도
  console.log('\n3️⃣  사용자 삭제 시도...');

  // Auth에서 삭제
  const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);

  if (authDeleteError) {
    console.error('❌ Auth 삭제 실패:', authDeleteError);
  } else {
    console.log('✅ Auth 삭제 성공');
  }

  // DB에서 삭제
  const { error: dbDeleteError } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);

  if (dbDeleteError) {
    console.error('❌ DB 삭제 실패:', dbDeleteError);
  } else {
    console.log('✅ DB 삭제 성공');
  }

  // 4. 삭제 확인
  console.log('\n4️⃣  삭제 확인...');
  const { data: deletedUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (deletedUser) {
    console.error('❌ 사용자가 여전히 존재합니다!');
    console.log('   데이터:', deletedUser);
  } else {
    console.log('✅ 사용자가 성공적으로 삭제되었습니다');
  }

  // Auth 확인
  const { data: authUser, error: authGetError } = await supabase.auth.admin.getUserById(userId);

  if (authGetError) {
    console.log('✅ Auth에서도 삭제되었습니다');
  } else if (authUser) {
    console.error('❌ Auth에 사용자가 여전히 존재합니다!');
  }

  console.log('\n=== 테스트 완료 ===\n');
}

testUserDelete().catch(console.error);
