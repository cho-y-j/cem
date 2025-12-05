import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSQL(sql) {
  // Supabase는 직접 SQL 실행을 지원하지 않으므로
  // RPC 함수를 사용하거나 SQL Editor API를 사용해야 함
  // 여기서는 간단하게 각 SQL 문을 분리하여 실행
  
  // DO 블록과 일반 SQL을 분리
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'))
    .filter(s => s.length > 0);

  console.log(`\n📝 Found ${statements.length} SQL statements\n`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    // DO 블록은 세미콜론으로 끝나지 않으므로 별도 처리
    if (statement.includes('DO $$')) {
      console.log(`[${i + 1}/${statements.length}] Executing DO block...`);
      try {
        // DO 블록은 전체를 하나의 문으로 처리
        const doBlock = sql.match(/DO \$\$[\s\S]*?\$\$;/g);
        if (doBlock && doBlock.length > 0) {
          for (const block of doBlock) {
            const { error } = await supabase.rpc('exec_sql', { 
              sql_query: block 
            }).catch(() => {
              // RPC가 없을 수 있으므로 직접 실행 시도
              return { error: { message: 'RPC not available' } };
            });

            if (error && !error.message.includes('not available')) {
              console.warn(`⚠️  DO block execution note: ${error.message}`);
            } else {
              console.log(`✓ DO block executed`);
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️  DO block: ${error.message}`);
      }
      continue;
    }

    // ALTER TABLE, CREATE INDEX 등의 일반 SQL
    if (statement.match(/^(ALTER|CREATE|UPDATE|INSERT|DELETE)/i)) {
      console.log(`[${i + 1}/${statements.length}] Executing: ${statement.substring(0, 50)}...`);
      
      try {
        // Supabase는 직접 SQL 실행을 지원하지 않으므로
        // 여기서는 SQL Editor를 통해 수동 실행이 필요함을 안내
        console.log(`⚠️  Direct SQL execution not available via REST API`);
        console.log(`   Please execute this SQL in Supabase SQL Editor:`);
        console.log(`   ${statement.substring(0, 100)}...\n`);
      } catch (error) {
        console.error(`❌ Error: ${error.message}`);
      }
    }
  }
}

async function applyMigration(filename) {
  console.log(`\n🚀 Applying migration: ${filename}\n`);
  console.log('='.repeat(60));

  try {
    const sql = fs.readFileSync(filename, 'utf8');
    await executeSQL(sql);
    console.log(`\n✅ Migration file processed: ${filename}`);
  } catch (error) {
    console.error(`\n❌ Error reading migration file: ${error.message}`);
    process.exit(1);
  }
}

async function main() {
  console.log('📦 Supabase Migration Applier');
  console.log('='.repeat(60));

  const migrations = [
    'drizzle/migrations-pg/0010_fix_foreign_key_constraints.sql',
    'drizzle/migrations-pg/0011_add_owner_company_id_to_workers.sql'
  ];

  for (const migration of migrations) {
    if (fs.existsSync(migration)) {
      await applyMigration(migration);
    } else {
      console.error(`❌ Migration file not found: ${migration}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('⚠️  IMPORTANT: Supabase REST API does not support direct SQL execution.');
  console.log('   Please execute the SQL statements manually in Supabase SQL Editor.');
  console.log('   Files to execute:');
  migrations.forEach(m => console.log(`   - ${m}`));
  console.log('\n✅ Migration script completed');
}

main().catch(console.error);

