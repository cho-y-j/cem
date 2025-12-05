import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

// DATABASE_URL에서 연결 정보 추출
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL이 설정되지 않았습니다.');
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

async function insertItems() {
  try {
    await client.connect();
    console.log('=== PostgreSQL 직접 연결 성공 ===\n');

    const templateId = 'bUKZFg1nv4gklE9tceuak';

    // 기존 항목 확인
    const checkResult = await client.query(
      'SELECT COUNT(*) FROM safety_inspection_template_items WHERE template_id = $1',
      [templateId]
    );

    console.log(`기존 항목 수: ${checkResult.rows[0].count}\n`);

    if (parseInt(checkResult.rows[0].count) > 0) {
      console.log('이미 항목이 존재합니다. 건너뜁니다.');
      await client.end();
      return;
    }

    const items = [
      // 일일점검
      ['item_001', '일일점검', '작업계획서 비치', 'daily', 'before_use', 'status', 1, true],
      ['item_002', '일일점검', '후진 경보장치 작동 유무', 'daily', 'before_use', 'status', 2, true],
      ['item_003', '일일점검', '비상 정지버튼 정상작동 여부 및 버튼 복귀시 조작직전의 작동이 자동으로 되지 않는지 확인', 'daily', 'before_use', 'status', 3, true],
      ['item_004', '일일점검', '브레이크 클러치 조정장치 및 인디케이터의 정상작동 유무', 'daily', 'before_use', 'status', 4, true],
      ['item_005', '일일점검', '작업 반경내 장애물 및 위험요인 확인', 'daily', 'before_use', 'status', 5, true],
      ['item_006', '일일점검', '유압 호스 및 연결부 누유 확인', 'daily', 'before_use', 'status', 6, true],

      // 주간점검
      ['item_101', '주간점검', '비파괴검사 실시여부 확인 (3개월 내)', 'weekly', 'before_use', 'status', 101, true],
      ['item_102', '주간점검', '붐, 선회장비 등 주요 구조부 및 차륜의 풀림, 균열, 변경, 누유, 이상 유무 확인', 'weekly', 'before_use', 'status', 102, true],
      ['item_103', '주간점검', '소화기 비치 및 소화기 상태 유무', 'weekly', 'before_use', 'status', 103, true],
      ['item_104', '주간점검', '와이어로프 및 체인 마모, 변형 상태 확인', 'weekly', 'before_use', 'status', 104, true],
      ['item_105', '주간점검', '안전난간 및 작업대 손상 여부 확인', 'weekly', 'before_use', 'status', 105, true],

      // 월간점검
      ['item_201', '월간점검', '임의부착장치(구조변경 미승인 장치) 설치 유무 확인 (없을 경우 N/A 표기)', 'monthly', 'before_use', 'status', 201, true],
      ['item_202', '월간점검', '유압실린더 및 펌프 작동 상태 점검', 'monthly', 'before_use', 'status', 202, true],
      ['item_203', '월간점검', '전기 계통 및 배선 상태 점검', 'monthly', 'before_use', 'status', 203, true],
      ['item_204', '월간점검', '안전벨트 및 안전고리 상태 점검', 'monthly', 'before_use', 'status', 204, true],

      // 필요시점검
      ['item_301', '필요시점검', '작업 중 붐 최대 인출 시 고압선로와의 이격 거리 (m)', 'as_needed', 'during_use', 'text', 301, false],
      ['item_302', '필요시점검', '악천후(강풍, 폭우, 폭설) 시 작업 중단 여부', 'as_needed', 'during_use', 'status', 302, false],
      ['item_303', '필요시점검', '긴급 상황 발생 시 조치 사항', 'as_needed', 'after_use', 'text', 303, false],
    ];

    console.log(`총 ${items.length}개 항목 삽입 시작...\n`);

    for (const [id, category, itemText, freq, timing, resultType, order, required] of items) {
      await client.query(
        `INSERT INTO safety_inspection_template_items
         (id, template_id, category, item_text, check_frequency, check_timing, result_type, display_order, is_required, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [id, templateId, category, itemText, freq, timing, resultType, order, required]
      );

      const freqLabel = { daily: '일일', weekly: '주간', monthly: '월간', as_needed: '필요시' }[freq];
      console.log(`✓ [${freqLabel}/${category}] ${itemText.substring(0, 40)}${itemText.length > 40 ? '...' : ''}`);
    }

    // 최종 확인
    const finalCount = await client.query(
      'SELECT COUNT(*) FROM safety_inspection_template_items WHERE template_id = $1',
      [templateId]
    );

    console.log('\n=== 삽입 완료! ===');
    console.log(`총 ${finalCount.rows[0].count}개 항목이 생성되었습니다.`);

    // 카테고리별 집계
    const summary = await client.query(
      `SELECT category, COUNT(*) as count
       FROM safety_inspection_template_items
       WHERE template_id = $1
       GROUP BY category
       ORDER BY category`,
      [templateId]
    );

    console.log('\n카테고리별 항목 수:');
    summary.rows.forEach(row => {
      console.log(`  - ${row.category}: ${row.count}개`);
    });

  } catch (error) {
    console.error('❌ 에러 발생:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

insertItems();
