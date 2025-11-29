/**
 * Owner 권한 필터링 디버그 스크립트
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

async function checkOwnerDeployments() {
  console.log("🔍 Owner 및 Deployment 데이터 확인 중...\n");

  // 1. Owner 역할 사용자 조회
  console.log("===== 1. Owner 역할 사용자 목록 =====");
  const { data: owners, error: ownersError } = await supabase
    .from("users")
    .select("id, name, email, role, company_id")
    .eq("role", "owner");

  if (ownersError) {
    console.error("❌ Owner 조회 오류:", ownersError);
    return;
  }

  console.log(`총 ${owners?.length || 0}명의 Owner 사용자:\n`);
  owners?.forEach((o, i) => {
    console.log(`${i + 1}. ${o.name} (${o.email})`);
    console.log(`   ID: ${o.id}`);
    console.log(`   Company ID: ${o.company_id || "❌ NULL"}`);
    console.log("");
  });

  // 2. 활성 Deployment 조회
  console.log("\n===== 2. 활성 Deployment 목록 =====");
  const { data: deployments, error: deploymentsError } = await supabase
    .from("deployments")
    .select(`
      id,
      status,
      worker_id,
      guide_worker_id,
      owner_id,
      owner_company_id,
      bp_company_id,
      ep_company_id,
      equipment_id
    `)
    .eq("status", "active");

  if (deploymentsError) {
    console.error("❌ Deployment 조회 오류:", deploymentsError);
    return;
  }

  console.log(`총 ${deployments?.length || 0}개의 활성 Deployment:\n`);
  deployments?.forEach((d, i) => {
    console.log(`${i + 1}. Deployment ID: ${d.id}`);
    console.log(`   Status: ${d.status}`);
    console.log(`   Worker ID: ${d.worker_id || "N/A"}`);
    console.log(`   Guide Worker ID: ${d.guide_worker_id || "N/A"}`);
    console.log(`   Owner ID: ${d.owner_id || "❌ NULL"}`);
    console.log(`   Owner Company ID: ${d.owner_company_id || "❌ NULL"}`);
    console.log(`   BP Company ID: ${d.bp_company_id || "N/A"}`);
    console.log(`   EP Company ID: ${d.ep_company_id || "N/A"}`);
    console.log("");
  });

  // 3. 회사 목록 조회
  console.log("\n===== 3. 회사 목록 (Owner 관련) =====");
  const companyIds = new Set();
  owners?.forEach(o => o.company_id && companyIds.add(o.company_id));
  deployments?.forEach(d => {
    d.owner_company_id && companyIds.add(d.owner_company_id);
    d.bp_company_id && companyIds.add(d.bp_company_id);
    d.ep_company_id && companyIds.add(d.ep_company_id);
  });

  if (companyIds.size > 0) {
    const { data: companies } = await supabase
      .from("companies")
      .select("id, name, company_type")
      .in("id", Array.from(companyIds));

    console.log(`관련 회사 ${companies?.length || 0}개:\n`);
    companies?.forEach((c, i) => {
      console.log(`${i + 1}. ${c.name} (${c.company_type})`);
      console.log(`   ID: ${c.id}`);
      console.log("");
    });
  }

  // 4. 문제 분석
  console.log("\n===== 4. 문제 분석 =====");

  // owner_company_id가 NULL인 deployment 확인
  const deploymentsWithoutOwnerCompany = deployments?.filter(d => !d.owner_company_id) || [];
  if (deploymentsWithoutOwnerCompany.length > 0) {
    console.log(`⚠️  owner_company_id가 NULL인 Deployment: ${deploymentsWithoutOwnerCompany.length}개`);
    deploymentsWithoutOwnerCompany.forEach(d => {
      console.log(`   - ${d.id} (owner_id: ${d.owner_id || "NULL"})`);
    });
  } else {
    console.log("✅ 모든 Deployment에 owner_company_id가 설정되어 있습니다.");
  }

  // company_id가 NULL인 Owner 확인
  const ownersWithoutCompany = owners?.filter(o => !o.company_id) || [];
  if (ownersWithoutCompany.length > 0) {
    console.log(`⚠️  company_id가 NULL인 Owner: ${ownersWithoutCompany.length}명`);
    ownersWithoutCompany.forEach(o => {
      console.log(`   - ${o.name} (${o.email})`);
    });
  } else {
    console.log("✅ 모든 Owner에 company_id가 설정되어 있습니다.");
  }
}

checkOwnerDeployments().catch(console.error);
