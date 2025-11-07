/**
 * 운전면허증 OCR Hook
 * 
 * 이미지에서 면허 정보를 자동으로 추출합니다.
 * Admin/Owner 및 Worker 모두 사용 가능
 */

import { useState } from 'react';
import Tesseract from 'tesseract.js';

export interface LicenseInfo {
  licenseNum: string;        // 면허번호 (12자리)
  name: string;              // 이름
  birthDate: string;         // 생년월일 (YYYY-MM-DD)
  licenseType: string;       // 면허종별 코드 (예: '12')
  licenseTypeName: string;   // 면허종별 이름 (예: '1종 보통')
  address?: string;          // 주소 (선택)
  residentNumber?: string;   // 주민등록번호 (선택, 뒷자리 마스킹)
  confidence: number;        // 신뢰도 (0-100)
  rawText: string;           // 원본 OCR 텍스트 (디버깅용)
}

export interface UseLicenseOCRResult {
  isProcessing: boolean;
  extractedInfo: LicenseInfo | null;
  error: string | null;
  processImage: (file: File) => Promise<LicenseInfo | null>;
  reset: () => void;
}

/**
 * 운전면허증 정보 추출 Hook
 */
export function useLicenseOCR(): UseLicenseOCRResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedInfo, setExtractedInfo] = useState<LicenseInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processImage = async (file: File): Promise<LicenseInfo | null> => {
    setIsProcessing(true);
    setError(null);
    setExtractedInfo(null);

    try {
      // Tesseract.js Worker 생성
      const worker = await Tesseract.createWorker('kor', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`[OCR] Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      // OCR 실행
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      // 디버깅: 원본 텍스트 출력
      console.log('========================================');
      console.log('[OCR] Raw text (원본):', text);
      console.log('========================================');

      // 면허 정보 추출
      const info = extractLicenseInfo(text);
      
      // 디버깅: 추출된 정보 출력
      console.log('[OCR] 추출된 정보:');
      console.log('  - 이름:', info.name || '(추출 실패)');
      console.log('  - 면허번호:', info.licenseNum || '(추출 실패)');
      console.log('  - 생년월일:', info.birthDate || '(추출 실패)');
      console.log('  - 면허종별:', info.licenseTypeName || '(추출 실패)');
      console.log('  - 신뢰도:', info.confidence + '%');
      console.log('========================================');
      
      setExtractedInfo(info);

      return info;
    } catch (err: any) {
      console.error('[OCR] Error:', err);
      setError(err.message || 'OCR 처리 중 오류가 발생했습니다');
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setIsProcessing(false);
    setExtractedInfo(null);
    setError(null);
  };

  return {
    isProcessing,
    extractedInfo,
    error,
    processImage,
    reset,
  };
}

/**
 * OCR 텍스트에서 면허 정보 추출
 */
function extractLicenseInfo(ocrText: string): LicenseInfo {
  // 공백 및 줄바꿈 정규화
  const normalizedText = ocrText.replace(/\s+/g, ' ').trim();
  
  console.log('[OCR Parser] 정규화된 텍스트:', normalizedText);

  // 1. 면허번호 추출 (12자리 숫자)
  // 지역명 → 숫자 코드 변환 (RIMS API 문서 5.5)
  const regionCodeMap: Record<string, string> = {
    '서울': '11', '부산': '12', '경기': '13', '강원': '14',
    '충북': '15', '충남': '16', '전북': '17', '전남': '18',
    '경북': '19', '경남': '20', '제주': '21', '대구': '22',
    '인천': '23', '광주': '24', '대전': '25', '울산': '26',
  };

  let licenseNum = '';
  
  // 패턴 1: 지역명 포함 (충남 99-619984-50)
  const pattern1 = /(서울|부산|대구|인천|광주|대전|울산|경기|강원|충북|충남|전북|전남|경북|경남|제주)[\s-]*(\d{2})[\s-]*(\d{6})[\s-]*(\d{2})/;
  let match = normalizedText.match(pattern1);
  if (match) {
    const regionCode = regionCodeMap[match[1]] || '13'; // 기본값: 경기
    licenseNum = `${regionCode}${match[2]}${match[3]}${match[4]}`;
    console.log('[OCR Parser] 패턴1 매치 (지역명 포함):', licenseNum, `(${match[1]} → ${regionCode})`, 'from', match[0]);
  }
  
  // 패턴 2: 숫자만 (11-12-345678-90)
  if (!licenseNum) {
    const pattern2 = /(\d{2})[\s-]?(\d{2})[\s-]?(\d{6})[\s-]?(\d{2})/;
    match = normalizedText.match(pattern2);
    if (match) {
      licenseNum = `${match[1]}${match[2]}${match[3]}${match[4]}`;
      console.log('[OCR Parser] 패턴2 매치 (숫자만):', licenseNum);
    }
  }
  
  // 패턴 3: 연속된 12자리 숫자
  if (!licenseNum) {
    const pattern3 = /(\d{12})/;
    match = normalizedText.match(pattern3);
    if (match) {
      licenseNum = match[1];
      console.log('[OCR Parser] 패턴3 매치 (연속 12자리):', licenseNum);
    }
  }

  // 2. 이름 추출 (한글 2~4자)
  const nameRegex = /([가-힣]{2,4})/g;
  const nameMatches = normalizedText.match(nameRegex) || [];
  
  // 제외할 단어 (면허증에 자주 나오는 단어)
  const excludedWords = [
    '운전면허증', '도로교통공단', '자동차운전면허증', '대한민국',
    '운전면허', '교통공단', '발급일자', '적성검사', '갱신일자',
    '면허번호', '주민등록', '생년월일', '면허종별'
  ];
  
  console.log('[OCR Parser] 이름 후보:', nameMatches);
  
  const name = nameMatches.find(n => {
    // 제외 단어에 포함되지 않고
    // 2~4자이며
    // 숫자가 포함되지 않은 경우
    return !excludedWords.some(word => word.includes(n) || n.includes('번호') || n.includes('일자'));
  }) || '';
  
  console.log('[OCR Parser] 최종 선택된 이름:', name);

  // 3. 생년월일 추출
  // 여러 패턴 시도
  let birthDate = '';
  
  // 패턴 1: 1990.01.01 또는 1990-01-01
  const birthPattern1 = /(\d{4})[-.\s/년](\d{1,2})[-.\s/월](\d{1,2})/;
  let birthMatch = normalizedText.match(birthPattern1);
  if (birthMatch) {
    birthDate = `${birthMatch[1]}-${birthMatch[2].padStart(2, '0')}-${birthMatch[3].padStart(2, '0')}`;
    console.log('[OCR Parser] 생년월일 패턴1 매치:', birthDate);
  }
  
  // 패턴 2: 19900101 (연속 8자리)
  if (!birthDate) {
    const birthPattern2 = /(19|20)(\d{6})/;
    birthMatch = normalizedText.match(birthPattern2);
    if (birthMatch) {
      const fullDate = birthMatch[0];
      birthDate = `${fullDate.slice(0, 4)}-${fullDate.slice(4, 6)}-${fullDate.slice(6, 8)}`;
      console.log('[OCR Parser] 생년월일 패턴2 매치:', birthDate);
    }
  }

  // 4. 주소 추출
  let address = '';
  // 주소 패턴: "서울특별시", "경기도", "충청남도" 등으로 시작
  const addressPattern = /(서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원도|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도|제주특별자치도)[^\d가-힣]*([가-힣\s\d-]+)/;
  const addressMatch = normalizedText.match(addressPattern);
  if (addressMatch) {
    address = `${addressMatch[1]} ${addressMatch[2]}`.trim();
    console.log('[OCR Parser] 주소 매치:', address);
  }

  // 5. 주민등록번호 추출 (앞 6자리-뒤 7자리)
  let residentNumber = '';
  const residentPattern = /(\d{6})[\s-]*(\d{7})/;
  const residentMatch = normalizedText.match(residentPattern);
  if (residentMatch) {
    // 뒷자리는 마스킹 처리
    residentNumber = `${residentMatch[1]}-*******`;
    console.log('[OCR Parser] 주민등록번호 매치:', residentNumber);
  }

  // 6. 면허종별 추출
  const licenseTypeMap: Record<string, { code: string; name: string }> = {
    '1종대형': { code: '11', name: '1종 대형' },
    '대형': { code: '11', name: '1종 대형' },
    '1종보통': { code: '12', name: '1종 보통' },
    '1종 보통': { code: '12', name: '1종 보통' },
    '보통': { code: '12', name: '1종 보통' },
    '1종소형': { code: '13', name: '1종 소형' },
    '2종보통': { code: '21', name: '2종 보통' },
    '2종 보통': { code: '21', name: '2종 보통' },
    '2종소형': { code: '22', name: '2종 소형' },
    '소형': { code: '22', name: '2종 소형' },
    '원동기': { code: '23', name: '2종 원동기' },
  };

  let licenseType = '12'; // 기본값: 1종 보통
  let licenseTypeName = '1종 보통';

  for (const [keyword, { code, name }] of Object.entries(licenseTypeMap)) {
    if (normalizedText.includes(keyword)) {
      licenseType = code;
      licenseTypeName = name;
      console.log('[OCR Parser] 면허종별 매치:', licenseTypeName);
      break;
    }
  }

  // 5. 신뢰도 계산
  let confidence = 0;
  if (licenseNum.length === 12) confidence += 40;
  if (name.length >= 2 && name.length <= 4) confidence += 30;
  if (birthDate.length === 10) confidence += 20;
  if (licenseType) confidence += 10;

  console.log('[OCR Parser] 최종 신뢰도:', confidence + '%');

  return {
    licenseNum,
    name,
    birthDate,
    licenseType,
    licenseTypeName,
    address,
    residentNumber,
    confidence,
    rawText: normalizedText,
  };
}

/**
 * 지역 코드 매핑 (참고용)
 */
export const REGION_CODES: Record<string, string> = {
  서울: '11',
  부산: '12',
  경기: '13',
  강원: '14',
  충북: '15',
  충남: '16',
  전북: '17',
  전남: '18',
  경북: '19',
  경남: '20',
  제주: '21',
  대구: '22',
  인천: '23',
  광주: '24',
  대전: '25',
  울산: '26',
};

/**
 * 면허 종별 코드표
 */
export const LICENSE_TYPES = [
  { code: '11', name: '1종 대형', description: '대형차, 특수차 등' },
  { code: '12', name: '1종 보통', description: '승용차, 승합차, 화물차 등' },
  { code: '13', name: '1종 소형', description: '소형 승합차 등' },
  { code: '21', name: '2종 보통', description: '승용차, 소형 승합차 등' },
  { code: '22', name: '2종 소형', description: '오토바이 등' },
  { code: '23', name: '2종 원동기', description: '원동기 장치 자전거' },
];

