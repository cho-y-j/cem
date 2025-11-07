import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConstraints() {
  console.log('=== Checking entry_request_items constraints ===\n');

  // Try to insert without request_type
  const testItemId = `test-item-${Date.now()}`;

  const { data, error } = await supabase
    .from('entry_request_items')
    .insert({
      id: testItemId,
      entry_request_id: 'fake-request-id',
      item_type: 'equipment',
      item_id: 'fake-equipment-id',
    })
    .select();

  if (error) {
    console.error('❌ Error inserting without request_type:');
    console.error('Code:', error.code);
    console.error('Message:', error.message);
    console.error('Details:', error.details);
    console.error('Hint:', error.hint);
  } else {
    console.log('✅ Successfully inserted without request_type:', data);
    // Clean up
    await supabase
      .from('entry_request_items')
      .delete()
      .eq('id', testItemId);
  }
}

checkConstraints().catch(console.error);
