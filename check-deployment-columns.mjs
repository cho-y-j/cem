import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Checking deployments table columns...\n');

// Try to query the table structure
const { data, error } = await supabase
  .from('deployments')
  .select('*')
  .limit(0);

if (error) {
  console.error('❌ Error querying deployments table:', error);
} else {
  console.log('✅ Deployments table exists and is accessible');
}

// Try to get column info from information_schema
const { data: columns, error: colError } = await supabase
  .rpc('exec_sql', {
    query: `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'deployments'
      ORDER BY ordinal_position;
    `
  });

if (columns) {
  console.log('\n📋 Columns in deployments table:');
  columns.forEach(col => {
    console.log(`  - ${col.column_name} (${col.data_type})`);
  });
} else {
  console.log('\n❌ Could not fetch column info');

  // Try a simpler approach - just try to insert and see what error we get
  console.log('\n🧪 Attempting test query to see actual schema...');
  const { data: testData, error: testError } = await supabase
    .from('deployments')
    .select('id, entry_request_id, equipment_id, worker_id, status, start_date, planned_end_date')
    .limit(1);

  if (testError) {
    console.error('Test query error:', testError);
  } else {
    console.log('Test query succeeded - these columns exist:', Object.keys(testData?.[0] || {}));
  }
}

process.exit(0);
