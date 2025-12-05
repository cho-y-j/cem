/**
 * 출근 기록 삭제 스크립트
 * 사용법: node delete-checkin.mjs <email>
 * 예: node delete-checkin.mjs shb@test.com
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteCheckIn(email) {
  try {
    console.log(`\n🔍 ${email}의 출근 기록 조회 중...`);

    // 1. 사용자 ID 찾기
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', email)
      .single();

    if (userError || !user) {
      console.error(`❌ 사용자를 찾을 수 없습니다: ${email}`);
      return;
    }

    console.log(`✅ 사용자 찾음: ${user.name || user.email} (${user.id})`);

    // 2. 오늘 출근 기록 조회
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString();

    const { data: checkIns, error: checkInError } = await supabase
      .from('check_ins')
      .select('id, check_in_time, is_within_zone')
      .eq('user_id', user.id)
      .gte('check_in_time', todayStr)
      .lt('check_in_time', tomorrowStr)
      .order('check_in_time', { ascending: false });

    if (checkInError) {
      console.error('❌ 출근 기록 조회 실패:', checkInError);
      return;
    }

    if (!checkIns || checkIns.length === 0) {
      console.log('ℹ️  오늘 출근 기록이 없습니다.');
      return;
    }

    console.log(`\n📋 오늘 출근 기록 ${checkIns.length}건 발견:`);
    checkIns.forEach((ci, idx) => {
      const time = new Date(ci.check_in_time).toLocaleString('ko-KR');
      const zone = ci.is_within_zone ? '구역 내' : '구역 외';
      console.log(`  ${idx + 1}. ${time} (${zone}) - ID: ${ci.id}`);
    });

    // 3. 삭제 확인
    console.log(`\n⚠️  위 ${checkIns.length}건의 출근 기록을 삭제하시겠습니까?`);
    console.log('   (자동으로 삭제합니다...)');

    // 4. 삭제 실행
    const checkInIds = checkIns.map(ci => ci.id);
    const { error: deleteError } = await supabase
      .from('check_ins')
      .delete()
      .in('id', checkInIds);

    if (deleteError) {
      console.error('❌ 출근 기록 삭제 실패:', deleteError);
      return;
    }

    console.log(`\n✅ ${checkIns.length}건의 출근 기록이 삭제되었습니다.`);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

// 명령줄 인자에서 이메일 가져오기
const email = process.argv[2];

if (!email) {
  console.error('❌ 사용법: node delete-checkin.mjs <email>');
  console.error('   예: node delete-checkin.mjs shb@test.com');
  process.exit(1);
}

deleteCheckIn(email).then(() => {
  process.exit(0);
});

