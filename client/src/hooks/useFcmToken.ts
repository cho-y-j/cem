import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

/**
 * FCM 토큰 관리 훅
 * Capacitor 환경에서만 작동 (웹 환경에서는 아무것도 하지 않음)
 */
export function useFcmToken() {
  const [isCapacitor, setIsCapacitor] = useState(false);
  const registerTokenMutation = trpc.notifications.registerFcmToken.useMutation({
    onError: (error) => {
      console.error('[FCM] Token registration failed:', error);
      // 토큰 등록 실패는 조용히 처리 (앱 기능에 영향 없음)
    },
  });

  useEffect(() => {
    // Capacitor 환경 확인
    const checkCapacitor = async () => {
      if (typeof window === 'undefined') return;
      
      try {
        // @capacitor/core를 동적으로 import
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
          setIsCapacitor(true);
          registerFcmToken();
        }
      } catch (error) {
        // Capacitor가 없으면 웹 환경 (정상)
        console.log('[FCM] Web environment detected, FCM token registration skipped');
      }
    };
    
    checkCapacitor();
  }, []);

  const registerFcmToken = async () => {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      
      // 권한 요청
      let permStatus = await PushNotifications.checkPermissions();
      
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }
      
      if (permStatus.receive !== 'granted') {
        console.warn('[FCM] Push notification permission denied');
        return;
      }

      // FCM 토큰 등록
      await PushNotifications.register();

      // 토큰 수신 리스너
      PushNotifications.addListener('registration', async (token) => {
        console.log('[FCM] Token received:', token.value);
        registerTokenMutation.mutate({ token: token.value });
      });

      // 토큰 에러 리스너
      PushNotifications.addListener('registrationError', (error) => {
        console.error('[FCM] Registration error:', error);
      });

      // 토큰 갱신 리스너
      PushNotifications.addListener('pushNotificationReceived', async (notification) => {
        console.log('[FCM] Push notification received:', notification);
      });

    } catch (error) {
      console.error('[FCM] Failed to initialize push notifications:', error);
    }
  };

  return {
    isCapacitor,
    isRegistered: registerTokenMutation.isSuccess,
  };
}

