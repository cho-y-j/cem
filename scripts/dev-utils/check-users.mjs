import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  console.log('=== Checking Users ===\n');

  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total users: ${users?.length || 0}\n`);

  users?.forEach(user => {
    console.log(`Email: ${user.email}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Company ID: ${user.company_id}`);
    console.log(`  Password: ${user.password ? '✅ SET' : '❌ NULL'}`);
    console.log(`  ID: ${user.id}`);
    console.log();
  });

  // Check admin user specifically
  const { data: admin } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'admin@test.com')
    .single();

  if (admin) {
    console.log('=== Admin User Details ===');
    console.log(JSON.stringify(admin, null, 2));
  } else {
    console.log('❌ Admin user not found!');
  }
}

checkUsers().catch(console.error);
