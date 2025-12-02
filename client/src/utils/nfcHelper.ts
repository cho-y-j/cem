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
    // 네이티브 앱: @capgo/capacitor-nfc 플러그인 사용
    try {
      console.log('[NFC] Checking NFC availability in native app...');
      const nfcModule = await import('@capgo/capacitor-nfc').catch((error) => {
        console.error('[NFC] Failed to import @capgo/capacitor-nfc:', error);
        return null;
      });
      if (!nfcModule) {
        console.warn('[NFC] Native NFC plugin module is null');
        return false;
      }
      console.log('[NFC] NFC module loaded successfully:', Object.keys(nfcModule));
      const { CapacitorNfc } = nfcModule;
      if (!CapacitorNfc) {
        console.error('[NFC] CapacitorNfc class not found in module');
        return false;
      }
      console.log('[NFC] Checking NFC status...');
      const result = await CapacitorNfc.getStatus();
      console.log('[NFC] NFC status result:', result);
      // NFC_OK means NFC is available and enabled
      return result.status === 'NFC_OK';
    } catch (error: any) {
      console.error('[NFC] Native NFC check failed:', error);
      return false;
    }
  } else {
    // 웹 브라우저: Web NFC API
    const isWebNfcAvailable = typeof window !== 'undefined' && 'NDEFReader' in window;
    console.log('[NFC] Web NFC available:', isWebNfcAvailable);
    return isWebNfcAvailable;
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
    console.log('[NFC] Starting native NFC scan...');
    const nfcModule = await import('@capgo/capacitor-nfc').catch((error) => {
      console.error('[NFC] Failed to import @capgo/capacitor-nfc for scan:', error);
      return null;
    });
    if (!nfcModule) {
      const errorMsg = 'NFC 플러그인을 사용할 수 없습니다.';
      console.error('[NFC]', errorMsg);
      onError?.(errorMsg);
      return () => {};
    }
    console.log('[NFC] NFC module loaded for scan:', Object.keys(nfcModule));
    const { CapacitorNfc } = nfcModule;
    if (!CapacitorNfc) {
      const errorMsg = 'CapacitorNfc 클래스를 찾을 수 없습니다.';
      console.error('[NFC]', errorMsg);
      onError?.(errorMsg);
      return () => {};
    }

    // 리스너 등록 - @capgo/capacitor-nfc 이벤트 형식
    const listener = await CapacitorNfc.addListener('nfcEvent', (event: any) => {
      console.log('[NFC] Tag event received:', event);

      // 태그 ID 추출 - @capgo/capacitor-nfc 형식
      let tagId = '';

      // tag.id는 number[] 배열이므로 hex 문자열로 변환 (웹과 동일한 형식: 콜론 구분, 소문자)
      if (event.tag?.id && Array.isArray(event.tag.id)) {
        tagId = event.tag.id.map((b: number) => b.toString(16).padStart(2, '0')).join(':');
        console.log('[NFC] Tag ID from bytes:', tagId);
      }

      // NDEF 메시지에서 텍스트 추출 시도
      if (!tagId && event.tag?.ndefMessage?.length > 0) {
        for (const record of event.tag.ndefMessage) {
          // TNF 1 = Well-known, type T = Text
          if (record.tnf === 1 && record.type?.length > 0) {
            const typeChar = String.fromCharCode(record.type[0]);
            if (typeChar === 'T' && record.payload?.length > 0) {
              // Text record: 첫 바이트는 상태 바이트 (언어 코드 길이 포함)
              const langCodeLen = record.payload[0] & 0x3F;
              const textBytes = record.payload.slice(1 + langCodeLen);
              tagId = String.fromCharCode(...textBytes);
              console.log('[NFC] Tag ID from NDEF text:', tagId);
              if (tagId) break;
            }
          }
        }
      }

      if (tagId) {
        onTagRead(tagId);
      } else {
        console.warn('[NFC] Could not extract tag ID from event:', event);
        onError?.('태그 ID를 읽을 수 없습니다.');
      }
    });

    // 스캔 시작
    await CapacitorNfc.startScanning();
    console.log('[NFC] Native scan started');

    // 중지 함수 반환
    return async () => {
      try {
        await CapacitorNfc.stopScanning();
        await listener.remove();
        console.log('[NFC] Native scan stopped');
      } catch (error) {
        console.error('[NFC] Error stopping scan:', error);
      }
    };
  } catch (error: any) {
    console.error('[NFC] Native NFC scan error:', error);
    onError?.(error?.message || 'NFC 스캔 시작 실패');
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

      // serialNumber 사용 - 앱과 동일한 형식으로 정규화 (콜론 구분, 소문자)
      if (event.serialNumber) {
        // Web NFC serialNumber는 "04:a3:b2:c1" 또는 "04-a3-b2-c1" 형식일 수 있음
        tagId = event.serialNumber.trim().toLowerCase().replace(/-/g, ':');
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
