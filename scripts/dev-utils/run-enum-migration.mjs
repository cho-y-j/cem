import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('=== Adding owner_requested to entry_request_status enum ===\n');

  // PostgreSQL doesn't support IF NOT EXISTS for ALTER TYPE ADD VALUE before v12.3
  // So we'll check if the value exists first
  const { data: existingValues, error: checkError } = await supabase
    .rpc('check_enum_value', {
      enum_type: 'entry_request_status',
      value_to_check: 'owner_requested'
    });

  // If the function doesn't exist, we'll try the direct approach
  console.log('Attempting to add owner_requested value...');

  // Try to add the value
  const sql = `ALTER TYPE entry_request_status ADD VALUE IF NOT EXISTS 'owner_requested'`;

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    // If the RPC doesn't exist, print instructions for manual execution
    console.error('❌ Cannot execute SQL directly through Supabase client.');
    console.error('Error:', error.message);
    console.log('\n📋 Please run this SQL manually in Supabase SQL Editor:');
    console.log('----------------------------------------');
    console.log(`ALTER TYPE entry_request_status ADD VALUE IF NOT EXISTS 'owner_requested';`);
    console.log('----------------------------------------');
    console.log('\nOr copy from: add-owner-requested-status.sql');
    return;
  }

  console.log('✅ Successfully added owner_requested to the enum!');
}

runMigration().catch(console.error);
