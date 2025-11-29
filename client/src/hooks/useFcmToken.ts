import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

/**
 * FCM 토큰 관리 훅
 * Capacitor 환경에서만 작동 (웹 환경에서는 아무것도 하지 않음)
 */
export function useFcmToken() {
  const [isCapacitor, setIsCapacitor] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  const registerTokenMutation = trpc.notifications.registerFcmToken.useMutation({
    onSuccess: () => {
      console.log('[FCM] Token registered with server successfully');
      setIsRegistered(true);
    },
    onError: (error) => {
      console.error('[FCM] Token registration failed:', error);
    },
  });

  useEffect(() => {
    // Capacitor 환경 확인
    const checkCapacitor = async () => {
      if (typeof window === 'undefined') return;

      try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
          setIsCapacitor(true);

          // 로그인 상태 확인 (토큰이 있을 때만 FCM 등록 시도)
          const authToken = localStorage.getItem('authToken');
          if (authToken) {
            registerFcmToken();
          } else {
            console.log('[FCM] No auth token found, skipping registration');
          }
        }
      } catch (error) {
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

      // 리스너 제거 (중복 등록 방지)
      await PushNotifications.removeAllListeners();

      // 토큰 수신 리스너
      PushNotifications.addListener('registration', async (token) => {
        console.log('[FCM] Token received:', token.value);
        // 서버에 토큰 등록 요청
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
    isRegistered,
    registerFcmToken, // 수동으로 호출할 수 있도록 노출 (로그인 직후 등)
  };
}

