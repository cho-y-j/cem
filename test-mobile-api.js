/**
 * 모바일 API 직접 테스트 스크립트
 * getMyAssignedEquipment와 getCurrentDeployment 로직 테스트
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

// toCamelCase 헬퍼 함수
function toCamelCase(obj) {
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  } else if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    const newObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        newObj[camelKey] = toCamelCase(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
}

async function testMobileAPI(email, pin) {
  console.log(`\n🔍 테스트: ${email} (PIN: ${pin})\n`);
  console.log('═══════════════════════════════════════\n');

  // 1. users 테이블에서 조회
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (!user) {
    console.log('❌ users 테이블에 사용자 없음');
    return;
  }

  console.log('✅ User 정보:', { id: user.id, name: user.name, email: user.email, pin: user.pin });

  // 2. PIN으로 workers 조회
  console.log('\n📍 getWorkerByPinCode 시뮬레이션...');
  const { data: workersByPin } = await supabase
    .from('workers')
    .select('*')
    .eq('pin_code', pin)
    .limit(1);

  let worker = workersByPin && workersByPin.length > 0 ? workersByPin[0] : null;

  if (worker) {
    console.log('✅ PIN으로 Worker 찾음:', { id: worker.id, name: worker.name, email: worker.email });
  } else {
    console.log('⚠️  PIN으로 Worker를 찾을 수 없음');

    // 3. Email로 workers 조회
    console.log('\n📍 getWorkerByEmail 시뮬레이션...');
    const { data: workerByEmail } = await supabase
      .from('workers')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (workerByEmail) {
      console.log('✅ Email로 Worker 찾음:', { id: workerByEmail.id, name: workerByEmail.name });
      worker = workerByEmail;
    } else {
      console.log('❌ Email로도 Worker를 찾을 수 없음');
      return;
    }
  }

  // 4. getMyAssignedEquipment 시뮬레이션
  console.log('\n📍 getMyAssignedEquipment 시뮬레이션...');

  // 4-1. equipment.assigned_worker_id로 조회
  const { data: assignedEquip } = await supabase
    .from('equipment')
    .select(`
      *,
      equip_type:equip_types(*)
    `)
    .eq('assigned_worker_id', worker.id)
    .maybeSingle();

  if (assignedEquip) {
    console.log('✅ assigned_worker_id로 장비 찾음:', {
      id: assignedEquip.id,
      regNum: assignedEquip.reg_num,
      equipType: assignedEquip.equip_type?.name,
    });
  } else {
    console.log('⚠️  assigned_worker_id로 장비 없음 → deployment 확인');

    // 4-2. worker_id로 deployment 조회
    const { data: deploymentByWorker } = await supabase
      .from('deployments')
      .select(`
        *,
        equipment:equipment(id, reg_num, equip_type_id)
      `)
      .eq('worker_id', worker.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (deploymentByWorker) {
      console.log('✅ worker_id로 deployment 찾음:', {
        id: deploymentByWorker.id,
        equipmentId: deploymentByWorker.equipment_id,
      });

      if (deploymentByWorker.equipment_id) {
        const { data: equip } = await supabase
          .from('equipment')
          .select(`
            *,
            equip_type:equip_types(*)
          `)
          .eq('id', deploymentByWorker.equipment_id)
          .single();

        console.log('✅ Deployment의 장비:', {
          id: equip.id,
          regNum: equip.reg_num,
          equipType: equip.equip_type?.name,
        });
        console.log('\n✅ getMyAssignedEquipment 결과:', toCamelCase(equip));
      }
    } else {
      console.log('⚠️  worker_id로 deployment 없음 → guide_worker_id 확인');

      // 4-3. guide_worker_id로 deployment 조회
      const { data: deploymentByGuide } = await supabase
        .from('deployments')
        .select(`
          *,
          equipment:equipment(id, reg_num, equip_type_id)
        `)
        .eq('guide_worker_id', worker.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (deploymentByGuide) {
        console.log('✅ guide_worker_id로 deployment 찾음:', {
          id: deploymentByGuide.id,
          equipmentId: deploymentByGuide.equipment_id,
        });

        if (deploymentByGuide.equipment_id) {
          const { data: equip } = await supabase
            .from('equipment')
            .select(`
              *,
              equip_type:equip_types(*)
            `)
            .eq('id', deploymentByGuide.equipment_id)
            .single();

          console.log('✅ Deployment의 장비:', {
            id: equip.id,
            regNum: equip.reg_num,
            equipType: equip.equip_type?.name,
          });
          console.log('\n✅ getMyAssignedEquipment 결과:', toCamelCase(equip));
        }
      } else {
        console.log('❌ guide_worker_id로도 deployment 없음');
        console.log('\n❌ getMyAssignedEquipment 결과: null');
      }
    }
  }

  // 5. getCurrentDeployment 시뮬레이션
  console.log('\n📍 getCurrentDeployment 시뮬레이션...');

  // worker_id로 조회
  const { data: currentDep1 } = await supabase
    .from('deployments')
    .select(`
      *,
      worker:workers!deployments_worker_id_fkey(id, name),
      equipment:equipment(id, reg_num, equip_type_id),
      bp_company:companies!deployments_bp_company_id_fkey(id, name),
      ep_company:companies!deployments_ep_company_id_fkey(id, name)
    `)
    .eq('worker_id', worker.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (currentDep1) {
    console.log('✅ worker_id로 deployment 찾음:', {
      id: currentDep1.id,
      equipmentId: currentDep1.equipment_id,
      bpCompany: currentDep1.bp_company?.name,
    });

    if (currentDep1.equipment_id) {
      const { data: equip } = await supabase
        .from('equipment')
        .select(`
          *,
          equip_type:equip_types(*)
        `)
        .eq('id', currentDep1.equipment_id)
        .single();

      const result = toCamelCase(currentDep1);
      result.equipment = toCamelCase(equip);
      console.log('\n✅ getCurrentDeployment 결과 (equipment 포함):', {
        id: result.id,
        equipment: {
          id: result.equipment.id,
          regNum: result.equipment.regNum,
          equipType: result.equipment.equipType?.name,
        },
      });
    }
  } else {
    console.log('⚠️  worker_id로 deployment 없음 → guide_worker_id 확인');

    // guide_worker_id로 조회
    const { data: currentDep2 } = await supabase
      .from('deployments')
      .select(`
        *,
        guide_worker:workers!deployments_guide_worker_id_fkey(id, name),
        equipment:equipment(id, reg_num, equip_type_id),
        bp_company:companies!deployments_bp_company_id_fkey(id, name),
        ep_company:companies!deployments_ep_company_id_fkey(id, name)
      `)
      .eq('guide_worker_id', worker.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (currentDep2) {
      console.log('✅ guide_worker_id로 deployment 찾음:', {
        id: currentDep2.id,
        equipmentId: currentDep2.equipment_id,
        bpCompany: currentDep2.bp_company?.name,
      });

      if (currentDep2.equipment_id) {
        const { data: equip } = await supabase
          .from('equipment')
          .select(`
            *,
            equip_type:equip_types(*)
          `)
          .eq('id', currentDep2.equipment_id)
          .single();

        const result = toCamelCase(currentDep2);
        result.equipment = toCamelCase(equip);
        console.log('\n✅ getCurrentDeployment 결과 (equipment 포함):', {
          id: result.id,
          equipment: {
            id: result.equipment.id,
            regNum: result.equipment.regNum,
            equipType: result.equipment.equipType?.name,
          },
        });
      }
    } else {
      console.log('❌ guide_worker_id로도 deployment 없음');
      console.log('\n❌ getCurrentDeployment 결과: null');
    }
  }
}

async function runTests() {
  console.log('\n🧪 모바일 API 테스트 시작\n');

  await testMobileAPI('shb@test.com', '1111');

  console.log('\n\n═══════════════════════════════════════════════════════════\n');

  await testMobileAPI('u1@com.com', '2222');

  console.log('\n✅ 테스트 완료\n');
}

runTests().catch(console.error);
