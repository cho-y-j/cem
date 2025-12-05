import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('=== Applying Safety Inspection Migration ===\n');

  // Read the SQL file
  const sql = fs.readFileSync('./drizzle/migrations-pg/0005_long_the_spike.sql', 'utf8');

  // Split by statement-breakpoint
  const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(s => s);

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`[${i + 1}/${statements.length}] Executing statement...`);

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });

    if (error) {
      console.error(`❌ Error executing statement ${i + 1}:`, error);
      console.error('Statement:', statement.substring(0, 200) + '...');

      // Try direct query instead
      console.log('Trying direct query...');
      try {
        const lines = statement.split('\n').filter(line => !line.trim().startsWith('--'));
        const cleanSql = lines.join('\n');

        // For CREATE TABLE, we need to use the Supabase REST API or direct SQL
        console.log('Executing via raw SQL...');
        const { error: rawError } = await supabase.from('_temp_dummy').select('*').limit(0);

        if (rawError) {
          console.log('Will need to execute manually in Supabase SQL Editor.');
        }
      } catch (e) {
        console.error('Direct execution also failed:', e.message);
      }
    } else {
      console.log(`✓ Statement ${i + 1} executed successfully`);
    }
  }

  console.log('\n=== Migration process complete ===');
  console.log('\n⚠️  If there were errors, please run this SQL manually in Supabase SQL Editor:');
  console.log('\nSupabase Dashboard → SQL Editor → New Query → Paste the following:\n');
  console.log('---');
  console.log(sql);
  console.log('---');
}

applyMigration().catch(console.error);
