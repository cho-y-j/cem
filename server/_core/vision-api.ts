/**
 * Google Cloud Vision API 클라이언트
 * 
 * 운전면허증 이미지에서 텍스트를 추출합니다.
 * Tesseract.js 대신 Google Vision API를 사용하여 높은 정확도 제공
 * 
 * REST API를 직접 호출하여 API 키만으로 사용 가능
 */

const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

/**
 * 이미지에서 텍스트 추출 (OCR)
 * @param imageBuffer 이미지 버퍼 (base64 디코딩된 버퍼)
 * @returns 추출된 텍스트
 */
export async function extractTextFromImage(imageBuffer: Buffer): Promise<string> {
  try {
    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_CLOUD_VISION_API_KEY is not configured');
    }

    // 이미지를 base64로 인코딩
    const base64Image = imageBuffer.toString('base64');

    // Vision API REST 호출
    const response = await fetch(`${VISION_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: base64Image,
            },
            features: [
              {
                type: 'TEXT_DETECTION',
                maxResults: 1,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vision API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    // 응답 확인
    if (result.responses && result.responses[0]) {
      const annotations = result.responses[0].textAnnotations;
      if (annotations && annotations.length > 0) {
        // 첫 번째 annotation이 전체 텍스트 (가장 신뢰도 높음)
        const fullText = annotations[0].description || '';
        
        // 위치 정보도 함께 저장 (마스킹에 사용)
        const boundingPoly = annotations[0].boundingPoly;
        
        console.log('[Vision API] Text extracted:', fullText.substring(0, 100) + '...');
        if (boundingPoly) {
          console.log('[Vision API] Bounding box:', boundingPoly);
        }
        
        return fullText;
      }
    }

    console.warn('[Vision API] No text detected');
    return '';
  } catch (error: any) {
    console.error('[Vision API] Error:', error);
    throw new Error(`Vision API failed: ${error.message}`);
  }
}

/**
 * 운전면허증 이미지에서 정보 추출
 * @param imageBuffer 이미지 버퍼
 * @returns 면허 정보
 */
export interface LicenseInfo {
  licenseNum: string;        // 면허번호 (12자리)
  name: string;              // 이름
  birthDate: string;         // 생년월일 (YYYY-MM-DD)
  licenseType: string;       // 면허종별 코드 (예: '12')
  licenseTypeName: string;   // 면허종별 이름 (예: '1종 보통')
  address?: string;          // 주소 (선택)
  residentNumber?: string;    // 주민등록번호 (선택, 뒷자리 마스킹)
  confidence: number;        // 신뢰도 (0-100)
  rawText: string;           // 원본 OCR 텍스트
  residentNumberBounds?: {   // 주민번호 위치 정보 (마스킹용)
    x: number;               // X 좌표 (이미지 너비 기준 0-1)
    y: number;               // Y 좌표 (이미지 높이 기준 0-1)
    width: number;           // 너비 (이미지 너비 기준 0-1)
    height: number;          // 높이 (이미지 높이 기준 0-1)
  };
}

export async function extractLicenseInfo(imageBuffer: Buffer): Promise<LicenseInfo> {
  // Vision API로 텍스트 추출
  const ocrText = await extractTextFromImage(imageBuffer);
  
  // 텍스트에서 면허 정보 파싱
  return parseLicenseInfo(ocrText);
}



/**
 * OCR 텍스트에서 면허 정보 추출
 * (기존 useLicenseOCR.ts의 extractLicenseInfo 함수와 동일한 로직)
 */
function parseLicenseInfo(ocrText: string): LicenseInfo {
  // 공백 및 줄바꿈 정규화
  const normalizedText = ocrText.replace(/\s+/g, ' ').trim();
  
  console.log('[Vision Parser] 정규화된 텍스트:', normalizedText.substring(0, 200));

  // 1. 면허번호 추출 (12자리 숫자)
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
    const regionCode = regionCodeMap[match[1]] || '13';
    licenseNum = `${regionCode}${match[2]}${match[3]}${match[4]}`;
    console.log('[Vision Parser] 패턴1 매치 (지역명 포함):', licenseNum);
  }
  
  // 패턴 2: 숫자만 (11-12-345678-90)
  if (!licenseNum) {
    const pattern2 = /(\d{2})[\s-]?(\d{2})[\s-]?(\d{6})[\s-]?(\d{2})/;
    match = normalizedText.match(pattern2);
    if (match) {
      licenseNum = `${match[1]}${match[2]}${match[3]}${match[4]}`;
      console.log('[Vision Parser] 패턴2 매치 (숫자만):', licenseNum);
    }
  }
  
  // 패턴 3: 연속된 12자리 숫자
  if (!licenseNum) {
    const pattern3 = /(\d{12})/;
    match = normalizedText.match(pattern3);
    if (match) {
      licenseNum = match[1];
      console.log('[Vision Parser] 패턴3 매치 (연속 12자리):', licenseNum);
    }
  }

  // 2. 주민등록번호 먼저 찾기 (이름 추출에 사용)
  let residentNumber = '';
  let residentMatchIndex = -1;
  let residentNumberBounds: { x: number; y: number; width: number; height: number } | undefined;
  const residentPattern = /(\d{6})[\s-]*(\d{7})/;
  const residentMatch = normalizedText.match(residentPattern);
  if (residentMatch) {
    residentNumber = `${residentMatch[1]}-*******`;
    residentMatchIndex = residentMatch.index!;
    
    // 주민번호 마스킹 위치 (고정된 위치, 잘 작동했던 설정)
    residentNumberBounds = {
      x: 0.50,      // 하이픈 뒤 시작 위치 (이미지 너비의 50%)
      y: 0.34,      // 이름 아래 위치 (이미지 높이의 34%)
      width: 0.22,  // 7자리 숫자 + 앞뒤 여유 너비 (이미지 너비의 22%)
      height: 0.07, // 높이 (이미지 높이의 7%)
    };
    
    console.log('[Vision Parser] 주민등록번호 매치:', residentNumber, 'at index:', residentMatchIndex);
    console.log('[Vision Parser] 주민번호 마스킹 위치:', residentNumberBounds);
  }

  // 3. 이름 추출 (주민번호 앞의 한글 2~4자)
  let name = '';
  
  // 방법 1: 주민번호 앞의 한글 찾기 (가장 정확)
  if (residentMatchIndex > 0) {
    const beforeResident = normalizedText.substring(0, residentMatchIndex).trim();
    // 주민번호 바로 앞의 한글 2~4자 찾기
    const namePattern = /([가-힣]{2,4})\s*$/;
    const nameMatch = beforeResident.match(namePattern);
    if (nameMatch) {
      const candidateName = nameMatch[1];
      // 면허 종류 제외
      const excludedTypes = ['대형', '보통', '소형', '원동기', '종대형', '종보통', '종소형', '1종', '2종'];
      if (!excludedTypes.some(type => candidateName.includes(type))) {
        name = candidateName;
        console.log('[Vision Parser] 주민번호 앞 이름 매치:', name);
      }
    }
  }
  
  // 방법 2: 면허번호 다음에 있는 이름 찾기
  if (!name && licenseNum) {
    // 면허번호 패턴 찾기
    const licensePattern = new RegExp(
      licenseNum.replace(/(\d{2})(\d{2})(\d{6})(\d{2})/, '($1[-\\s]?)?$2[-\\s]?$3[-\\s]?$4')
    );
    const licenseMatch = normalizedText.match(licensePattern);
    
    if (licenseMatch && licenseMatch.index !== undefined) {
      // 면허번호 다음 부분 추출 (주민번호 전까지)
      const startIdx = licenseMatch.index + licenseMatch[0].length;
      const endIdx = residentMatchIndex > 0 ? residentMatchIndex : normalizedText.length;
      const afterLicense = normalizedText.substring(startIdx, endIdx).trim();
      
      // 한글 2~4자 찾기
      const namePattern = /^([가-힣]{2,4})/;
      const nameMatch = afterLicense.match(namePattern);
      
      if (nameMatch) {
        const candidateName = nameMatch[1];
        const excludedTypes = ['대형', '보통', '소형', '원동기', '종대형', '종보통', '종소형', '1종', '2종'];
        if (!excludedTypes.some(type => candidateName.includes(type))) {
          name = candidateName;
          console.log('[Vision Parser] 면허번호 다음 이름 매치:', name);
        }
      }
    }
  }
  
  // 방법 3: 전체 텍스트에서 찾기 (마지막 수단)
  if (!name) {
    const nameRegex = /([가-힣]{2,4})/g;
    const nameMatches = normalizedText.match(nameRegex) || [];
    
    // 제외할 단어 (면허 종류 포함)
    const excludedWords = [
      '운전면허증', '도로교통공단', '자동차운전면허증', '대한민국',
      '운전면허', '교통공단', '발급일자', '적성검사', '갱신일자',
      '면허번호', '주민등록', '생년월일', '면허종별',
      '1종대형', '1종보통', '2종소형', '2종보통', '1종소형', '2종원동기',
      '대형', '보통', '소형', '원동기', '종대형', '종보통', '종소형'
    ];
    
    name = nameMatches.find(n => {
      return !excludedWords.some(word => 
        word.includes(n) || 
        n.includes('번호') || 
        n.includes('일자') ||
        n.includes('종') ||
        n.includes('대형') ||
        n.includes('소형')
      );
    }) || '';
  }
  
  console.log('[Vision Parser] 최종 선택된 이름:', name);

  // 3. 생년월일 추출
  let birthDate = '';
  
  const birthPattern1 = /(\d{4})[-.\s/년](\d{1,2})[-.\s/월](\d{1,2})/;
  let birthMatch = normalizedText.match(birthPattern1);
  if (birthMatch) {
    birthDate = `${birthMatch[1]}-${birthMatch[2].padStart(2, '0')}-${birthMatch[3].padStart(2, '0')}`;
    console.log('[Vision Parser] 생년월일 패턴1 매치:', birthDate);
  }
  
  if (!birthDate) {
    const birthPattern2 = /(19|20)(\d{6})/;
    birthMatch = normalizedText.match(birthPattern2);
    if (birthMatch) {
      const fullDate = birthMatch[0];
      birthDate = `${fullDate.slice(0, 4)}-${fullDate.slice(4, 6)}-${fullDate.slice(6, 8)}`;
      console.log('[Vision Parser] 생년월일 패턴2 매치:', birthDate);
    }
  }

  // 4. 주소 추출
  let address = '';
  const addressPattern = /(서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원도|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도|제주특별자치도)[^\d가-힣]*([가-힣\s\d-]+)/;
  const addressMatch = normalizedText.match(addressPattern);
  if (addressMatch) {
    address = `${addressMatch[1]} ${addressMatch[2]}`.trim();
    console.log('[Vision Parser] 주소 매치:', address);
  }

  // 5. 주민등록번호는 이미 위에서 추출됨 (이름 추출에 사용)

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

  let licenseType = '12';
  let licenseTypeName = '1종 보통';

  for (const [keyword, { code, name }] of Object.entries(licenseTypeMap)) {
    if (normalizedText.includes(keyword)) {
      licenseType = code;
      licenseTypeName = name;
      console.log('[Vision Parser] 면허종별 매치:', licenseTypeName);
      break;
    }
  }

  // 7. 신뢰도 계산 (Google Vision API는 높은 정확도를 제공하므로 기본값을 높게 설정)
  let confidence = 0;
  if (licenseNum.length === 12) confidence += 40;
  if (name.length >= 2 && name.length <= 4) confidence += 30;
  if (birthDate.length === 10) confidence += 20;
  if (licenseType) confidence += 10;
  
  // Google Vision API 사용 시 최소 신뢰도 70% (Tesseract보다 높음)
  if (confidence < 70 && (licenseNum || name)) {
    confidence = 70;
  }

  console.log('[Vision Parser] 최종 신뢰도:', confidence + '%');

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
    residentNumberBounds, // 마스킹 위치 정보
  };
}

