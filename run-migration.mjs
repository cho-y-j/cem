import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:cho2239148!@db.zlgehckxiuhjpfjlaycf.supabase.co:5432/postgres"
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting database migration...\n');
    
    // SQL 파일 읽기
    const sqlFile = path.join(__dirname, 'supabase_companies_migration.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // 트랜잭션 시작
    await client.query('BEGIN');
    
    console.log('📝 Executing migration SQL...');
    const result = await client.query(sql);
    
    // 커밋
    await client.query('COMMIT');
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Created/Modified tables:');
    console.log('  - companies (NEW)');
    console.log('  - equipment (modified)');
    console.log('  - workers (modified)');
    console.log('  - entry_requests (modified)');
    console.log('  - location_logs (NEW)');
    console.log('  - emergency_alerts (NEW)');
    console.log('  - work_sessions (NEW)');
    console.log('  - entry_request_items (modified)');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();

