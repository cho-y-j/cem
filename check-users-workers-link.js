/**
 * Users와 Workers 테이블 연결 확인 스크립트
 * users 테이블의 PIN/email로 workers 테이블을 찾을 수 있는지 확인
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUsersWorkersLink() {
  console.log('\n🔍 Users와 Workers 테이블 연결 확인 시작...\n');

  // 1. users 테이블에서 shb@test.com 확인
  console.log('═══════════════════════════════════════');
  console.log('1️⃣  users 테이블: shb@test.com');
  console.log('═══════════════════════════════════════\n');

  const { data: user1 } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'shb@test.com')
    .maybeSingle();

  if (user1) {
    console.log('✅ User 정보:', {
      id: user1.id,
      name: user1.name,
      email: user1.email,
      pin: user1.pin,
      role: user1.role,
    });

    // PIN으로 workers 찾기
    if (user1.pin) {
      console.log(`\n🔍 PIN "${user1.pin}"로 workers 테이블 조회...`);
      const { data: workerByPin } = await supabase
        .from('workers')
        .select('*')
        .eq('pin_code', user1.pin)
        .maybeSingle();

      if (workerByPin) {
        console.log('✅ PIN으로 Worker 찾음:', {
          id: workerByPin.id,
          name: workerByPin.name,
          email: workerByPin.email,
          pinCode: workerByPin.pin_code,
        });
      } else {
        console.log('❌ PIN으로 Worker를 찾을 수 없음');
      }
    } else {
      console.log('⚠️  User에 PIN이 설정되지 않음');
    }

    // Email로 workers 찾기
    console.log(`\n🔍 Email "${user1.email}"로 workers 테이블 조회...`);
    const { data: workerByEmail } = await supabase
      .from('workers')
      .select('*')
      .eq('email', user1.email)
      .maybeSingle();

    if (workerByEmail) {
      console.log('✅ Email로 Worker 찾음:', {
        id: workerByEmail.id,
        name: workerByEmail.name,
        email: workerByEmail.email,
        pinCode: workerByEmail.pin_code,
      });
    } else {
      console.log('❌ Email로 Worker를 찾을 수 없음');
    }
  } else {
    console.log('❌ users 테이블에 shb@test.com 없음');
  }

  // 2. users 테이블에서 u1@com.com 확인
  console.log('\n═══════════════════════════════════════');
  console.log('2️⃣  users 테이블: u1@com.com');
  console.log('═══════════════════════════════════════\n');

  const { data: user2 } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'u1@com.com')
    .maybeSingle();

  if (user2) {
    console.log('✅ User 정보:', {
      id: user2.id,
      name: user2.name,
      email: user2.email,
      pin: user2.pin,
      role: user2.role,
    });

    // PIN으로 workers 찾기
    if (user2.pin) {
      console.log(`\n🔍 PIN "${user2.pin}"로 workers 테이블 조회...`);
      const { data: workerByPin } = await supabase
        .from('workers')
        .select('*')
        .eq('pin_code', user2.pin)
        .maybeSingle();

      if (workerByPin) {
        console.log('✅ PIN으로 Worker 찾음:', {
          id: workerByPin.id,
          name: workerByPin.name,
          email: workerByPin.email,
          pinCode: workerByPin.pin_code,
        });
      } else {
        console.log('❌ PIN으로 Worker를 찾을 수 없음');
      }
    } else {
      console.log('⚠️  User에 PIN이 설정되지 않음');
    }

    // Email로 workers 찾기
    console.log(`\n🔍 Email "${user2.email}"로 workers 테이블 조회...`);
    const { data: workerByEmail } = await supabase
      .from('workers')
      .select('*')
      .eq('email', user2.email)
      .maybeSingle();

    if (workerByEmail) {
      console.log('✅ Email로 Worker 찾음:', {
        id: workerByEmail.id,
        name: workerByEmail.name,
        email: workerByEmail.email,
        pinCode: workerByEmail.pin_code,
      });
    } else {
      console.log('❌ Email로 Worker를 찾을 수 없음');
    }
  } else {
    console.log('❌ users 테이블에 u1@com.com 없음');
  }

  console.log('\n✅ 확인 완료\n');
}

checkUsersWorkersLink().catch(console.error);
