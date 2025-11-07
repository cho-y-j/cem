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

async function checkSchema() {
  console.log('=== Checking entry_requests table schema ===\n');

  // Get column information for entry_requests
  const { data: entryRequestCols, error: err1 } = await supabase
    .rpc('pg_get_columns', { table_name: 'entry_requests' })
    .select('*');

  if (err1) {
    // Try alternative method
    const { data, error } = await supabase
      .from('entry_requests')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error querying entry_requests:', error);
    } else {
      console.log('entry_requests exists. Sample row structure:', data?.[0] ? Object.keys(data[0]) : 'No rows');
    }
  }

  console.log('\n=== Checking entry_request_items table schema ===\n');

  const { data: items, error: itemsError } = await supabase
    .from('entry_request_items')
    .select('*')
    .limit(1);

  if (itemsError) {
    console.error('Error querying entry_request_items:', itemsError);
  } else {
    console.log('entry_request_items exists. Columns:', items?.[0] ? Object.keys(items[0]) : 'No rows');
  }

  // Check if we can insert a test entry request
  console.log('\n=== Testing entry request creation ===\n');

  const testRequestId = `test-request-${Date.now()}`;
  const testRequestNumber = `TEST-${Date.now()}`;

  // First, get a valid user and company for testing
  const { data: users } = await supabase
    .from('users')
    .select('id, company_id, role')
    .eq('role', 'owner')
    .limit(1);

  const { data: bpCompanies } = await supabase
    .from('companies')
    .select('id')
    .eq('type', 'bp')
    .limit(1);

  if (!users || users.length === 0) {
    console.log('No owner users found in database');
    return;
  }

  if (!bpCompanies || bpCompanies.length === 0) {
    console.log('No BP companies found in database');
    return;
  }

  const testUser = users[0];
  const testBpCompany = bpCompanies[0];

  console.log('Test user:', testUser);
  console.log('Test BP company:', testBpCompany);

  const { data: createdRequest, error: createError } = await supabase
    .from('entry_requests')
    .insert({
      id: testRequestId,
      request_number: testRequestNumber,
      owner_company_id: testUser.company_id,
      owner_user_id: testUser.id,
      owner_requested_at: new Date().toISOString(),
      target_bp_company_id: testBpCompany.id,
      purpose: 'Test purpose',
      requested_start_date: '2025-11-01',
      requested_end_date: '2025-11-30',
      status: 'owner_requested',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (createError) {
    console.error('❌ Failed to create entry request:', createError);
    console.error('Error details:', JSON.stringify(createError, null, 2));
  } else {
    console.log('✅ Successfully created entry request:', createdRequest);

    // Clean up - delete the test request
    await supabase
      .from('entry_requests')
      .delete()
      .eq('id', testRequestId);

    console.log('✅ Test request cleaned up');
  }
}

checkSchema().catch(console.error);
