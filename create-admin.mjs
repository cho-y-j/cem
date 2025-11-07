/**
 * Admin 사용자 생성 스크립트
 * Supabase에 Admin 사용자를 직접 생성합니다.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  const email = 'admin@test.com';
  const password = 'admin123456';
  const name = '시스템 관리자';

  console.log('🔧 Admin 사용자 생성 중...');
  console.log(`📧 이메일: ${email}`);
  console.log(`🔑 비밀번호: ${password}`);

  try {
    // 1. Supabase Auth에 사용자 생성
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 이메일 인증 자동 완료
      user_metadata: {
        name
      }
    });

    if (authError) {
      console.error('❌ Auth 사용자 생성 실패:', authError.message);
      process.exit(1);
    }

    console.log('✅ Auth 사용자 생성 완료:', authData.user.id);

    // 2. users 테이블에 정보 저장
    const { error: dbError } = await supabase.from('users').insert({
      id: authData.user.id,
      name,
      email,
      role: 'admin',
      created_at: new Date().toISOString()
    });

    if (dbError) {
      console.error('❌ DB 사용자 저장 실패:', dbError.message);
      // Auth 사용자 삭제 (롤백)
      await supabase.auth.admin.deleteUser(authData.user.id);
      process.exit(1);
    }

    console.log('✅ DB 사용자 저장 완료');
    console.log('');
    console.log('🎉 Admin 사용자 생성 완료!');
    console.log('');
    console.log('📋 로그인 정보:');
    console.log(`   이메일: ${email}`);
    console.log(`   비밀번호: ${password}`);
    console.log('');
    console.log('🔗 로그인 URL:');
    console.log('   https://3001-izb6zrheg3matpgwb642t-232e99d8.manus-asia.computer');
    console.log('');

  } catch (error) {
    console.error('❌ 예상치 못한 오류:', error);
    process.exit(1);
  }
}

createAdminUser();

