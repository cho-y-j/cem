import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('=== Checking companies table schema ===\n');

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Companies table columns:');
    if (data && data.length > 0) {
      console.log(Object.keys(data[0]));
    } else {
      // Try inserting a minimal row to see what columns exist
      const { error: insertError } = await supabase
        .from('companies')
        .insert({ id: 'test-id' });

      if (insertError) {
        console.log('Insert error message:', insertError.message);
        console.log('This tells us about required columns');
      }
    }
  }
}

checkSchema().catch(console.error);
