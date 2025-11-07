import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function clearDraftInspections() {
  console.log('\n=== Draft 점검 삭제 ===\n');

  // 1. draft 상태의 점검 ID 조회
  const { data: draftInspections, error: fetchError } = await supabase
    .from('safety_inspections')
    .select('id')
    .eq('status', 'draft');

  if (fetchError) {
    console.error('조회 오류:', fetchError);
    return;
  }

  if (!draftInspections || draftInspections.length === 0) {
    console.log('삭제할 draft 점검이 없습니다.');
    return;
  }

  console.log(`발견된 draft 점검: ${draftInspections.length}개`);

  // 2. 각 점검의 결과 먼저 삭제
  for (const inspection of draftInspections) {
    const { error: resultDeleteError } = await supabase
      .from('safety_inspection_results')
      .delete()
      .eq('inspection_id', inspection.id);

    if (resultDeleteError) {
      console.error(`결과 삭제 오류 (${inspection.id}):`, resultDeleteError);
    } else {
      console.log(`✓ 점검 ${inspection.id}의 결과 삭제 완료`);
    }
  }

  // 3. 점검 삭제
  const { error: deleteError } = await supabase
    .from('safety_inspections')
    .delete()
    .eq('status', 'draft');

  if (deleteError) {
    console.error('점검 삭제 오류:', deleteError);
    return;
  }

  console.log(`\n✅ ${draftInspections.length}개의 draft 점검이 삭제되었습니다.\n`);
}

clearDraftInspections();
