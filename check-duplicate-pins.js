/**
 * 중복 PIN 확인 스크립트
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDuplicatePins() {
  console.log('\n🔍 중복 PIN 확인 시작...\n');

  // PIN "0000"을 가진 모든 workers 조회
  const { data: workersWithPin0000, error } = await supabase
    .from('workers')
    .select('*')
    .eq('pin_code', '0000');

  if (error) {
    console.error('❌ 조회 실패:', error);
    return;
  }

  console.log(`📊 PIN "0000"을 가진 Workers: ${workersWithPin0000?.length || 0}명\n`);

  if (workersWithPin0000 && workersWithPin0000.length > 0) {
    workersWithPin0000.forEach((worker, index) => {
      console.log(`${index + 1}. Worker:`, {
        id: worker.id,
        name: worker.name,
        email: worker.email,
        pinCode: worker.pin_code,
        ownerId: worker.owner_id,
      });
    });
  }

  console.log('\n✅ 확인 완료\n');
}

checkDuplicatePins().catch(console.error);
