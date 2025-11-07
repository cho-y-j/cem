import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConstraints() {
  console.log('=== Checking entry_requests table columns and constraints ===\n');

  const { data, error } = await supabase
    .from('entry_requests')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  const columns = data && data.length > 0 ? Object.keys(data[0]) : [];

  console.log('All columns in entry_requests table:');
  console.log(columns);
  console.log();

  // Check for duplicate columns
  const bpColumns = columns.filter(col => col.includes('bp') || col.includes('company'));
  console.log('BP/Company related columns:');
  bpColumns.forEach(col => console.log(`  - ${col}`));
  console.log();

  console.log('Looking for NOT NULL constraints...');
  console.log('(From error message, these columns are NOT NULL:)');
  console.log('  - bp_company_id (레거시?)');
  console.log('  - target_bp_company_id (새 컬럼?)');
  console.log();

  console.log('Recommendation:');
  console.log('We need to fill BOTH bp_company_id AND target_bp_company_id');
  console.log('OR remove NOT NULL constraint from bp_company_id');
}

checkConstraints().catch(console.error);
