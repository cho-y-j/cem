import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔧 Adding specification column to equipment table...\n');

// 1. Check current equipment table structure
console.log('1️⃣ Checking current equipment columns...\n');
const { data: equipmentBefore } = await supabase
  .from('equipment')
  .select('*')
  .limit(1);

console.log('Current columns:', Object.keys(equipmentBefore?.[0] || {}));

// 2. Add specification column via raw SQL
console.log('\n2️⃣ Adding specification column via RPC...\n');

// Use Supabase's SQL execution
const { error: addColError } = await supabase.rpc('exec_sql', {
  query: `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'equipment'
        AND column_name = 'specification'
      ) THEN
        ALTER TABLE equipment ADD COLUMN specification VARCHAR(200);
        RAISE NOTICE 'Column added successfully';
      ELSE
        RAISE NOTICE 'Column already exists';
      END IF;
    END $$;
  `
});

if (addColError) {
  // Try direct approach
  console.log('RPC approach failed, trying direct approach...\n');

  // First check if column exists by trying to query it
  const { error: testError } = await supabase
    .from('equipment')
    .select('specification')
    .limit(1);

  if (testError && testError.code === '42703') {
    console.log('❌ Column does not exist. We need to add it via Supabase UI or SQL editor.');
    console.log('\n📝 Please run this SQL in Supabase SQL Editor:\n');
    console.log('ALTER TABLE equipment ADD COLUMN specification VARCHAR(200);');
    console.log('\nAfter adding the column, run this script again.\n');
    process.exit(1);
  } else if (!testError) {
    console.log('✅ Column already exists!\n');
  }
}

// 3. Update equipment with specifications
console.log('3️⃣ Updating equipment with specifications...\n');

const { data: equipment } = await supabase
  .from('equipment')
  .select('id, reg_num, specification, equip_type:equip_types!equipment_equip_type_id_fkey(name)');

console.log(`Found ${equipment?.length || 0} equipment records\n`);

for (const equip of equipment || []) {
  // Skip if already has specification
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

console.log('\n🎉 Equipment specifications update complete!');
process.exit(0);
