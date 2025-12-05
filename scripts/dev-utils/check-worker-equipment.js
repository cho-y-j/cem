/**
 * Worker와 Equipment 매칭 확인 스크립트
 * 운전자와 유도원의 배정 상태를 확인합니다.
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

async function checkWorkerEquipment() {
  console.log('\n🔍 Worker와 Equipment 매칭 확인 시작...\n');

  // 1. 운전자 확인 (shb@test.com)
  console.log('═══════════════════════════════════════');
  console.log('1️⃣  운전자 (shb@test.com) 확인');
  console.log('═══════════════════════════════════════\n');

  const { data: driver } = await supabase
    .from('workers')
    .select('*')
    .eq('email', 'shb@test.com')
    .maybeSingle();

  if (driver) {
    console.log('✅ Worker 정보:', {
      id: driver.id,
      name: driver.name,
      email: driver.email,
      ownerId: driver.owner_id,
    });

    // equipment.assigned_worker_id 확인
    const { data: assignedEquip } = await supabase
      .from('equipment')
      .select(`
        *,
        equip_type:equip_types(id, name, description)
      `)
      .eq('assigned_worker_id', driver.id)
      .maybeSingle();

    if (assignedEquip) {
      console.log('✅ assigned_worker_id로 배정된 장비:', {
        id: assignedEquip.id,
        regNum: assignedEquip.reg_num,
        equipType: assignedEquip.equip_type?.name,
      });
    } else {
      console.log('⚠️  assigned_worker_id로 배정된 장비 없음');
    }

    // deployment 확인 (worker_id)
    const { data: deployment } = await supabase
      .from('deployments')
      .select(`
        *,
        equipment:equipment(id, reg_num, equip_type_id),
        bp_company:companies!deployments_bp_company_id_fkey(id, name)
      `)
      .eq('worker_id', driver.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (deployment) {
      console.log('✅ Deployment (worker_id):', {
        id: deployment.id,
        equipmentId: deployment.equipment_id,
        equipment: deployment.equipment,
        bpCompany: deployment.bp_company?.name,
        status: deployment.status,
      });

      // equipment_id로 장비 조회
      if (deployment.equipment_id) {
        const { data: equip } = await supabase
          .from('equipment')
          .select(`
            *,
            equip_type:equip_types(id, name, description)
          `)
          .eq('id', deployment.equipment_id)
          .single();

        console.log('✅ Deployment에 연결된 장비:', {
          id: equip.id,
          regNum: equip.reg_num,
          equipType: equip.equip_type?.name,
        });
      }
    } else {
      console.log('⚠️  worker_id로 Active Deployment 없음');

      // 모든 deployment 확인
      const { data: allDeployments } = await supabase
        .from('deployments')
        .select('id, worker_id, equipment_id, status')
        .eq('worker_id', driver.id);

      console.log('📋 모든 Deployment:', allDeployments);
    }
  } else {
    console.log('❌ shb@test.com에 해당하는 Worker 없음');
  }

  // 2. 유도원 확인 (u1@com.com)
  console.log('\n═══════════════════════════════════════');
  console.log('2️⃣  유도원 (u1@com.com) 확인');
  console.log('═══════════════════════════════════════\n');

  const { data: guide } = await supabase
    .from('workers')
    .select('*')
    .eq('email', 'u1@com.com')
    .maybeSingle();

  if (guide) {
    console.log('✅ Worker 정보:', {
      id: guide.id,
      name: guide.name,
      email: guide.email,
      ownerId: guide.owner_id,
    });

    // deployment 확인 (guide_worker_id)
    const { data: deployment } = await supabase
      .from('deployments')
      .select(`
        *,
        equipment:equipment(id, reg_num, equip_type_id),
        bp_company:companies!deployments_bp_company_id_fkey(id, name)
      `)
      .eq('guide_worker_id', guide.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (deployment) {
      console.log('✅ Deployment (guide_worker_id):', {
        id: deployment.id,
        equipmentId: deployment.equipment_id,
        equipment: deployment.equipment,
        bpCompany: deployment.bp_company?.name,
        status: deployment.status,
      });

      // equipment_id로 장비 조회
      if (deployment.equipment_id) {
        const { data: equip } = await supabase
          .from('equipment')
          .select(`
            *,
            equip_type:equip_types(id, name, description)
          `)
          .eq('id', deployment.equipment_id)
          .single();

        console.log('✅ Deployment에 연결된 장비:', {
          id: equip.id,
          regNum: equip.reg_num,
          equipType: equip.equip_type?.name,
        });
      }
    } else {
      console.log('⚠️  guide_worker_id로 Active Deployment 없음');

      // 모든 deployment 확인
      const { data: allDeployments } = await supabase
        .from('deployments')
        .select('id, worker_id, guide_worker_id, equipment_id, status')
        .eq('guide_worker_id', guide.id);

      console.log('📋 모든 Deployment:', allDeployments);
    }
  } else {
    console.log('❌ u1@com.com에 해당하는 Worker 없음');
  }

  console.log('\n✅ 확인 완료\n');
}

checkWorkerEquipment().catch(console.error);
