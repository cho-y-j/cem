import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { nanoid } from 'nanoid';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEntryRequestFlow() {
  console.log('=== Testing Entry Request Creation Flow ===\n');

  // Step 1: Get required entities
  const { data: owners } = await supabase
    .from('users')
    .select('id, company_id, role, name')
    .eq('role', 'owner')
    .limit(1);

  const { data: bpCompanies } = await supabase
    .from('companies')
    .select('id, name, company_type')
    .eq('company_type', 'bp')
    .limit(1);

  const { data: equipment } = await supabase
    .from('equipment')
    .select('id, reg_num')
    .limit(1);

  const { data: workers } = await supabase
    .from('workers')
    .select('id, name')
    .limit(1);

  console.log('Available data:');
  console.log('- Owners:', owners?.length || 0);
  console.log('- BP Companies:', bpCompanies?.length || 0);
  console.log('- Equipment:', equipment?.length || 0);
  console.log('- Workers:', workers?.length || 0);
  console.log();

  if (!owners || owners.length === 0) {
    console.log('❌ No owner users found. Please create an owner user first.');
    return;
  }

  if (!bpCompanies || bpCompanies.length === 0) {
    console.log('❌ No BP companies found. Please create a BP company first.');
    return;
  }

  if (!equipment || equipment.length === 0) {
    console.log('❌ No equipment found. Please create equipment first.');
    return;
  }

  if (!workers || workers.length === 0) {
    console.log('❌ No workers found. Please create workers first.');
    return;
  }

  const owner = owners[0];
  const bpCompany = bpCompanies[0];
  const equip = equipment[0];
  const worker = workers[0];

  console.log('Using:');
  console.log('- Owner:', owner.name, `(${owner.id})`);
  console.log('- BP Company:', bpCompany.name, `(${bpCompany.id})`);
  console.log('- Equipment:', equip.reg_num, `(${equip.id})`);
  console.log('- Worker:', worker.name, `(${worker.id})`);
  console.log();

  // Step 2: Create entry request
  const requestId = `test-request-${nanoid()}`;
  const requestNumber = `TEST-${Date.now()}`;

  console.log('Creating entry request...');
  const { data: createdRequest, error: requestError } = await supabase
    .from('entry_requests')
    .insert({
      id: requestId,
      request_number: requestNumber,
      owner_company_id: owner.company_id,
      owner_user_id: owner.id,
      owner_requested_at: new Date().toISOString(),
      target_bp_company_id: bpCompany.id,
      // 레거시 컬럼도 채워줌 (NOT NULL 제약 때문에)
      bp_company_id: bpCompany.id,
      purpose: 'Test entry request for debugging',
      requested_start_date: '2025-11-01',
      requested_end_date: '2025-11-30',
      status: 'owner_requested',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (requestError) {
    console.error('❌ Failed to create entry request:', requestError);
    return;
  }

  console.log('✅ Entry request created:', requestNumber);
  console.log();

  // Step 3: Create entry request item WITHOUT request_type
  const itemId1 = `test-item-${nanoid()}`;

  console.log('Test 1: Creating item WITHOUT request_type...');
  const { data: item1, error: error1 } = await supabase
    .from('entry_request_items')
    .insert({
      id: itemId1,
      entry_request_id: requestId,
      item_type: 'equipment',
      item_id: equip.id,
      paired_equipment_id: equip.id,
      paired_worker_id: worker.id,
    })
    .select();

  if (error1) {
    console.error('❌ Failed WITHOUT request_type:');
    console.error('   Code:', error1.code);
    console.error('   Message:', error1.message);
    console.error('   Details:', error1.details);
  } else {
    console.log('✅ SUCCESS without request_type:', item1);
  }
  console.log();

  // Step 4: Create entry request item WITH request_type
  const itemId2 = `test-item-${nanoid()}`;

  console.log('Test 2: Creating item WITH request_type...');
  const { data: item2, error: error2 } = await supabase
    .from('entry_request_items')
    .insert({
      id: itemId2,
      entry_request_id: requestId,
      item_type: 'worker',
      item_id: worker.id,
      paired_equipment_id: equip.id,
      paired_worker_id: worker.id,
      request_type: 'equipment_with_worker',
    })
    .select();

  if (error2) {
    console.error('❌ Failed WITH request_type:');
    console.error('   Code:', error2.code);
    console.error('   Message:', error2.message);
    console.error('   Details:', error2.details);
  } else {
    console.log('✅ SUCCESS with request_type:', item2);
  }
  console.log();

  // Cleanup
  console.log('Cleaning up test data...');
  await supabase.from('entry_requests').delete().eq('id', requestId);
  console.log('✅ Cleanup complete');
}

testEntryRequestFlow().catch(console.error);
