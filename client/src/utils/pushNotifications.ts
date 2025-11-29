import { useLocation } from 'wouter';
import { toast } from 'sonner';

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
    // 기존 리스너 제거 (중복 방지) - 주의: 다른 곳에서 등록한 리스너도 제거될 수 있음
    // 하지만 이 함수는 App.tsx에서 한 번만 호출되므로 초기화 시점에 정리하는 것이 좋음
    // useFcmToken의 registration 리스너와 충돌하지 않도록 주의 필요
    // 여기서는 removeAllListeners를 호출하지 않고, 리스너가 중복되지 않도록 useEffect에서 한 번만 호출되게 함

    // 알림 수신 리스너 (앱이 포그라운드에 있을 때)
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[FCM] Push notification received:', notification);

      // 앱이 포그라운드에 있을 때 토스트 알림 표시
      toast.message(notification.title || '알림', {
        description: notification.body,
        action: {
          label: '확인',
          onClick: () => {
            // 알림 클릭 시 처리 로직과 동일하게 이동
            if (notification.data?.notificationId) {
              setLocation('/mobile/notifications');
            } else {
              setLocation('/mobile/notifications');
            }
          },
        },
      });
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


