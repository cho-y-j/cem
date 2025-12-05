/**
 * 사용자 데이터 실제 확인
 */
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkUsers() {
  console.log('\n=== 사용자 데이터 확인 ===\n');

  // 1. Service Role Key로 조회
  console.log('1️⃣  Service Role Key로 조회 (관리자 권한):');
  const { data: adminData, error: adminError } = await supabaseAdmin
    .from('users')
    .select('id, name, email, role, created_at')
    .order('created_at', { ascending: false });

  if (adminError) {
    console.error('❌ 에러:', adminError);
  } else {
    console.log(`✅ ${adminData?.length || 0}명의 사용자 발견\n`);
    adminData?.forEach((user, idx) => {
      console.log(`   ${idx + 1}. ${user.name} (${user.email})`);
      console.log(`      - 역할: ${user.role}`);
      console.log(`      - ID: ${user.id}`);
      console.log(`      - 생성일: ${user.created_at}`);
      console.log('');
    });
  }

  // 2. Anon Key로 조회 (일반 사용자 권한 - RLS 적용)
  console.log('\n2️⃣  Anon Key로 조회 (일반 권한, RLS 적용):');
  const { data: anonData, error: anonError } = await supabaseAnon
    .from('users')
    .select('id, name, email, role, created_at')
    .order('created_at', { ascending: false });

  if (anonError) {
    console.error('❌ 에러:', anonError);
    console.log('   ⚠️  RLS (Row Level Security)가 활성화되어 일반 권한으로는 조회할 수 없습니다.');
  } else {
    console.log(`✅ ${anonData?.length || 0}명의 사용자 발견`);
  }

  // 3. Auth 사용자 목록 조회
  console.log('\n3️⃣  Supabase Auth 사용자 목록:');
  const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

  if (authError) {
    console.error('❌ 에러:', authError);
  } else {
    console.log(`✅ ${authUsers?.users?.length || 0}명의 Auth 사용자 발견\n`);
    authUsers?.users?.forEach((user, idx) => {
      console.log(`   ${idx + 1}. ${user.email}`);
      console.log(`      - ID: ${user.id}`);
      console.log(`      - 생성일: ${user.created_at}`);
      console.log('');
    });
  }

  // 4. 데이터 불일치 확인
  console.log('\n4️⃣  데이터 불일치 확인:');

  const dbUserIds = new Set(adminData?.map(u => u.id) || []);
  const authUserIds = new Set(authUsers?.users?.map(u => u.id) || []);

  const onlyInDb = [...dbUserIds].filter(id => !authUserIds.has(id));
  const onlyInAuth = [...authUserIds].filter(id => !dbUserIds.has(id));

  if (onlyInDb.length > 0) {
    console.log(`⚠️  DB에만 있는 사용자 (Auth에 없음): ${onlyInDb.length}명`);
    onlyInDb.forEach(id => {
      const user = adminData?.find(u => u.id === id);
      console.log(`   - ${user?.email} (${id})`);
    });
  } else {
    console.log('✅ DB에만 있는 사용자 없음');
  }

  if (onlyInAuth.length > 0) {
    console.log(`\n⚠️  Auth에만 있는 사용자 (DB에 없음): ${onlyInAuth.length}명`);
    onlyInAuth.forEach(id => {
      const user = authUsers?.users?.find(u => u.id === id);
      console.log(`   - ${user?.email} (${id})`);
    });
  } else {
    console.log('\n✅ Auth에만 있는 사용자 없음');
  }

  console.log('\n=== 확인 완료 ===\n');
}

checkUsers().catch(console.error);
