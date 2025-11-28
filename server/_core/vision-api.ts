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
 * Vision API 응답의 텍스트 어노테이션
 */
export interface TextAnnotation {
  description: string;
  boundingPoly: {
    vertices: Array<{ x: number; y: number }>;
  };
}

/**
 * Vision API 응답 결과
 */
export interface VisionApiResult {
  fullText: string;
  annotations: TextAnnotation[];
}

/**
 * 이미지에서 텍스트 추출 (OCR)
 * @param imageBuffer 이미지 버퍼 (base64 디코딩된 버퍼)
 * @returns 추출된 텍스트와 각 텍스트의 좌표 정보
 */
export async function extractTextFromImage(imageBuffer: Buffer): Promise<string> {
  const result = await extractTextWithAnnotations(imageBuffer);
  return result.fullText;
}

/**
 * 이미지에서 텍스트와 좌표 정보를 함께 추출 (OCR)
 * @param imageBuffer 이미지 버퍼 (base64 디코딩된 버퍼)
 * @returns 추출된 텍스트와 각 텍스트의 좌표 정보
 */
export async function extractTextWithAnnotations(imageBuffer: Buffer): Promise<VisionApiResult> {
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
                maxResults: 50, // 개별 텍스트 어노테이션을 충분히 가져옴
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
        // 첫 번째 annotation이 전체 텍스트
        const fullText = annotations[0].description || '';

        // 위치 정보도 함께 저장 (마스킹에 사용)
        const boundingPoly = annotations[0].boundingPoly;

        console.log('[Vision API] Text extracted:', fullText.substring(0, 100) + '...');
        if (boundingPoly) {
          console.log('[Vision API] Bounding box:', boundingPoly);
        }

        return {
          fullText,
          annotations: annotations as TextAnnotation[],
        };
      }
    }

    console.warn('[Vision API] No text detected');
    return { fullText: '', annotations: [] };
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
  residentNumberBounds?: {   // 주민번호 위치 정보 (마스킹용) - 픽셀 좌표
    x: number;               // X 좌표 (픽셀)
    y: number;               // Y 좌표 (픽셀)
    width: number;           // 너비 (픽셀)
    height: number;          // 높이 (픽셀)
  };
}

export async function extractLicenseInfo(imageBuffer: Buffer): Promise<LicenseInfo> {
  // Vision API로 텍스트와 좌표 정보 추출
  const visionResult = await extractTextWithAnnotations(imageBuffer);

  // 텍스트에서 면허 정보 파싱 (좌표 정보 포함)
  return parseLicenseInfo(visionResult.fullText, visionResult.annotations);
}



/**
 * 주민번호 뒷자리(7자리)의 정확한 좌표를 찾습니다.
 * Vision API의 개별 텍스트 어노테이션에서 주민번호를 찾아 좌표 반환
 */
function findResidentNumberBounds(
  annotations: TextAnnotation[],
  residentFront: string // 주민번호 앞 6자리
): { x: number; y: number; width: number; height: number } | undefined {
  // 첫 번째 어노테이션은 전체 텍스트이므로 제외
  const wordAnnotations = annotations.slice(1);

  // 주민번호 뒷자리 패턴 (7자리 숫자)
  const backPattern = /^\d{7}$/;
  // 하이픈 포함 전체 주민번호 패턴
  const fullPattern = new RegExp(`${residentFront}[-\\s]?(\\d{7})`);

  // 방법 1: 하이픈 포함 전체 주민번호를 하나의 어노테이션으로 찾기
  for (const annotation of wordAnnotations) {
    const text = annotation.description.replace(/\s/g, '');
    // 주민번호 패턴: 6자리-7자리 (하이픈 포함)
    const residentPattern = /(\d{6,7})[-](\d{7})/;
    const match = text.match(residentPattern);
    if (match && annotation.boundingPoly?.vertices) {
      const vertices = annotation.boundingPoly.vertices;
      const fullWidth = (vertices[1]?.x || 0) - (vertices[0]?.x || 0);
      const height = (vertices[2]?.y || 0) - (vertices[0]?.y || 0);
      const startX = vertices[0]?.x || 0;

      // 전체 문자열에서 뒷자리 7자리의 시작 위치 계산
      // 주민번호 형식: XXXXXX-XXXXXXX (앞6자리-뒤7자리, 하이픈 포함 총 14자)
      // 또는 XXXXXXX-XXXXXXX (앞자리에 추가 숫자가 있을 수 있음)
      const fullText = match[0]; // 예: "711228-2229823" 또는 "1711228-2229823"
      const hyphenIndex = fullText.indexOf('-');
      const totalChars = fullText.length;

      // 하이픈 다음부터 끝까지가 뒷자리 7자리
      // 하이픈 위치 비율로 뒷자리 시작 X 계산
      const hyphenRatio = (hyphenIndex + 1) / totalChars; // 하이픈 다음 문자 시작점
      const backStartX = startX + fullWidth * hyphenRatio;
      const backWidth = fullWidth * (7 / totalChars) + 10; // 7자리 + 여유

      console.log('[Vision Parser] 전체 주민번호 어노테이션 발견:', text);
      console.log('[Vision Parser] 하이픈 위치:', hyphenIndex, '/', totalChars, '비율:', hyphenRatio.toFixed(2));
      console.log('[Vision Parser] 뒷자리 좌표:', { x: backStartX.toFixed(0), y: vertices[0]?.y, width: backWidth.toFixed(0), height });

      return {
        x: backStartX - 5, // 약간의 여유
        y: (vertices[0]?.y || 0) - 2,
        width: backWidth,
        height: height + 4,
      };
    }
  }

  // 방법 2: 뒷자리 7자리만 별도 어노테이션으로 찾기
  for (let i = 0; i < wordAnnotations.length; i++) {
    const annotation = wordAnnotations[i];
    const text = annotation.description.replace(/[-\s]/g, '');

    if (backPattern.test(text) && annotation.boundingPoly?.vertices) {
      // 이전 어노테이션이 앞 6자리인지 확인
      if (i > 0) {
        const prevText = wordAnnotations[i - 1].description.replace(/[-\s]/g, '');
        if (prevText.includes(residentFront) || prevText === residentFront) {
          const vertices = annotation.boundingPoly.vertices;
          const width = (vertices[1]?.x || 0) - (vertices[0]?.x || 0);
          const height = (vertices[2]?.y || 0) - (vertices[0]?.y || 0);

          console.log('[Vision Parser] 주민번호 뒷자리 어노테이션 발견:', text);
          console.log('[Vision Parser] 좌표:', { x: vertices[0]?.x, y: vertices[0]?.y, width, height });

          return {
            x: (vertices[0]?.x || 0) - 5, // 약간의 여유
            y: (vertices[0]?.y || 0) - 2,
            width: width + 10,
            height: height + 4,
          };
        }
      }
    }
  }

  // 방법 3: 주민번호 앞자리를 찾고, 같은 줄의 다음 텍스트 찾기
  for (let i = 0; i < wordAnnotations.length; i++) {
    const annotation = wordAnnotations[i];
    const text = annotation.description.replace(/[-\s]/g, '');

    if (text.includes(residentFront) && annotation.boundingPoly?.vertices) {
      // 같은 Y 좌표 근처의 다음 숫자 어노테이션 찾기
      const frontY = annotation.boundingPoly.vertices[0]?.y || 0;

      for (let j = i + 1; j < Math.min(i + 5, wordAnnotations.length); j++) {
        const nextAnnotation = wordAnnotations[j];
        const nextText = nextAnnotation.description.replace(/[-\s]/g, '');

        if (backPattern.test(nextText) && nextAnnotation.boundingPoly?.vertices) {
          const nextY = nextAnnotation.boundingPoly.vertices[0]?.y || 0;

          // Y 좌표가 비슷하면 같은 줄
          if (Math.abs(nextY - frontY) < 30) {
            const vertices = nextAnnotation.boundingPoly.vertices;
            const width = (vertices[1]?.x || 0) - (vertices[0]?.x || 0);
            const height = (vertices[2]?.y || 0) - (vertices[0]?.y || 0);

            console.log('[Vision Parser] 주민번호 뒷자리 (같은 줄) 발견:', nextText);
            console.log('[Vision Parser] 좌표:', { x: vertices[0]?.x, y: vertices[0]?.y, width, height });

            return {
              x: (vertices[0]?.x || 0) - 5,
              y: (vertices[0]?.y || 0) - 2,
              width: width + 10,
              height: height + 4,
            };
          }
        }
      }
    }
  }

  console.log('[Vision Parser] 주민번호 좌표를 찾지 못함 - 폴백 사용');
  return undefined;
}

/**
 * OCR 텍스트에서 면허 정보 추출
 * (기존 useLicenseOCR.ts의 extractLicenseInfo 함수와 동일한 로직)
 */
function parseLicenseInfo(ocrText: string, annotations: TextAnnotation[] = []): LicenseInfo {
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
    const residentFront = residentMatch[1]; // 앞 6자리
    residentNumber = `${residentFront}-*******`;
    residentMatchIndex = residentMatch.index!;

    // Vision API 어노테이션에서 정확한 좌표 찾기
    if (annotations.length > 0) {
      residentNumberBounds = findResidentNumberBounds(annotations, residentFront);
    }

    // 좌표를 찾지 못한 경우 폴백 (고정 비율)
    if (!residentNumberBounds) {
      console.log('[Vision Parser] 폴백: 고정 비율 좌표 사용');
      // 이 값은 클라이언트에서 이미지 크기에 맞게 변환됨
      residentNumberBounds = {
        x: -1, // -1은 폴백 플래그
        y: -1,
        width: 0,
        height: 0,
      };
    }

    console.log('[Vision Parser] 주민등록번호 매치:', residentNumber, 'at index:', residentMatchIndex);
    console.log('[Vision Parser] 주민번호 마스킹 좌표:', residentNumberBounds);
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

