import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🚀 Applying specification column migration...\n');

// Read the migration SQL
const migrationSQL = fs.readFileSync(
  path.join(process.cwd(), 'drizzle', 'migrations-pg', '0004_sour_raza.sql'),
  'utf-8'
);

console.log('📝 Migration SQL:');
console.log(migrationSQL);
console.log('');

// Execute using Supabase SQL query (requires postgres extension or direct connection)
// Since we can't use RPC, we'll use the REST API directly

// First, check if column exists
const { data: testData, error: testError } = await supabase
  .from('equipment')
  .select('specification')
  .limit(1);

if (testError && testError.code === '42703') {
  console.log('⚠️  Column does not exist. Attempting to add it...\n');

  // Try using postgres connection string directly
  const { default: pg } = await import('pg');
  const { Pool } = pg;

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL\n');

    await client.query(migrationSQL);
    console.log('✅ Migration applied successfully!\n');

    // Now update test data
    console.log('📝 Updating test equipment with specification...\n');

    const { data: equipment } = await supabase
      .from('equipment')
      .select('id, reg_num, specification, equip_type:equip_types!equipment_equip_type_id_fkey(name)');

    console.log(`Found ${equipment?.length || 0} equipment records\n`);

    for (const equip of equipment || []) {
      if (equip.specification) {
        console.log(`⏭️  ${equip.reg_num}: Already has specification`);
        continue;
      }

      const spec = equip.equip_type?.name?.includes('굴삭기')
        ? '10톤급, 작업높이 20m, 버킷용량 0.5m³'
        : equip.equip_type?.name?.includes('크레인')
        ? '25톤급, 최대 인양높이 30m'
        : equip.equip_type?.name?.includes('덤프')
        ? '15톤 적재, 8륜구동'
        : '표준 규격';

      const { error: updateError } = await supabase
        .from('equipment')
        .update({ specification: spec })
        .eq('id', equip.id);

      if (updateError) {
        console.error(`❌ Error updating ${equip.reg_num}:`, updateError.message);
      } else {
        console.log(`✅ Updated ${equip.reg_num}: ${spec}`);
      }
    }

    client.release();
    await pool.end();

    console.log('\n🎉 Migration and data update complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
} else if (!testError) {
  console.log('✅ Column already exists! Updating data...\n');

  const { data: equipment } = await supabase
    .from('equipment')
    .select('id, reg_num, specification, equip_type:equip_types!equipment_equip_type_id_fkey(name)');

  console.log(`Found ${equipment?.length || 0} equipment records\n`);

  for (const equip of equipment || []) {
    if (equip.specification) {
      console.log(`⏭️  ${equip.reg_num}: Already has specification`);
      continue;
    }

    const spec = equip.equip_type?.name?.includes('굴삭기')
      ? '10톤급, 작업높이 20m, 버킷용량 0.5m³'
      : equip.equip_type?.name?.includes('크레인')
      ? '25톤급, 최대 인양높이 30m'
      : equip.equip_type?.name?.includes('덤프')
      ? '15톤 적재, 8륜구동'
      : '표준 규격';

    const { error: updateError } = await supabase
      .from('equipment')
      .update({ specification: spec })
      .eq('id', equip.id);

    if (updateError) {
      console.error(`❌ Error updating ${equip.reg_num}:`, updateError.message);
    } else {
      console.log(`✅ Updated ${equip.reg_num}: ${spec}`);
    }
  }

  console.log('\n🎉 Data update complete!');
}

process.exit(0);
