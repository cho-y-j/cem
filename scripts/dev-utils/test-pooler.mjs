import postgres from 'postgres';

// Connection Pooler 사용 (포트 6543)
const connectionString = "postgresql://postgres.zlgehckxiuhjpfjlaycf:cho2239148!@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres";

async function testConnection() {
  try {
    console.log("Connecting to Supabase via Connection Pooler...");
    const sql = postgres(connectionString, {
      ssl: 'require',
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    
    console.log("Testing query...");
    const result = await sql`SELECT NOW() as current_time`;
    console.log("✅ Connection successful!", result);
    
    // 테이블 목록 확인
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    console.log("\n📋 Available tables:", tables.map(t => t.table_name));
    
    await sql.end();
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
  }
}

testConnection();
