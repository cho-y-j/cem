import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDeploymentOwner() {
  console.log('=== Checking deployment owner for work_journal ===\n');

  const { data: deployment, error } = await supabase
    .from('deployments')
    .select('id, owner_id, equipment_id, worker_id, start_date')
    .eq('id', 'xbYJxQPVFwW9MGLhtV4Ih')
    .single();

  if (error) {
    console.error('Error:', error);
    console.log('\nThis deployment_id does not exist in deployments table!');
  } else {
    console.log('Deployment found:');
    console.table(deployment);

    // Get owner details
    const { data: owner } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('id', deployment.owner_id)
      .single();

    console.log('\nOwner details:');
    console.table(owner);
  }
}

checkDeploymentOwner().catch(console.error);
