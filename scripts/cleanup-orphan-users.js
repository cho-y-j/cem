/**
 * 고아 사용자 정리 스크립트
 * workers 테이블에 없지만 users 테이블에 남아있는 worker 역할 사용자를 찾아 삭제합니다.
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findOrphanUsers() {
  console.log("🔍 고아 사용자 찾는 중...\n");

  // 1. users 테이블에서 worker 역할 사용자 조회
  const { data: workerUsers, error: usersError } = await supabase
    .from("users")
    .select("id, name, email, role")
    .eq("role", "worker");

  if (usersError) {
    console.error("❌ users 테이블 조회 오류:", usersError);
    return [];
  }

  console.log(`📋 worker 역할 사용자: ${workerUsers?.length || 0}명`);

  // 2. workers 테이블에서 연결된 user_id 조회
  const { data: workers, error: workersError } = await supabase
    .from("workers")
    .select("user_id, name");

  if (workersError) {
    console.error("❌ workers 테이블 조회 오류:", workersError);
    return [];
  }

  const linkedUserIds = new Set(workers?.map((w) => w.user_id).filter(Boolean));
  console.log(`🔗 workers에 연결된 user_id: ${linkedUserIds.size}개\n`);

  // 3. workers에 연결되지 않은 고아 사용자 찾기
  const orphanUsers = workerUsers?.filter((u) => !linkedUserIds.has(u.id)) || [];

  console.log(`⚠️  고아 사용자 (삭제 필요): ${orphanUsers.length}명`);
  orphanUsers.forEach((u) => {
    console.log(`   - ${u.name} (${u.email}) [ID: ${u.id}]`);
  });

  return orphanUsers;
}

async function deleteOrphanUsers(users) {
  if (users.length === 0) {
    console.log("\n✅ 삭제할 고아 사용자가 없습니다.");
    return;
  }

  console.log(`\n🗑️  ${users.length}명의 고아 사용자 삭제 시작...\n`);

  for (const user of users) {
    console.log(`   삭제 중: ${user.name} (${user.email})...`);

    // 1. Supabase Auth에서 삭제
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(user.id)) {
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
      if (authError) {
        console.log(`      ⚠️  Auth 삭제 경고: ${authError.message}`);
      } else {
        console.log(`      ✓ Auth에서 삭제됨`);
      }
    }

    // 2. users 테이블에서 삭제
    const { error: dbError } = await supabase
      .from("users")
      .delete()
      .eq("id", user.id);

    if (dbError) {
      console.log(`      ❌ DB 삭제 실패: ${dbError.message}`);
    } else {
      console.log(`      ✓ DB에서 삭제됨`);
    }
  }

  console.log("\n✅ 고아 사용자 정리 완료!");
}

async function main() {
  console.log("===========================================");
  console.log("   고아 사용자 정리 스크립트");
  console.log("===========================================\n");

  const orphanUsers = await findOrphanUsers();

  // 명령줄 인자로 --delete가 있으면 삭제 실행
  if (process.argv.includes("--delete")) {
    await deleteOrphanUsers(orphanUsers);
  } else if (orphanUsers.length > 0) {
    console.log("\n💡 삭제하려면 --delete 옵션과 함께 실행하세요:");
    console.log("   node scripts/cleanup-orphan-users.js --delete");
  }
}

main().catch(console.error);
