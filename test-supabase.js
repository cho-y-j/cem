import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Testing Supabase connection...\n');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Test 1: Check connection with simple query
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);

    if (tablesError) {
      console.log('Trying alternative connection test...');

      // Test 2: Get public tables using RPC or direct query
      const { data, error } = await supabase.rpc('version');

      if (error) {
        // Test 3: Try listing tables using schema
        const { data: schemaData, error: schemaError } = await supabase
          .from('users')
          .select('count')
          .limit(0);

        if (schemaError && schemaError.code !== 'PGRST116') {
          throw schemaError;
        }

        console.log('✓ Supabase connection successful!');
        console.log('✓ Can query database tables');
      } else {
        console.log('✓ Supabase connection successful!');
        console.log('Database version check passed');
      }
    } else {
      console.log('✓ Supabase connection successful!');
    }

    // Alternative: Try to access known tables
    const knownTables = ['users', 'companies', 'equipment', 'workers', 'assignments'];
    console.log('\nChecking known tables:');

    for (const table of knownTables) {
      const { error } = await supabase
        .from(table)
        .select('count')
        .limit(0);

      if (!error || error.code === 'PGRST116') {
        console.log(`  ✓ ${table} - accessible`);
      } else if (error.code === '42P01') {
        console.log(`  ✗ ${table} - does not exist`);
      } else {
        console.log(`  ? ${table} - ${error.message}`);
      }
    }

    console.log('\n✓ Connection test completed!');

  } catch (error) {
    console.error('✗ Connection failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

testConnection();
