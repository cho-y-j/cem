import { useLocation } from 'wouter';

/**
 * 푸시 알림 이벤트 리스너 설정
 * Capacitor 환경에서만 작동 (웹 환경에서는 아무것도 하지 않음)
 */
export function setupPushNotificationListeners(setLocation: (path: string) => void) {
  if (typeof window === 'undefined') return;

  const capacitor = (window as any).Capacitor;
  if (!capacitor || !capacitor.isNativePlatform()) {
    return;
  }

  import('@capacitor/push-notifications').then(({ PushNotifications }) => {
    // 알림 수신 리스너 (앱이 포그라운드에 있을 때)
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[FCM] Push notification received:', notification);
      // 포그라운드에서는 알림만 표시 (자동으로 표시됨)
    });

    // 알림 클릭 리스너 (앱이 백그라운드에 있을 때)
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[FCM] Push notification action performed:', action);
      
      const data = action.notification.data;
      
      // 알림 목록 페이지로 이동
      if (data?.notificationId) {
        setLocation('/mobile/notifications');
      }
      
      // 링크가 있으면 해당 페이지로 이동
      if (data?.linkType && data?.linkId) {
        const linkMap: Record<string, string> = {
          document: `/documents?id=${data.linkId}`,
          deployment: `/deployments?id=${data.linkId}`,
          entry_request: `/entry-requests?id=${data.linkId}`,
        };
        const link = linkMap[data.linkType];
        if (link) {
          setLocation(link);
        } else {
          setLocation('/mobile/notifications');
        }
      } else {
        setLocation('/mobile/notifications');
      }
    });
  }).catch((error) => {
    console.error('[FCM] Failed to setup push notification listeners:', error);
  });
}


