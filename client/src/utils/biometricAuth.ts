import { Capacitor } from '@capacitor/core';
import { NativeBiometric, BiometryType } from 'capacitor-native-biometric';

/**
 * 현재 환경이 네이티브 앱인지 확인
 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * 생체인식 사용 가능 여부 확인
 */
export async function isBiometricAvailable(): Promise<{
  available: boolean;
  biometryType: 'fingerprint' | 'face' | 'iris' | 'none';
  errorMessage?: string;
}> {
  // 네이티브 앱인 경우
  if (isNativeApp()) {
    try {
      const result = await NativeBiometric.isAvailable();
      let biometryType: 'fingerprint' | 'face' | 'iris' | 'none' = 'none';

      if (result.biometryType === BiometryType.FINGERPRINT) {
        biometryType = 'fingerprint';
      } else if (result.biometryType === BiometryType.FACE_AUTHENTICATION) {
        biometryType = 'face';
      } else if (result.biometryType === BiometryType.IRIS_AUTHENTICATION) {
        biometryType = 'iris';
      }

      return {
        available: result.isAvailable,
        biometryType,
      };
    } catch (error: any) {
      return {
        available: false,
        biometryType: 'none',
        errorMessage: error.message,
      };
    }
  }

  // 웹 브라우저인 경우 (WebAuthn)
  if (window.PublicKeyCredential) {
    try {
      const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return {
        available,
        biometryType: available ? 'fingerprint' : 'none', // 웹에서는 정확한 타입 알 수 없음
      };
    } catch {
      return {
        available: false,
        biometryType: 'none',
      };
    }
  }

  return {
    available: false,
    biometryType: 'none',
    errorMessage: '이 기기는 생체인식을 지원하지 않습니다.',
  };
}

/**
 * 네이티브 생체인식 인증 실행
 * 앱에서만 사용 (웹에서는 WebAuthn 사용)
 */
export async function performNativeBiometricAuth(options?: {
  reason?: string;
  title?: string;
  subtitle?: string;
  description?: string;
}): Promise<{
  success: boolean;
  errorMessage?: string;
}> {
  if (!isNativeApp()) {
    return {
      success: false,
      errorMessage: '네이티브 앱에서만 사용 가능합니다.',
    };
  }

  try {
    await NativeBiometric.verifyIdentity({
      reason: options?.reason || '출근 확인을 위해 생체인식이 필요합니다.',
      title: options?.title || '생체인식 인증',
      subtitle: options?.subtitle || '',
      description: options?.description || '지문 또는 얼굴을 인식해주세요.',
      useFallback: true, // PIN/패턴 대체 허용
      maxAttempts: 3,
    });

    return { success: true };
  } catch (error: any) {
    console.error('[BiometricAuth] Native auth error:', error);

    let errorMessage = '생체인식 인증에 실패했습니다.';

    if (error.message?.includes('cancel')) {
      errorMessage = '생체인식이 취소되었습니다.';
    } else if (error.message?.includes('lockout')) {
      errorMessage = '생체인식이 잠겼습니다. 잠시 후 다시 시도해주세요.';
    } else if (error.message?.includes('not available')) {
      errorMessage = '생체인식을 사용할 수 없습니다.';
    }

    return {
      success: false,
      errorMessage,
    };
  }
}

/**
 * 서버에 저장된 자격증명 저장 (앱용)
 * 로그인 성공 후 호출하여 자동 로그인에 사용
 */
export async function saveCredentials(
  server: string,
  username: string,
  password: string
): Promise<boolean> {
  if (!isNativeApp()) {
    return false;
  }

  try {
    await NativeBiometric.setCredentials({
      server,
      username,
      password,
    });
    return true;
  } catch (error) {
    console.error('[BiometricAuth] Failed to save credentials:', error);
    return false;
  }
}

/**
 * 저장된 자격증명 가져오기 (앱용)
 * 생체인식 인증 후 자동 로그인에 사용
 */
export async function getCredentials(server: string): Promise<{
  username: string;
  password: string;
} | null> {
  if (!isNativeApp()) {
    return null;
  }

  try {
    const credentials = await NativeBiometric.getCredentials({ server });
    return {
      username: credentials.username,
      password: credentials.password,
    };
  } catch (error) {
    console.error('[BiometricAuth] Failed to get credentials:', error);
    return null;
  }
}

/**
 * 저장된 자격증명 삭제 (앱용)
 */
export async function deleteCredentials(server: string): Promise<boolean> {
  if (!isNativeApp()) {
    return false;
  }

  try {
    await NativeBiometric.deleteCredentials({ server });
    return true;
  } catch (error) {
    console.error('[BiometricAuth] Failed to delete credentials:', error);
    return false;
  }
}
