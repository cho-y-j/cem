import { Capacitor } from '@capacitor/core';

/**
 * 현재 환경이 네이티브 앱인지 확인
 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * NFC 사용 가능 여부 확인
 */
export async function isNfcAvailable(): Promise<boolean> {
  if (isNativeApp()) {
    // 네이티브 앱: Capacitor NFC 플러그인 사용
    try {
      // 동적 import를 사용하되, 웹 빌드에서는 패키지가 없을 수 있으므로 안전하게 처리
      const nfcModule = await import('@exxili/capacitor-nfc').catch(() => null);
      if (!nfcModule) {
        console.warn('[NFC] Native NFC plugin not available');
        return false;
      }
      const { Nfc } = nfcModule;
      const result = await Nfc.isEnabled();
      return result.isEnabled;
    } catch (error) {
      console.error('[NFC] Native NFC check failed:', error);
      return false;
    }
  } else {
    // 웹 브라우저: Web NFC API
    return typeof window !== 'undefined' && 'NDEFReader' in window;
  }
}

/**
 * 네이티브 NFC 스캔 시작
 * @param onTagRead 태그 읽기 콜백
 * @param onError 에러 콜백
 * @returns 스캔 중지 함수
 */
export async function startNativeNfcScan(
  onTagRead: (tagId: string) => void,
  onError?: (error: string) => void
): Promise<() => void> {
  if (!isNativeApp()) {
    onError?.('네이티브 앱에서만 사용 가능합니다.');
    return () => {};
  }

  try {
    // 동적 import를 사용하되, 웹 빌드에서는 패키지가 없을 수 있으므로 안전하게 처리
    const nfcModule = await import('@exxili/capacitor-nfc').catch(() => null);
    if (!nfcModule) {
      onError?.('NFC 플러그인을 사용할 수 없습니다.');
      return () => {};
    }
    const { Nfc } = nfcModule;

    // 리스너 등록
    const listener = await Nfc.addListener('nfcTag', (event: any) => {
      console.log('[NFC] Tag read:', event);

      // 태그 ID 추출
      let tagId = '';

      // ID 형식에 따라 처리
      if (event.id) {
        tagId = event.id;
      } else if (event.tag?.id) {
        tagId = event.tag.id;
      } else if (event.serialNumber) {
        tagId = event.serialNumber;
      }

      // NDEF 메시지에서 텍스트 추출 시도
      if (!tagId && event.messages?.length > 0) {
        for (const message of event.messages) {
          for (const record of message.records || []) {
            if (record.type === 'text' || record.type === 'T') {
              tagId = record.payload || record.text || '';
              if (tagId) break;
            }
          }
          if (tagId) break;
        }
      }

      if (tagId) {
        onTagRead(tagId);
      } else {
        onError?.('태그 ID를 읽을 수 없습니다.');
      }
    });

    // 스캔 시작
    await Nfc.startScanSession();
    console.log('[NFC] Native scan started');

    // 중지 함수 반환
    return async () => {
      try {
        await Nfc.stopScanSession();
        await listener.remove();
        console.log('[NFC] Native scan stopped');
      } catch (error) {
        console.error('[NFC] Error stopping scan:', error);
      }
    };
  } catch (error: any) {
    console.error('[NFC] Native NFC scan error:', error);
    onError?.(error.message || 'NFC 스캔 시작 실패');
    return () => {};
  }
}

/**
 * 웹 NFC 스캔 시작 (Web NFC API)
 * @param onTagRead 태그 읽기 콜백
 * @param onError 에러 콜백
 */
export async function startWebNfcScan(
  onTagRead: (tagId: string) => void,
  onError?: (error: string) => void
): Promise<void> {
  if (!('NDEFReader' in window)) {
    onError?.('이 브라우저는 NFC를 지원하지 않습니다.');
    return;
  }

  try {
    const NDEFReader = (window as any).NDEFReader;
    const reader = new NDEFReader();

    reader.addEventListener('reading', (event: any) => {
      let tagId = '';

      // serialNumber 사용
      if (event.serialNumber) {
        tagId = event.serialNumber.trim();
      }

      // NDEF 메시지에서 텍스트 추출
      if (!tagId && event.message?.records?.length) {
        for (const record of event.message.records) {
          if (record.recordType === 'text' || record.recordType === 'url') {
            const decoder = new TextDecoder(record.encoding || 'utf-8');
            const decoded = decoder.decode(record.data);
            if (decoded?.trim()) {
              tagId = decoded.trim();
              break;
            }
          }
        }
      }

      if (tagId) {
        onTagRead(tagId);
      }
    });

    reader.addEventListener('error', (event: any) => {
      console.error('[NFC] Web NFC error:', event);
      onError?.(event.message || 'NFC 읽기 오류');
    });

    await reader.scan();
    console.log('[NFC] Web NFC scan started');
  } catch (error: any) {
    console.error('[NFC] Web NFC error:', error);
    onError?.(error.message || 'NFC 스캔 시작 실패');
  }
}
