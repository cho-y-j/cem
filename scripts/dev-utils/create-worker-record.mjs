import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

console.log('👷 Worker 레코드 생성 중...\n');

// 1. Worker 타입 확인
const { data: workerTypes } = await supabase
  .from('worker_types')
  .select('*')
  .limit(1);

let workerTypeId;
if (!workerTypes || workerTypes.length === 0) {
  // Worker 타입 생성
  workerTypeId = nanoid();
  const { error: typeError } = await supabase
    .from('worker_types')
    .insert({
      id: workerTypeId,
      name: '운전자',
      description: '장비 운전자',
    });

  if (typeError) {
    console.error('❌ Worker 타입 생성 실패:', typeError.message);
    process.exit(1);
  }
  console.log('✅ Worker 타입 생성 완료');
} else {
  workerTypeId = workerTypes[0].id;
  console.log(`✅ Worker 타입 확인: ${workerTypes[0].name}`);
}

// 2. Owner 확인 (Worker는 Owner 소속이어야 함)
const { data: owners } = await supabase
  .from('users')
  .select('*')
  .eq('role', 'owner')
  .limit(1);

let ownerId;
if (!owners || owners.length === 0) {
  // Owner 생성
  ownerId = nanoid();
  const { error: ownerError } = await supabase
    .from('users')
    .insert({
      id: ownerId,
      name: '테스트 Owner',
      email: 'owner@test.com',
      role: 'owner',
      password: '$2b$10$test', // 임시 비밀번호
    });

  if (ownerError) {
    console.error('❌ Owner 생성 실패:', ownerError.message);
    process.exit(1);
  }
  console.log('✅ Owner 생성 완료');
} else {
  ownerId = owners[0].id;
  console.log(`✅ Owner 확인: ${owners[0].name}`);
}

// 3. Workers 테이블에 레코드 생성
const workerId = 'worker-record-001';
const { data: worker, error: workerError } = await supabase
  .from('workers')
  .insert({
    id: workerId,
    worker_type_id: workerTypeId,
    name: '테스트 Worker',
    owner_id: ownerId,
    phone: '010-1234-5678',
    pin_code: '1234',
  })
  .select()
  .single();

if (workerError) {
  console.error('❌ Worker 레코드 생성 실패:', workerError.message);
  process.exit(1);
}

console.log('\n✅ Worker 레코드 생성 완료!');
console.log(`   Worker ID: ${workerId}`);
console.log(`   이름: 테스트 Worker`);
console.log(`   PIN: 1234\n`);

// 4. 장비에 Worker 배정
const equipmentId = '9LJAI2UaIrwsNbETql2yM';
const { error: assignError } = await supabase
  .from('equipment')
  .update({ assigned_worker_id: workerId })
  .eq('id', equipmentId);

if (assignError) {
  console.error('❌ 장비 배정 실패:', assignError.message);
  process.exit(1);
}

console.log('✅ 장비 배정 완료!');
console.log(`   장비 ID: ${equipmentId}`);
console.log(`   Worker ID: ${workerId}\n`);

console.log('⚠️  주의: users 테이블의 Worker (worker-test-001)와');
console.log('   workers 테이블의 Worker (worker-record-001)는 별개입니다.');
console.log('   PIN 로그인은 users 테이블을 사용합니다.\n');

process.exit(0);
