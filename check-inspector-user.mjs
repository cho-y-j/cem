import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkInspectorUser() {
  console.log('\n=== 점검원(Inspector) 사용자 확인 ===\n');

  // 점검원 역할을 가진 사용자 조회
  const { data: inspectors, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'inspector');

  if (error) {
    console.error('사용자 조회 오류:', error);
    return;
  }

  console.log(`점검원 사용자: ${inspectors?.length || 0}명\n`);

  if (!inspectors || inspectors.length === 0) {
    console.log('⚠️ 점검원 사용자가 없습니다.');
    console.log('점검원 사용자를 생성해야 합니다.\n');
    return null;
  }

  inspectors.forEach((user, idx) => {
    console.log(`${idx + 1}. ${user.name} (${user.email})`);
    console.log(`   ID: ${user.id}`);
    console.log(`   역할: ${user.role}`);
    console.log(`   회사 ID: ${user.company_id || '없음'}`);
    console.log('---');
  });

  console.log('\n✅ 확인 완료!\n');
  return inspectors[0];
}

checkInspectorUser().then(inspector => {
  if (inspector) {
    console.log(`\n💡 점검원 로그인 정보:`);
    console.log(`   이메일: ${inspector.email}`);
    console.log(`   비밀번호: test123 (기본 테스트 비밀번호)\n`);
  }
});
