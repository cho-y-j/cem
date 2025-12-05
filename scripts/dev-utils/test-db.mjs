import postgres from 'postgres';

const connectionString = "postgresql://postgres:cho2239148!@db.zlgehckxiuhjpfjlaycf.supabase.co:5432/postgres";

async function testConnection() {
  try {
    console.log("Connecting to PostgreSQL...");
    const sql = postgres(connectionString);
    
    console.log("Testing query...");
    const result = await sql`SELECT NOW()`;
    console.log("Connection successful!", result);
    
    await sql.end();
  } catch (error) {
    console.error("Connection failed:", error);
  }
}

testConnection();
