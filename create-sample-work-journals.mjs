import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createSampleWorkJournals() {
  console.log('=== Creating Sample Work Journals for owner-test-001 ===\n');

  // 1. Get owner-test-001's deployments
  const { data: deployments, error: deploymentError } = await supabase
    .from('deployments')
    .select('*, equipment:equipment_id(*), worker:worker_id(*), bp_company:bp_company_id(*)')
    .eq('owner_id', 'owner-test-001');

  if (deploymentError) {
    console.error('Error fetching deployments:', deploymentError);
    return;
  }

  if (!deployments || deployments.length === 0) {
    console.error('No deployments found for owner-test-001');
    return;
  }

  console.log(`Found ${deployments.length} deployments for owner-test-001\n`);

  // 2. Create 3 sample work journals using the first deployment
  const deployment = deployments[0];
  const equipment = deployment.equipment;
  const worker = deployment.worker;
  const bpCompany = deployment.bp_company;

  console.log('Using deployment:', {
    id: deployment.id,
    equipment: equipment?.reg_num,
    worker: worker?.name,
    bp_company: bpCompany?.name,
  });

  const sampleJournals = [
    {
      id: nanoid(),
      deployment_id: deployment.id,
      equipment_id: deployment.equipment_id,
      worker_id: deployment.worker_id,
      bp_company_id: deployment.bp_company_id,

      // 현장 정보
      site_name: '테스트 현장',
      vehicle_number: equipment?.reg_num || 'TEST-001',
      equipment_name: equipment?.equip_type?.name || '테스트 장비',
      specification: equipment?.specification || '테스트 사양',

      // 작업 정보
      work_date: '2025-11-01',
      work_location: '서울시 강남구',
      work_content: '지반 작업',
      work_details: '지반 작업',

      // 시간 정보
      start_time: '09:00',
      end_time: '18:00',
      total_hours: 8,
      regular_hours: 8,
      ot_hours: 0,
      night_hours: 0,

      // 제출 정보
      submitted_by: deployment.worker_id,
      submitted_at: new Date('2025-11-01T18:00:00Z').toISOString(),
      status: 'bp_approved',

      // 승인 정보
      approved_by_bp: 'bp-test-001',
      approved_at_bp: new Date('2025-11-01T19:00:00Z').toISOString(),
      bp_signature_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      bp_signer_name: 'BP 담당자',
      signed_at: new Date('2025-11-01T19:00:00Z').toISOString(),
      bp_comments: '승인 완료',
    },
    {
      id: nanoid(),
      deployment_id: deployment.id,
      equipment_id: deployment.equipment_id,
      worker_id: deployment.worker_id,
      bp_company_id: deployment.bp_company_id,

      // 현장 정보
      site_name: '테스트 현장',
      vehicle_number: equipment?.reg_num || 'TEST-001',
      equipment_name: equipment?.equip_type?.name || '테스트 장비',
      specification: equipment?.specification || '테스트 사양',

      // 작업 정보
      work_date: '2025-11-02',
      work_location: '서울시 강남구',
      work_content: '터파기 작업',
      work_details: '터파기 작업',

      // 시간 정보
      start_time: '09:00',
      end_time: '20:00',
      total_hours: 10,
      regular_hours: 8,
      ot_hours: 2,
      night_hours: 0,

      // 제출 정보
      submitted_by: deployment.worker_id,
      submitted_at: new Date('2025-11-02T20:00:00Z').toISOString(),
      status: 'pending_bp',
    },
    {
      id: nanoid(),
      deployment_id: deployment.id,
      equipment_id: deployment.equipment_id,
      worker_id: deployment.worker_id,
      bp_company_id: deployment.bp_company_id,

      // 현장 정보
      site_name: '테스트 현장',
      vehicle_number: equipment?.reg_num || 'TEST-001',
      equipment_name: equipment?.equip_type?.name || '테스트 장비',
      specification: equipment?.specification || '테스트 사양',

      // 작업 정보
      work_date: '2025-11-03',
      work_location: '서울시 강남구',
      work_content: '마무리 작업',
      work_details: '마무리 작업',

      // 시간 정보
      start_time: '09:00',
      end_time: '22:00',
      total_hours: 11,
      regular_hours: 8,
      ot_hours: 2,
      night_hours: 1,

      // 제출 정보
      submitted_by: deployment.worker_id,
      submitted_at: new Date('2025-11-03T22:00:00Z').toISOString(),
      status: 'pending_bp',
    },
  ];

  console.log('\nCreating 3 sample work journals...\n');

  for (const journal of sampleJournals) {
    const { data, error } = await supabase
      .from('work_journal')
      .insert(journal)
      .select()
      .single();

    if (error) {
      console.error(`Error creating journal for ${journal.work_date}:`, error);
    } else {
      console.log(`✓ Created work journal for ${journal.work_date} - Status: ${journal.status}`);
    }
  }

  console.log('\n=== Sample Work Journals Created Successfully! ===');
  console.log('\nYou can now login with owner@test.com to see the work journals.');
}

createSampleWorkJournals().catch(console.error);
