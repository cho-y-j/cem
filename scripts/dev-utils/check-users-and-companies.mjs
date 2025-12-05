import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('=== Checking users table schema ===\n');

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .limit(1);

  if (usersError) {
    console.error('Error:', usersError);
  } else {
    console.log('Users table columns:');
    if (users && users.length > 0) {
      console.log(Object.keys(users[0]));
    } else {
      console.log('No users found in table');
    }
  }

  console.log('\n=== Checking companies table data ===\n');

  const { data: allCompanies, error: companiesError } = await supabase
    .from('companies')
    .select('*');

  if (companiesError) {
    console.error('Error:', companiesError);
  } else {
    console.log(`Total companies: ${allCompanies?.length || 0}`);
    allCompanies?.forEach(c => {
      console.log(`  - ${c.name} (type: ${c.company_type}, id: ${c.id})`);
    });
  }

  console.log('\n=== Querying BP companies ===\n');

  const { data: bpCompanies, error: bpError } = await supabase
    .from('companies')
    .select('*')
    .eq('company_type', 'bp');

  if (bpError) {
    console.error('Error:', bpError);
  } else {
    console.log(`BP companies: ${bpCompanies?.length || 0}`);
    bpCompanies?.forEach(c => {
      console.log(`  - ${c.name} (${c.id})`);
    });
  }
}

checkSchema().catch(console.error);
