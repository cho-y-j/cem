import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('=== Checking Work Journal Data ===\n');

  // 1. Check owner-test-001's deployments
  console.log('1. Deployments for owner-test-001:');
  const { data: deployments, error: deploymentError } = await supabase
    .from('deployments')
    .select('id, equipment_id, worker_id, start_date')
    .eq('owner_id', 'owner-test-001');

  if (deploymentError) {
    console.error('Error:', deploymentError);
  } else {
    console.log(`Found ${deployments?.length || 0} deployments:`);
    console.table(deployments);
  }

  // 2. Check all work_journal records
  console.log('\n2. All work_journal records:');
  const { data: journals, error: journalError } = await supabase
    .from('work_journal')
    .select('id, deployment_id, work_date, status')
    .limit(10);

  if (journalError) {
    console.error('Error:', journalError);
  } else {
    console.log(`Found ${journals?.length || 0} work journals:`);
    console.table(journals);
  }

  // 3. Check if there are any work_journals for owner-test-001's deployments
  if (deployments && deployments.length > 0) {
    const deploymentIds = deployments.map(d => d.id);
    console.log('\n3. Work journals for owner-test-001 deployments:');
    console.log('Looking for deployment_ids:', deploymentIds);

    const { data: ownerJournals, error: ownerJournalError } = await supabase
      .from('work_journal')
      .select('*')
      .in('deployment_id', deploymentIds);

    if (ownerJournalError) {
      console.error('Error:', ownerJournalError);
    } else {
      console.log(`Found ${ownerJournals?.length || 0} work journals for owner-test-001:`);
      console.table(ownerJournals);
    }
  }

  // 4. Check what deployment_ids exist in work_journal
  console.log('\n4. Sample deployment_ids in work_journal table:');
  const { data: allJournals, error: allJournalsError } = await supabase
    .from('work_journal')
    .select('deployment_id');

  if (allJournalsError) {
    console.error('Error:', allJournalsError);
  } else {
    const uniqueDeploymentIds = [...new Set(allJournals?.map(j => j.deployment_id))];
    console.log('Unique deployment_ids in work_journal:', uniqueDeploymentIds);
  }

  // 5. Check what owner_ids exist in deployments
  console.log('\n5. Sample owner_ids in deployments table:');
  const { data: allDeployments, error: allDeploymentsError } = await supabase
    .from('deployments')
    .select('owner_id')
    .limit(10);

  if (allDeploymentsError) {
    console.error('Error:', allDeploymentsError);
  } else {
    const uniqueOwnerIds = [...new Set(allDeployments?.map(d => d.owner_id))];
    console.log('Sample owner_ids in deployments:', uniqueOwnerIds);
  }
}

checkData().catch(console.error);
