import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('=== 안전점검 테이블 확인 ===\n');

  // 1. 템플릿 테이블 확인
  console.log('1. safety_inspection_templates 테이블 확인...');
  const { data: templates, error: templatesError } = await supabase
    .from('safety_inspection_templates')
    .select('*')
    .limit(5);

  if (templatesError) {
    console.error('❌ 에러:', templatesError.message);
  } else {
    console.log(`✓ 테이블 존재 확인 (${templates.length}개 레코드)`);
    templates.forEach(t => console.log(`  - ${t.name} (${t.id})`));
  }

  // 2. 템플릿 항목 테이블 확인
  console.log('\n2. safety_inspection_template_items 테이블 확인...');
  const { data: items, error: itemsError } = await supabase
    .from('safety_inspection_template_items')
    .select('*')
    .limit(5);

  if (itemsError) {
    console.error('❌ 에러:', itemsError.message);
    console.log('   코드:', itemsError.code);
  } else {
    console.log(`✓ 테이블 존재 확인 (${items.length}개 레코드)`);
    items.forEach(i => console.log(`  - ${i.item_text.substring(0, 40)}...`));
  }

  // 3. 점검 테이블 확인
  console.log('\n3. safety_inspections 테이블 확인...');
  const { data: inspections, error: inspectionsError } = await supabase
    .from('safety_inspections')
    .select('*')
    .limit(5);

  if (inspectionsError) {
    console.error('❌ 에러:', inspectionsError.message);
  } else {
    console.log(`✓ 테이블 존재 확인 (${inspections.length}개 레코드)`);
  }

  // 4. 결과 테이블 확인
  console.log('\n4. safety_inspection_results 테이블 확인...');
  const { data: results, error: resultsError } = await supabase
    .from('safety_inspection_results')
    .select('*')
    .limit(5);

  if (resultsError) {
    console.error('❌ 에러:', resultsError.message);
  } else {
    console.log(`✓ 테이블 존재 확인 (${results.length}개 레코드)`);
  }

  console.log('\n=== 확인 완료 ===');
}

checkTables().catch(console.error);
