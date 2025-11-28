/**
 * 장비 데이터 확인 스크립트
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

async function checkEquipment() {
  console.log("🔍 장비 데이터 확인 중...\n");

  // 장비 목록 조회
  const { data: equipment, error } = await supabase
    .from("equipment")
    .select(`
      id,
      reg_num,
      specification,
      owner_id,
      owner_company_id,
      status,
      created_at,
      equip_type:equip_types(id, name)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ 장비 조회 오류:", error);
    return;
  }

  console.log(`📋 총 장비 수: ${equipment?.length || 0}개\n`);

  equipment?.forEach((e, i) => {
    console.log(`${i + 1}. ${e.reg_num} (${e.specification || 'N/A'})`);
    console.log(`   ID: ${e.id}`);
    console.log(`   유형: ${e.equip_type?.name || 'N/A'}`);
    console.log(`   소유자 ID: ${e.owner_id || 'N/A'}`);
    console.log(`   상태: ${e.status}`);
    console.log(`   생성일: ${e.created_at}`);
    console.log('');
  });
}

checkEquipment().catch(console.error);
