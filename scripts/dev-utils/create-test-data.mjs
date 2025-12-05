import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { nanoid } from 'nanoid';
import crypto from 'crypto';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Simple SHA-256 hash for password
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function createTestData() {
  console.log('=== Creating Test Data ===\n');

  // 1. Create BP Company
  console.log('1. Creating BP Company...');
  const bpCompanyId = `company-${nanoid()}`;
  const { data: bpCompany, error: bpError } = await supabase
    .from('companies')
    .insert({
      id: bpCompanyId,
      name: 'Test BP Company',
      company_type: 'bp',
      business_number: `BP-${Date.now()}`,
      phone: '02-1234-5678',
      address: 'Test BP Address',
      contact_person: 'BP Manager',
    })
    .select()
    .single();

  if (bpError) {
    console.error('❌ Failed to create BP company:', bpError);
  } else {
    console.log('✅ Created BP Company:', bpCompany.name);
  }
  console.log();

  // 2. Create EP Company
  console.log('2. Creating EP Company...');
  const epCompanyId = `company-${nanoid()}`;
  const { data: epCompany, error: epError } = await supabase
    .from('companies')
    .insert({
      id: epCompanyId,
      name: 'Test EP Company',
      company_type: 'ep',
      business_number: `EP-${Date.now()}`,
      phone: '02-2345-6789',
      address: 'Test EP Address',
      contact_person: 'EP Manager',
    })
    .select()
    .single();

  if (epError) {
    console.error('❌ Failed to create EP company:', epError);
  } else {
    console.log('✅ Created EP Company:', epCompany.name);
  }
  console.log();

  // 3. Create BP User
  if (bpCompany) {
    console.log('3. Creating BP User...');
    const bpUserId = `user-${nanoid()}`;
    const { data: bpUser, error: bpUserError } = await supabase
      .from('users')
      .insert({
        id: bpUserId,
        email: 'bp@test.com',
        password_hash: hashPassword('test123'),
        name: 'BP Test User',
        role: 'bp',
        company_id: bpCompanyId,
      })
      .select()
      .single();

    if (bpUserError) {
      console.error('❌ Failed to create BP user:', bpUserError);
    } else {
      console.log('✅ Created BP User:', bpUser.email);
    }
    console.log();
  }

  // 4. Create EP User
  if (epCompany) {
    console.log('4. Creating EP User...');
    const epUserId = `user-${nanoid()}`;
    const { data: epUser, error: epUserError } = await supabase
      .from('users')
      .insert({
        id: epUserId,
        email: 'ep@test.com',
        password_hash: hashPassword('test123'),
        name: 'EP Test User',
        role: 'ep',
        company_id: epCompanyId,
      })
      .select()
      .single();

    if (epUserError) {
      console.error('❌ Failed to create EP user:', epUserError);
    } else {
      console.log('✅ Created EP User:', epUser.email);
    }
    console.log();
  }

  console.log('✅ Test data creation complete!');
  console.log('\nTest credentials:');
  console.log('  BP: bp@test.com / test123');
  console.log('  EP: ep@test.com / test123');
}

createTestData().catch(console.error);
