import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

console.log('🔧 Adding specification column directly via PostgreSQL...\n');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

try {
  const client = await pool.connect();
  console.log('✅ Connected to PostgreSQL\n');

  // 1. Add column
  console.log('📝 Adding specification column...');
  await client.query('ALTER TABLE equipment ADD COLUMN IF NOT EXISTS specification VARCHAR(200);');
  console.log('✅ Column added!\n');

  // 2. Update existing equipment
  console.log('📝 Updating existing equipment...');
  const result = await client.query(`
    UPDATE equipment
    SET specification = '표준 규격'
    WHERE specification IS NULL;
  `);
  console.log(`✅ Updated ${result.rowCount} equipment records\n`);

  // 3. Verify
  const { rows } = await client.query(`
    SELECT id, reg_num, specification
    FROM equipment
    LIMIT 5;
  `);

  console.log('✅ Current equipment data:');
  rows.forEach(r => {
    console.log(`  ${r.reg_num}: ${r.specification || '(null)'}`);
  });

  client.release();
  await pool.end();

  console.log('\n🎉 Specification column successfully added!');
  console.log('\n👉 Now refresh your browser (Ctrl+Shift+R)');
  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  await pool.end();
  process.exit(1);
}
