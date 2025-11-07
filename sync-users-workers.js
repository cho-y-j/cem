import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncUsersWorkers() {
  console.log('\n🔄 Users ↔ Workers 동기화 시작...\n');

  // 1. 현재 상태 조회
  const { data: users } = await supabase.from('users').select('*');
  const { data: workers } = await supabase.from('workers').select('*');

  console.log(`Users 테이블: ${users?.length || 0}명`);
  console.log(`Workers 테이블: ${workers?.length || 0}개\n`);

  // 2. Users에 있는 worker/inspector 찾기
  const workerUsers = users?.filter(u => u.role === 'worker' || u.role === 'inspector') || [];
  console.log(`✅ Step 1: Users 테이블의 worker/inspector: ${workerUsers.length}명`);

  // 3. Users에는 있지만 Workers에 없는 사람 찾기
  const workersUserIds = new Set(workers?.map(w => w.user_id).filter(Boolean) || []);
  const missingInWorkers = workerUsers.filter(u => !workersUserIds.has(u.id));

  if (missingInWorkers.length > 0) {
    console.log(`\n📝 Workers 테이블에 추가할 사용자: ${missingInWorkers.length}명`);

    for (const user of missingInWorkers) {
      const workerId = nanoid();
      const { error } = await supabase.from('workers').insert({
        id: workerId,
        name: user.name,
        email: user.email,
        pin_code: user.pin || '0000',
        user_id: user.id, // Users와 연결
        company_id: user.company_id,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error(`❌ ${user.email} 추가 실패:`, error.message);
      } else {
        console.log(`✅ ${user.email} (${user.name}) → Workers 테이블 추가 완료`);
      }
    }
  } else {
    console.log(`✅ 모든 worker/inspector가 Workers 테이블에 있습니다.`);
  }

  // 4. Workers에서 email 기반으로 Users와 연결 시도
  const unlinkedWorkers = workers?.filter(w => !w.user_id && w.email) || [];

  if (unlinkedWorkers.length > 0) {
    console.log(`\n🔗 Step 2: Email 기반 연결 시도: ${unlinkedWorkers.length}개`);

    for (const worker of unlinkedWorkers) {
      const matchingUser = users?.find(u => u.email === worker.email);

      if (matchingUser) {
        const { error } = await supabase
          .from('workers')
          .update({ user_id: matchingUser.id })
          .eq('id', worker.id);

        if (error) {
          console.error(`❌ ${worker.email} 연결 실패:`, error.message);
        } else {
          console.log(`✅ ${worker.email} (${worker.name}) → Users 연결 완료`);
        }
      } else {
        console.log(`⚠️  ${worker.email} (${worker.name}) → Users에 해당 이메일 없음`);
      }
    }
  } else {
    console.log(`\n✅ Email이 있는 모든 Workers가 이미 연결되어 있습니다.`);
  }

  // 5. 고아 레코드 (email 없고 user_id 없는 것들) 보고
  const orphanWorkers = workers?.filter(w => !w.user_id && !w.email) || [];

  if (orphanWorkers.length > 0) {
    console.log(`\n⚠️  고아 레코드 (email 없음, user_id 없음): ${orphanWorkers.length}개`);
    console.log('다음 레코드들은 Users와 연결할 수 없습니다:');
    orphanWorkers.forEach(w => {
      console.log(`   - ID: ${w.id}, 이름: ${w.name}, PIN: ${w.pin_code || 'N/A'}`);
    });
    console.log('\n이 레코드들을 삭제하려면 다음 명령을 실행하세요:');
    console.log('node delete-orphan-workers.js');
  }

  // 6. 최종 상태 확인
  console.log('\n📊 동기화 완료! 최종 상태 확인 중...\n');

  const { data: finalWorkers } = await supabase.from('workers').select('*');
  const linkedCount = finalWorkers?.filter(w => w.user_id).length || 0;
  const unlinkedCount = finalWorkers?.filter(w => !w.user_id).length || 0;

  console.log(`✅ 연결된 Workers: ${linkedCount}개`);
  console.log(`⚠️  연결 안 된 Workers: ${unlinkedCount}개`);
  console.log('\n동기화 완료! ✨\n');
}

syncUsersWorkers().catch(console.error);
