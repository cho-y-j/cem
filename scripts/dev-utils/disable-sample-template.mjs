import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function disableSampleTemplate() {
  console.log('\n=== 범용 샘플 템플릿 비활성화 ===\n');

  // 범용 템플릿 "스카이장비 안전점검" 비활성화
  const { data, error } = await supabase
    .from('safety_inspection_templates')
    .update({ is_active: false })
    .eq('id', 'bUKZFg1nv4gklE9tceuak')
    .select();

  if (error) {
    console.error('비활성화 오류:', error);
    return;
  }

  console.log('✅ "스카이장비 안전점검" 템플릿 비활성화 완료!');
  console.log('\n이제 고소작업차 검색 시 "스카이" 템플릿만 나옵니다.\n');
}

disableSampleTemplate();
