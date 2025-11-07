import { db } from "../db";
import { docsCompliance, equipment, workers, users } from "../../drizzle/schema";
import { sendDocumentExpiryNotification } from "./email";
import { and, eq, gte, lte, sql } from "drizzle-orm";

/**
 * 서류 만료 예정 체크 및 알림 발송
 * 매일 오전 9시에 실행
 */
export async function checkDocumentExpiry() {
  console.log('[Scheduler] 서류 만료 체크 시작...');

  try {
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // 만료 예정 서류 조회 (30일 이내)
    const expiringDocs = await db
      .select({
        id: docsCompliance.id,
        docName: docsCompliance.docName,
        expiryDate: docsCompliance.expiryDate,
        equipmentId: docsCompliance.equipmentId,
        workerId: docsCompliance.workerId,
        uploadedBy: docsCompliance.uploadedBy,
      })
      .from(docsCompliance)
      .where(
        and(
          gte(docsCompliance.expiryDate, now),
          lte(docsCompliance.expiryDate, thirtyDaysLater)
        )
      );

    console.log(`[Scheduler] 만료 예정 서류 ${expiringDocs.length}건 발견`);

    // 각 서류에 대해 알림 발송
    for (const doc of expiringDocs) {
      try {
        // 대상 정보 조회 (장비 또는 인력)
        let targetName = '';
        let ownerEmail = '';

        if (doc.equipmentId) {
          // 장비 서류
          const equipmentData = await db
            .select({
              equipmentNumber: equipment.equipmentNumber,
              ownerId: equipment.ownerId,
            })
            .from(equipment)
            .where(eq(equipment.id, doc.equipmentId))
            .limit(1);

          if (equipmentData.length > 0) {
            targetName = `장비 ${equipmentData[0].equipmentNumber}`;
            
            // 소유자 이메일 조회
            if (equipmentData[0].ownerId) {
              const ownerData = await db
                .select({ email: users.email })
                .from(users)
                .where(eq(users.id, equipmentData[0].ownerId))
                .limit(1);
              
              if (ownerData.length > 0 && ownerData[0].email) {
                ownerEmail = ownerData[0].email;
              }
            }
          }
        } else if (doc.workerId) {
          // 인력 서류
          const workerData = await db
            .select({
              name: workers.name,
              ownerId: workers.ownerId,
            })
            .from(workers)
            .where(eq(workers.id, doc.workerId))
            .limit(1);

          if (workerData.length > 0) {
            targetName = `인력 ${workerData[0].name}`;
            
            // 소유자 이메일 조회
            if (workerData[0].ownerId) {
              const ownerData = await db
                .select({ email: users.email })
                .from(users)
                .where(eq(users.id, workerData[0].ownerId))
                .limit(1);
              
              if (ownerData.length > 0 && ownerData[0].email) {
                ownerEmail = ownerData[0].email;
              }
            }
          }
        }

        // 업로드한 사용자 이메일 조회
        let uploaderEmail = '';
        if (doc.uploadedBy) {
          const uploaderData = await db
            .select({ email: users.email })
            .from(users)
            .where(eq(users.id, doc.uploadedBy))
            .limit(1);
          
          if (uploaderData.length > 0 && uploaderData[0].email) {
            uploaderEmail = uploaderData[0].email;
          }
        }

        // 만료까지 남은 일수 계산
        const daysRemaining = Math.ceil(
          (new Date(doc.expiryDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );

        // 알림 발송 대상 결정 (30일, 7일, 당일)
        const shouldNotify = 
          daysRemaining === 30 || 
          daysRemaining === 7 || 
          daysRemaining === 0;

        if (shouldNotify && targetName) {
          const expiryDateStr = new Date(doc.expiryDate).toLocaleDateString('ko-KR');
          
          // 소유자에게 알림
          if (ownerEmail) {
            await sendDocumentExpiryNotification(
              ownerEmail,
              doc.docName,
              targetName,
              expiryDateStr,
              daysRemaining
            );
            console.log(`[Scheduler] 알림 발송: ${ownerEmail} - ${doc.docName} (${daysRemaining}일 남음)`);
          }

          // 업로더에게도 알림 (소유자와 다른 경우)
          if (uploaderEmail && uploaderEmail !== ownerEmail) {
            await sendDocumentExpiryNotification(
              uploaderEmail,
              doc.docName,
              targetName,
              expiryDateStr,
              daysRemaining
            );
            console.log(`[Scheduler] 알림 발송: ${uploaderEmail} - ${doc.docName} (${daysRemaining}일 남음)`);
          }
        }
      } catch (error) {
        console.error(`[Scheduler] 서류 ${doc.id} 알림 발송 실패:`, error);
      }
    }

    console.log('[Scheduler] 서류 만료 체크 완료');
  } catch (error) {
    console.error('[Scheduler] 서류 만료 체크 중 오류 발생:', error);
  }
}

/**
 * 스케줄러 시작
 * 매일 오전 9시에 실행
 */
export function startScheduler() {
  console.log('[Scheduler] 스케줄러 시작');

  // 즉시 한 번 실행
  checkDocumentExpiry();

  // 매일 오전 9시에 실행 (24시간 = 86400000ms)
  setInterval(() => {
    const now = new Date();
    const hours = now.getHours();
    
    // 오전 9시에만 실행
    if (hours === 9) {
      checkDocumentExpiry();
    }
  }, 60 * 60 * 1000); // 1시간마다 체크

  console.log('[Scheduler] 스케줄러 등록 완료 (매일 오전 9시 실행)');
}

/**
 * 수동으로 서류 만료 체크 실행 (테스트용)
 */
export async function manualCheckDocumentExpiry() {
  console.log('[Scheduler] 수동 서류 만료 체크 시작');
  await checkDocumentExpiry();
}

