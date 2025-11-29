import * as admin from 'firebase-admin';
import { ENV } from './env';

/**
 * Firebase Admin SDK 초기화
 * 기존 웹 알림 기능에 영향 없이 지연 로딩으로 처리
 */
let app: admin.app.App | null = null;

function initializeFirebaseAdmin() {
  if (app) {
    return app;
  }

  if (!ENV.firebaseProjectId || !ENV.firebaseClientEmail || !ENV.firebasePrivateKey) {
    // 환경 변수가 없으면 조용히 실패 (기존 웹 알림은 정상 작동)
    return null;
  }

  try {
    // 환경 변수 값에서 앞뒤 따옴표 제거 및 줄바꿈 처리
    const cleanValue = (val: string) => val ? val.replace(/^["']|["']$/g, '') : '';

    const projectId = cleanValue(ENV.firebaseProjectId);
    const clientEmail = cleanValue(ENV.firebaseClientEmail);
    // Private Key는 \n을 실제 줄바꿈으로 변환
    const privateKey = cleanValue(ENV.firebasePrivateKey).replace(/\\n/g, '\n');

    // 이미 초기화된 앱이 있는지 확인
    if (admin.apps.length === 0) {
      app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('[FCM] Firebase Admin SDK 초기화 완료');
    } else {
      app = admin.app();
      console.log('[FCM] Firebase Admin SDK 이미 초기화됨');
    }

    return app;
  } catch (error) {
    console.error('[FCM] Firebase Admin SDK 초기화 실패:', error);
    // 초기화 실패해도 기존 웹 알림은 정상 작동
    return null;
  }
}

// FCM 초기화는 지연 로딩으로 처리 (필요할 때만 초기화)
// 서버 시작 시점에는 초기화하지 않음 (기존 웹 기능에 영향 없음)

/**
 * 단일 사용자에게 푸시 알림 전송
 */
export async function sendFcmNotification(
  fcmToken: string,
  notification: {
    title: string;
    body: string;
    data?: Record<string, string>;
  }
): Promise<boolean> {
  const firebaseApp = initializeFirebaseAdmin();
  if (!firebaseApp) {
    return false;
  }

  try {
    const message: admin.messaging.Message = {
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data || {},
      android: {
        priority: 'high' as const,
        notification: {
          channelId: 'cem_notifications',
          sound: 'default',
          priority: 'high' as const,
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log('[FCM] 푸시 알림 전송 성공:', response);
    return true;
  } catch (error: any) {
    console.error('[FCM] 푸시 알림 전송 실패:', error);

    // 토큰이 유효하지 않은 경우 (앱 삭제 등)
    if (error.code === 'messaging/invalid-registration-token' ||
      error.code === 'messaging/registration-token-not-registered') {
      console.warn('[FCM] 유효하지 않은 토큰:', fcmToken);
      // TODO: DB에서 토큰 삭제 처리
    }

    return false;
  }
}

/**
 * 여러 사용자에게 일괄 푸시 알림 전송
 */
export async function sendFcmNotifications(
  recipients: Array<{ userId: string; fcmToken: string }>,
  notification: {
    title: string;
    body: string;
    data?: Record<string, string>;
  }
): Promise<{ success: number; failed: number }> {
  // FCM 초기화 (지연 로딩)
  const firebaseApp = initializeFirebaseAdmin();
  if (!firebaseApp || recipients.length === 0) {
    // FCM이 초기화되지 않았어도 조용히 실패 (기존 웹 알림은 정상 작동)
    return { success: 0, failed: recipients.length };
  }

  let success = 0;
  let failed = 0;

  // 배치로 전송 (최대 500개씩)
  const batchSize = 500;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);

    try {
      const messages: admin.messaging.Message[] = batch.map((recipient) => ({
        token: recipient.fcmToken,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: {
          ...notification.data,
          userId: recipient.userId,
        },
        android: {
          priority: 'high' as const,
          notification: {
            channelId: 'cem_notifications',
            sound: 'default',
            priority: 'high' as const,
          },
        },
      }));

      const response = await admin.messaging().sendEach(messages);

      response.responses.forEach((result, index) => {
        if (result.success) {
          success++;
        } else {
          failed++;
          console.error(`[FCM] 푸시 알림 전송 실패 (${batch[index].userId}):`, result.error);

          // 유효하지 않은 토큰인 경우
          if (result.error?.code === 'messaging/invalid-registration-token' ||
            result.error?.code === 'messaging/registration-token-not-registered') {
            console.warn(`[FCM] 유효하지 않은 토큰 삭제 필요: ${batch[index].userId}`);
            // TODO: DB에서 토큰 삭제 처리
          }
        }
      });
    } catch (error) {
      console.error('[FCM] 배치 푸시 알림 전송 실패:', error);
      failed += batch.length;
    }
  }

  console.log(`[FCM] 푸시 알림 전송 완료: 성공 ${success}건, 실패 ${failed}건`);
  return { success, failed };
}

