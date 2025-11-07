import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Checking actual table schemas...\n');

// Get all data from deployments to see actual structure
const { data, error } = await supabase
  .from('deployments')
  .select('*')
  .limit(1);

if (error) {
  console.error('❌ Error:', error);
} else {
  console.log('✅ Deployments table structure:');
  if (data && data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
    console.log('\nSample data:', data[0]);
  } else {
    console.log('No data in table yet');
  }
}

// Also check entry_requests
const { data: erData, error: erError } = await supabase
  .from('entry_requests')
  .select('*')
  .limit(1);

if (erError) {
  console.error('\n❌ Entry Requests Error:', erError);
} else {
  console.log('\n✅ Entry Requests table structure:');
  if (erData && erData.length > 0) {
    console.log('Columns:', Object.keys(erData[0]));
  } else {
    console.log('No data in table yet');
  }
}

process.exit(0);
