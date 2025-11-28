/**
 * 이미지 마스킹 유틸리티
 * 
 * 면허증 이미지에서 주민번호 뒷자리를 마스킹합니다.
 */

import { LicenseInfo } from '@/hooks/useLicenseOCR';

/**
 * 주민번호 뒷자리 마스킹 (일반 위치 기준)
 * 면허증의 일반적인 주민번호 위치를 기준으로 마스킹
 */
export async function maskResidentNumber(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    
    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        // 이미지 그리기
        ctx.drawImage(img, 0, 0);
        
        // 주민번호 뒷자리 마스킹 (면허증 중앙 부분)
        // 면허증 레이아웃: 면허번호 → 이름 → 주민번호 → 주소
        // 주민번호는 이름 바로 아래, 주소 위에 위치
        // 주민번호 형식: YYMMDD-GXXXXXXX (하이픈 뒤 7자리만 마스킹)
        
        // 면허증 실제 레이아웃 분석:
        // - 면허번호: 상단 중앙
        // - 이름: 면허번호 아래, 중앙~우측
        // - 주민번호: 이름 아래, 중앙~우측 (하이픈 뒤 7자리만 마스킹)
        // - 주소: 주민번호 아래
        
        // 주민번호 위치: 이름 아래, 중앙~우측 영역
        // 하이픈(-) 뒤 7자리만 마스킹 (하이픈은 마스킹하지 않음)
        // 실제 면허증: 주민번호는 이름 바로 아래, 주소 위에 위치
        // 주민번호 형식: 890216-1932813 (하이픈 뒤 7자리만 마스킹)
        // 주민번호 뒷자리 마스킹 (하이픈 제외, 넓은 영역으로 다양한 면허증 대응)
        // 하이픈 뒤 7자리 + 앞뒤 여유 공간 (하이픈은 마스킹하지 않음)
        // 면허증마다 레이아웃이 다를 수 있으므로 넓은 영역으로 마스킹
        const maskX = img.width * 0.50; // 왼쪽에서 50% 지점 (하이픈 뒤 시작, 여유 공간 포함)
        const maskY = img.height * 0.34; // 위에서 34% 지점 (주민번호 위치, 다양한 면허증 대응)
        const maskWidth = img.width * 0.22; // 너비의 22% (7자리 + 앞뒤 넓은 여유)
        const maskHeight = img.height * 0.07; // 높이의 7% (더 높은 영역으로 다양한 면허증 대응)
        
        // 완전히 검은색으로 마스킹 (사각형으로 완전히 안보이게)
        ctx.fillStyle = '#000000'; // 완전 불투명 검은색
        ctx.fillRect(maskX, maskY, maskWidth, maskHeight);
        
        // 추가로 한 번 더 덧칠하여 완전히 가리기
        ctx.fillStyle = '#000000';
        ctx.fillRect(maskX, maskY, maskWidth, maskHeight);
        
        // base64로 변환
        const maskedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve(maskedDataUrl);
      };
      
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * OCR 결과 기반 정확한 주민번호 마스킹
 * Vision API의 boundingPoly 좌표를 사용하여 정확히 마스킹
 *
 * 좌표 처리:
 * - x >= 0: Vision API가 찾은 정확한 픽셀 좌표 사용
 * - x === -1: 폴백 - 고정 비율로 마스킹
 */
export async function maskResidentNumberPrecise(
  file: File,
  ocrInfo: LicenseInfo
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;

        // 이미지 그리기
        ctx.drawImage(img, 0, 0);

        let maskX: number;
        let maskY: number;
        let maskWidth: number;
        let maskHeight: number;

        // OCR 결과에서 주민번호 위치 정보 확인
        const bounds = ocrInfo.residentNumberBounds;

        if (bounds && bounds.x >= 0) {
          // Vision API가 찾은 정확한 픽셀 좌표 사용
          // 서버에서 반환된 좌표는 원본 이미지 기준 픽셀 좌표
          // 현재 이미지 크기에 맞게 스케일 조정 필요

          // 서버에서 OCR 처리한 이미지와 현재 표시용 이미지의 크기가 다를 수 있음
          // 서버는 원본 이미지 기준으로 좌표를 반환하므로
          // 현재 이미지와 원본의 비율을 고려해야 함
          // 하지만 같은 파일을 사용하므로 비율은 동일함

          maskX = bounds.x;
          maskY = bounds.y;
          maskWidth = bounds.width;
          maskHeight = bounds.height;

          console.log('[Masking] Vision API 정확한 좌표 사용:', {
            maskX: maskX.toFixed(0),
            maskY: maskY.toFixed(0),
            maskWidth: maskWidth.toFixed(0),
            maskHeight: maskHeight.toFixed(0),
            imageSize: `${img.width}x${img.height}`,
            method: 'boundingPoly'
          });
        } else {
          // 폴백: 고정 비율로 마스킹
          // 면허증 레이아웃 기준으로 추정 위치 사용
          maskX = img.width * 0.50; // 왼쪽에서 50% 지점
          maskY = img.height * 0.34; // 위에서 34% 지점
          maskWidth = img.width * 0.22; // 너비의 22%
          maskHeight = img.height * 0.07; // 높이의 7%

          console.log('[Masking] 폴백: 고정 비율 좌표 사용:', {
            maskX: maskX.toFixed(0),
            maskY: maskY.toFixed(0),
            maskWidth: maskWidth.toFixed(0),
            maskHeight: maskHeight.toFixed(0),
            imageSize: `${img.width}x${img.height}`,
            method: 'fallback-ratio'
          });
        }

        // 완전히 검은색으로 마스킹 (사각형으로 완전히 안보이게)
        ctx.fillStyle = '#000000';
        ctx.fillRect(maskX, maskY, maskWidth, maskHeight);

        console.log('[Masking] 주민번호 뒷자리 마스킹 완료');

        // base64로 변환
        const maskedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve(maskedDataUrl);
      };

      img.onerror = reject;
      img.src = e.target?.result as string;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Base64 이미지를 File 객체로 변환
 */
export async function base64ToFile(base64: string, fileName: string): Promise<File> {
  // base64에서 데이터 부분만 추출
  const base64Data = base64.split(',')[1] || base64;
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'image/jpeg' });
  
  return new File([blob], fileName, { type: 'image/jpeg' });
}

