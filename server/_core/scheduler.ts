import * as db from "../db";

/**
 * 서류 만료 예정 체크 및 알림 발송
 * 매일 자동 실행 (D-30, D-14, D-7, D-3, D-day, 만료 후)
 */
export async function checkDocumentExpiry() {
  console.log('[Scheduler] 서류 만료 체크 시작...');

  try {
    // db.ts의 createDocumentExpiryNotifications 함수 사용
    const count = await db.createDocumentExpiryNotifications();
    console.log(`[Scheduler] 서류 만료 알림 ${count}건 생성됨`);
  } catch (error) {
    console.error('[Scheduler] 서류 만료 체크 중 오류 발생:', error);
  }

  console.log('[Scheduler] 서류 만료 체크 완료');
}

/**
 * 스케줄러 시작
 * 매일 오전 9시에 실행
 */
export function startScheduler() {
  console.log('[Scheduler] 스케줄러 시작');

  // 서버 시작 5초 후 첫 실행 (DB 연결 완료 대기)
  setTimeout(() => {
    console.log('[Scheduler] 초기 서류 만료 체크 실행');
    checkDocumentExpiry();
  }, 5000);

  // 매일 오전 9시에 실행
  setInterval(() => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // 오전 9시 0분에만 실행 (중복 방지)
    if (hours === 9 && minutes === 0) {
      console.log('[Scheduler] 정기 서류 만료 체크 실행');
      checkDocumentExpiry();
    }
  }, 60 * 1000); // 1분마다 체크 (정확한 9시 실행을 위해)

  console.log('[Scheduler] 스케줄러 등록 완료 (매일 오전 9시 실행)');
}

/**
 * 수동으로 서류 만료 체크 실행 (테스트용)
 */
export async function manualCheckDocumentExpiry() {
  console.log('[Scheduler] 수동 서류 만료 체크 시작');
  await checkDocumentExpiry();
  console.log('[Scheduler] 수동 서류 만료 체크 완료');
}
