/**
 * Admin 사용자 확인 및 수정 스크립트
 * PostgreSQL에 직접 연결하여 처리
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function fixAdminUser() {
  try {
    await client.connect();
    console.log('✅ 데이터베이스 연결 성공\n');

    // 1. auth.users에서 admin@test.com 확인
    console.log('1️⃣ auth.users 확인...');
    const authResult = await client.query(
      "SELECT id, email FROM auth.users WHERE email = 'admin@test.com'"
    );

    if (authResult.rows.length === 0) {
      console.log('❌ auth.users에 admin@test.com이 없습니다.');
      console.log('   Supabase Dashboard에서 먼저 사용자를 생성해주세요.');
      return;
    }

    const authUser = authResult.rows[0];
    console.log(`✅ auth.users 발견: ${authUser.email} (${authUser.id})\n`);

    // 2. public.users 확인
    console.log('2️⃣ public.users 확인...');
    const publicResult = await client.query(
      "SELECT id, email, role FROM users WHERE id = $1",
      [authUser.id]
    );

    if (publicResult.rows.length === 0) {
      // users 테이블에 없으면 생성
      console.log('⚠️  public.users에 없음. 생성 중...');
      await client.query(
        `INSERT INTO users (id, name, email, role, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [authUser.id, '시스템 관리자', authUser.email, 'admin']
      );
      console.log('✅ public.users에 admin 사용자 생성 완료\n');
    } else {
      const publicUser = publicResult.rows[0];
      console.log(`✅ public.users 발견: ${publicUser.email} (role: ${publicUser.role})`);
      
      if (publicUser.role !== 'admin') {
        console.log('⚠️  role이 admin이 아님. 수정 중...');
        await client.query(
          "UPDATE users SET role = 'admin' WHERE id = $1",
          [authUser.id]
        );
        console.log('✅ role을 admin으로 변경 완료\n');
      } else {
        console.log('✅ role이 이미 admin입니다.\n');
      }
    }

    // 3. 최종 확인
    console.log('3️⃣ 최종 확인...');
    const finalResult = await client.query(
      "SELECT id, name, email, role FROM users WHERE email = 'admin@test.com'"
    );

    if (finalResult.rows.length > 0) {
      const user = finalResult.rows[0];
      console.log('✅ 최종 결과:');
      console.log(`   ID: ${user.id}`);
      console.log(`   이름: ${user.name}`);
      console.log(`   이메일: ${user.email}`);
      console.log(`   역할: ${user.role}`);
      console.log('');
      console.log('🎉 Admin 사용자 설정 완료!');
      console.log('');
      console.log('📋 로그인 정보:');
      console.log('   이메일: admin@test.com');
      console.log('   비밀번호: (Supabase에서 설정한 비밀번호)');
      console.log('');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  } finally {
    await client.end();
  }
}

fixAdminUser();

