/**
 * 실제 db.ts 함수 호출 테스트
 */

import * as db from './server/db.ts';

async function testDbFunctions() {
  console.log('\n🧪 DB 함수 직접 호출 테스트\n');

  // 1. 운전자 테스트
  console.log('═══════════════════════════════════════');
  console.log('1️⃣  운전자 (shb@test.com) 테스트');
  console.log('═══════════════════════════════════════\n');

  const driver = await db.getWorkerByEmail('shb@test.com');
  if (driver) {
    console.log('✅ Worker:', { id: driver.id, name: driver.name });

    const equip1 = await db.getEquipmentByAssignedWorker(driver.id);
    console.log('Equipment by assigned_worker_id:', equip1 ? equip1.id : 'null');

    const dep1 = await db.getDeploymentByWorkerId(driver.id);
    console.log('Deployment by worker_id:', dep1 ? dep1.id : 'null');

    if (dep1 && dep1.equipmentId) {
      const eq = await db.getEquipmentById(dep1.equipmentId);
      console.log('Equipment from deployment:', eq ? { id: eq.id, regNum: eq.regNum } : 'null');
    }
  }

  // 2. 유도원 테스트
  console.log('\n═══════════════════════════════════════');
  console.log('2️⃣  유도원 (u1@com.com) 테스트');
  console.log('═══════════════════════════════════════\n');

  const guide = await db.getWorkerByEmail('u1@com.com');
  if (guide) {
    console.log('✅ Worker:', { id: guide.id, name: guide.name });

    const equip2 = await db.getEquipmentByAssignedWorker(guide.id);
    console.log('Equipment by assigned_worker_id:', equip2 ? equip2.id : 'null');

    const dep2a = await db.getDeploymentByWorkerId(guide.id);
    console.log('Deployment by worker_id:', dep2a ? dep2a.id : 'null');

    const dep2b = await db.getDeploymentByGuideWorkerId(guide.id);
    console.log('Deployment by guide_worker_id:', dep2b ? dep2b.id : 'null');

    if (dep2b && dep2b.equipmentId) {
      const eq = await db.getEquipmentById(dep2b.equipmentId);
      console.log('Equipment from deployment:', eq ? { id: eq.id, regNum: eq.regNum } : 'null');
    }
  }

  console.log('\n✅ 테스트 완료\n');
}

testDbFunctions().catch(console.error);
