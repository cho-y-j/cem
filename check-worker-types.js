import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkWorkerTypes() {
  const { data, error } = await supabase.from('worker_types').select('*');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Worker Types:');
    console.table(data);
  }
}

checkWorkerTypes();
