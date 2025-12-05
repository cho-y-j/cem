/**
 * 01@test.com 사용자의 deployment 연결 확인 스크립트
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

async function checkWorkerDeployment() {
  console.log('\n=== 01@test.com 사용자 및 투입 정보 확인 ===\n');

  // 1. users 테이블에서 01@test.com 확인
  console.log('1. users 테이블 확인...');
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, name, email, role, pin')
    .eq('email', '01@test.com')
    .maybeSingle();

  if (userError) {
    console.error('  ❌ 에러:', userError.message);
  } else if (!user) {
    console.log('  ⚠️  users 테이블에 01@test.com 사용자가 없습니다.');
  } else {
    console.log('  ✅ User 발견:', {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      pin: user.pin || '(PIN 없음)',
    });

    // 2. workers 테이블에서 email='01@test.com' 확인
    console.log('\n2. workers 테이블에서 email로 확인...');
    const { data: workerByEmail, error: workerEmailError } = await supabase
      .from('workers')
      .select('id, name, email, pin_code')
      .eq('email', '01@test.com')
      .maybeSingle();

    if (workerEmailError) {
      console.error('  ❌ 에러:', workerEmailError.message);
    } else if (!workerByEmail) {
      console.log('  ⚠️  workers 테이블에 email="01@test.com" 레코드가 없습니다.');
    } else {
      console.log('  ✅ Worker 발견 (email):', {
        id: workerByEmail.id,
        name: workerByEmail.name,
        email: workerByEmail.email,
        pin_code: workerByEmail.pin_code || '(PIN 없음)',
      });

      // 3. deployments 테이블에서 이 worker_id로 active deployment 확인
      console.log('\n3. deployments 테이블에서 active deployment 확인...');
      const { data: deployments, error: deployError } = await supabase
        .from('deployments')
        .select('id, worker_id, equipment_id, status, start_date, planned_end_date, created_at')
        .eq('worker_id', workerByEmail.id)
        .eq('status', 'active');

      if (deployError) {
        console.error('  ❌ 에러:', deployError.message);
      } else if (!deployments || deployments.length === 0) {
        console.log('  ⚠️  이 worker_id로 active deployment가 없습니다.');

        // 모든 deployment 확인 (status 무관)
        console.log('\n  → 모든 deployment 확인 (status 무관)...');
        const { data: allDeployments } = await supabase
          .from('deployments')
          .select('id, worker_id, status, created_at')
          .eq('worker_id', workerByEmail.id);

        if (allDeployments && allDeployments.length > 0) {
          console.log('  ℹ️  다른 status의 deployment들:');
          allDeployments.forEach(d => {
            console.log(`     - ID: ${d.id}, status: ${d.status}, created_at: ${d.created_at}`);
          });
        } else {
          console.log('  ⚠️  이 worker_id로 deployment가 전혀 없습니다.');
        }
      } else {
        console.log(`  ✅ Active deployment ${deployments.length}개 발견:`);
        deployments.forEach(d => {
          console.log(`     - ID: ${d.id}`);
          console.log(`       equipment_id: ${d.equipment_id}`);
          console.log(`       status: ${d.status}`);
          console.log(`       기간: ${d.start_date} ~ ${d.planned_end_date}`);
        });

        // 4. equipment 정보 확인
        console.log('\n4. equipment 정보 확인...');
        const equipmentId = deployments[0].equipment_id;
        const { data: equipment, error: equipError } = await supabase
          .from('equipment')
          .select('id, reg_num, equip_type_id, assigned_worker_id')
          .eq('id', equipmentId)
          .maybeSingle();

        if (equipError) {
          console.error('  ❌ 에러:', equipError.message);
        } else if (!equipment) {
          console.log('  ⚠️  equipment를 찾을 수 없습니다.');
        } else {
          console.log('  ✅ Equipment 발견:', {
            id: equipment.id,
            reg_num: equipment.reg_num,
            equip_type_id: equipment.equip_type_id,
            assigned_worker_id: equipment.assigned_worker_id || '(배정 안됨)',
          });
        }
      }
    }

    // 5. PIN으로도 확인 (PIN이 있는 경우)
    if (user.pin) {
      console.log('\n5. workers 테이블에서 PIN으로도 확인...');
      const { data: workerByPin, error: workerPinError } = await supabase
        .from('workers')
        .select('id, name, email, pin_code')
        .eq('pin_code', user.pin)
        .maybeSingle();

      if (workerPinError) {
        console.error('  ❌ 에러:', workerPinError.message);
      } else if (!workerByPin) {
        console.log('  ⚠️  workers 테이블에 pin_code="' + user.pin + '" 레코드가 없습니다.');
      } else {
        console.log('  ✅ Worker 발견 (PIN):', {
          id: workerByPin.id,
          name: workerByPin.name,
          email: workerByPin.email || '(email 없음)',
          pin_code: workerByPin.pin_code,
        });

        if (workerByEmail && workerByPin.id !== workerByEmail.id) {
          console.log('  ⚠️  주의: Email로 찾은 worker와 PIN으로 찾은 worker가 다릅니다!');
        }
      }
    }
  }

  console.log('\n=== 확인 완료 ===\n');
}

checkWorkerDeployment();
