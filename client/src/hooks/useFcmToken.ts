import { useEffect, useState, useRef, useCallback } from 'react';
import { trpc } from '@/lib/trpc';

/**
 * FCM 토큰 관리 훅
 * Capacitor 환경에서만 작동 (웹 환경에서는 아무것도 하지 않음)
 */
export function useFcmToken() {
  const [isCapacitor, setIsCapacitor] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const isInitialized = useRef(false);
  const listenersAdded = useRef(false);

  const registerTokenMutation = trpc.notifications.registerFcmToken.useMutation({
    onSuccess: () => {
      console.log('[FCM] Token registered with server successfully');
      setIsRegistered(true);
    },
    onError: (error) => {
      console.error('[FCM] Token registration failed:', error);
    },
  });

  const registerFcmToken = useCallback(async () => {
    if (listenersAdded.current) {
      console.log('[FCM] Listeners already added, skipping');
      return;
    }

    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');

      // 권한 요청
      let permStatus = await PushNotifications.checkPermissions();
      console.log('[FCM] Current permission status:', permStatus.receive);

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
        console.log('[FCM] Permission after request:', permStatus.receive);
      }

      if (permStatus.receive !== 'granted') {
        console.warn('[FCM] Push notification permission denied');
        return;
      }

      // 이벤트 리스너 등록 (한 번만)
      if (!listenersAdded.current) {
        listenersAdded.current = true;

        // 토큰 수신 리스너
        await PushNotifications.addListener('registration', (token) => {
          console.log('[FCM] Token received:', token.value.substring(0, 20) + '...');
          // 서버에 토큰 등록 요청
          registerTokenMutation.mutate({ token: token.value });
        });

        // 토큰 에러 리스너
        await PushNotifications.addListener('registrationError', (error) => {
          console.error('[FCM] Registration error:', error);
        });

        // 푸시 알림 수신 리스너 (앱이 포그라운드일 때)
        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('[FCM] Push received in foreground:', notification.title);
        });

        // 푸시 알림 클릭 리스너
        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('[FCM] Push notification clicked:', action.notification.title);
        });

        console.log('[FCM] All listeners registered');
      }

      // FCM 토큰 등록 요청
      await PushNotifications.register();
      console.log('[FCM] Registration requested');

    } catch (error) {
      console.error('[FCM] Failed to initialize push notifications:', error);
    }
  }, [registerTokenMutation]);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    // Capacitor 환경 확인
    const checkCapacitor = async () => {
      if (typeof window === 'undefined') return;

      try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
          console.log('[FCM] Native platform detected');
          setIsCapacitor(true);

          // 로그인 상태 확인 (토큰이 있을 때만 FCM 등록 시도)
          const authToken = localStorage.getItem('authToken');
          if (authToken) {
            console.log('[FCM] Auth token found, registering FCM...');
            registerFcmToken();
          } else {
            console.log('[FCM] No auth token found, skipping registration');
          }
        } else {
          console.log('[FCM] Web environment detected');
        }
      } catch (error) {
        console.log('[FCM] Web environment detected, FCM token registration skipped');
      }
    };

    checkCapacitor();
  }, [registerFcmToken]);

  return {
    isCapacitor,
    isRegistered,
    registerFcmToken, // 수동으로 호출할 수 있도록 노출 (로그인 직후 등)
  };
}
