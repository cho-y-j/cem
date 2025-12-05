# OCR 엔진 변경 계획 (Google Vision API → ML Kit)

> **상태**: 추후 개발 예정
> **작성일**: 2025-12-03
> **우선순위**: 낮음 (비용 절감 목적)

---

## 배경

현재 운전면허증 OCR에 Google Cloud Vision API를 사용 중이며, 모든 서류에 OCR을 적용할 경우 비용 문제가 예상됨.

### 현재 구조
```
[Client] LicenseUploadWithOCR.tsx
    ↓ useLicenseOCR.ts (hook)
    ↓ trpc.workers.extractLicenseInfo
[Server] routers.ts → vision-api.ts
    ↓ Google Cloud Vision API (REST)
    → 비용: $1.50/1000장
```

### 관련 파일
- `client/src/components/LicenseUploadWithOCR.tsx` - 면허증 업로드 UI
- `client/src/hooks/useLicenseOCR.ts` - OCR Hook
- `server/_core/vision-api.ts` - Vision API 클라이언트

---

## 제안: 3단계 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                   DocumentUploadWithOCR (범용)                    │
│  - 서류 유형별 설정 (면허증, 등록증, 보험증 등)                      │
│  - 이미지 크롭/스캔 기능 내장                                       │
│  - OCR 엔진 선택 (ML Kit / Vision API)                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     useDocumentOCR (Hook)                        │
│  - ocrEngine: 'mlkit' | 'vision-api' | 'auto'                   │
│  - ML Kit: 온디바이스, 무료, 일반 텍스트                           │
│  - Vision API: 클라우드, 유료, 손글씨/복잡한 문서                   │
└─────────────────────────────────────────────────────────────────┘
                    ↓                        ↓
    ┌──────────────────────────┐  ┌──────────────────────────┐
    │   ML Kit Text Recognition │  │   Google Vision API      │
    │   (Capacitor Plugin)      │  │   (Server-side, 기존)    │
    │   - 무료                   │  │   - $1.50/1000장         │
    │   - 온디바이스              │  │   - 손글씨 인식 최고      │
    │   - 인쇄체 텍스트 OK        │  │   - 좌표 정보 제공       │
    └──────────────────────────┘  └──────────────────────────┘
```

---

## 상세 구현 계획

### Phase 1: 범용 서류 첨부 컴포넌트

```typescript
// DocumentUploadWithOCR.tsx - 범용 서류 업로드 컴포넌트

interface DocumentUploadConfig {
  docType: 'license' | 'registration' | 'insurance' | 'safety' | 'custom';

  // OCR 설정
  ocrEnabled: boolean;
  ocrEngine: 'mlkit' | 'vision-api' | 'auto'; // auto = 네이티브면 mlkit, 아니면 vision-api

  // 파싱 규칙 (서류 유형별)
  parseRules?: {
    fields: Array<{
      name: string;           // 필드명 (예: 'licenseNum', 'expiryDate')
      patterns: RegExp[];     // 추출 패턴들
      required: boolean;
    }>;
  };

  // UI 설정
  showPreview: boolean;
  allowCrop: boolean;
  allowScan: boolean;  // 모바일 문서 스캐너
  maskSensitiveData?: boolean;  // 주민번호 등 마스킹
}

// 사용 예시
<DocumentUploadWithOCR
  config={{
    docType: 'license',
    ocrEnabled: true,
    ocrEngine: 'auto',  // 네이티브 앱이면 ML Kit, 웹이면 Vision API
  }}
  onOCRComplete={(data) => {
    setFormData({
      name: data.fields.name,
      licenseNum: data.fields.licenseNum,
    });
  }}
  onFileUploaded={(file) => uploadToStorage(file)}
/>
```

### Phase 2: useDocumentOCR Hook

```typescript
// useDocumentOCR.ts

interface UseDocumentOCROptions {
  engine: 'mlkit' | 'vision-api' | 'auto';
  docType: string;
  parseRules?: ParseRule[];
}

function useDocumentOCR(options: UseDocumentOCROptions) {
  const processImage = async (file: File) => {
    const isNative = Capacitor.isNativePlatform();
    const engine = options.engine === 'auto'
      ? (isNative ? 'mlkit' : 'vision-api')
      : options.engine;

    if (engine === 'mlkit') {
      // Capacitor ML Kit 플러그인 사용 (무료, 온디바이스)
      const result = await MLKit.textRecognition.processImage({ base64: imageData });
      return parseDocument(result.text, options.parseRules);
    } else {
      // 기존 Vision API 사용 (유료, 서버)
      const result = await trpc.ocr.extractText.mutate({ imageData });
      return parseDocument(result.text, options.parseRules);
    }
  };

  return { processImage, isProcessing, result, error };
}
```

### Phase 3: 서류 유형별 파싱 규칙

```typescript
// documentParsers.ts

export const DOCUMENT_PARSERS = {
  license: {
    name: '운전면허증',
    fields: [
      { name: 'licenseNum', patterns: [/(\d{2})[\s-]?(\d{2})[\s-]?(\d{6})[\s-]?(\d{2})/], required: true },
      { name: 'name', patterns: [/([가-힣]{2,4})/], required: true },
      { name: 'birthDate', patterns: [/(\d{4})[-.](\d{2})[-.](\d{2})/], required: false },
    ],
    maskFields: ['residentNumber'],
  },

  registration: {
    name: '건설기계등록증',
    fields: [
      { name: 'regNum', patterns: [/([가-힣]+\d{2}[가-힣]\d{4})/], required: true },
      { name: 'modelName', patterns: [/모델[:\s]*([^\n]+)/], required: false },
      { name: 'manufacturer', patterns: [/제작사[:\s]*([^\n]+)/], required: false },
    ],
    maskFields: [],
  },

  insurance: {
    name: '보험증권',
    fields: [
      { name: 'policyNum', patterns: [/증권번호[:\s]*(\S+)/], required: true },
      { name: 'expiryDate', patterns: [/만료일[:\s]*(\d{4}[-./]\d{2}[-./]\d{2})/], required: true },
    ],
    maskFields: [],
  },

  safety: {
    name: '안전교육이수증',
    fields: [
      { name: 'name', patterns: [/([가-힣]{2,4})/], required: true },
      { name: 'certNum', patterns: [/이수번호[:\s]*(\S+)/], required: false },
      { name: 'expiryDate', patterns: [/유효기간[:\s]*(\d{4}[-./]\d{2}[-./]\d{2})/], required: false },
    ],
    maskFields: [],
  },
};
```

### Phase 4: ML Kit Capacitor 플러그인

```bash
# 설치 옵션 1
npm install @nichealpham/capacitor-ocr

# 설치 옵션 2 (Google ML Kit 직접)
npm install @nichealpham/capacitor-mlkit-text-recognition
```

---

## 파일 구조 (예정)

```
client/src/
├── components/
│   ├── DocumentUploadWithOCR.tsx    # 범용 서류 업로드 (NEW)
│   ├── LicenseUploadWithOCR.tsx     # 기존 면허증 전용 (유지)
│   ├── DocumentScanner.tsx          # 기존 스캐너 (재사용)
│   └── ImageCropModal.tsx           # 기존 크롭 (재사용)
│
├── hooks/
│   ├── useDocumentOCR.ts            # 범용 OCR Hook (NEW)
│   ├── useLicenseOCR.ts             # 기존 면허증 OCR (유지)
│   └── useMLKitOCR.ts               # ML Kit 전용 Hook (NEW)
│
├── config/
│   └── documentParsers.ts           # 서류 유형별 파싱 규칙 (NEW)
│
server/
├── _core/
│   └── vision-api.ts                # 기존 Vision API (유지)
```

---

## 마이그레이션 전략

| 단계 | 작업 | 영향 |
|------|------|------|
| 1 | `DocumentUploadWithOCR` 생성 | 신규 컴포넌트, 기존 영향 없음 |
| 2 | `useDocumentOCR` Hook 생성 | 신규 Hook, 기존 영향 없음 |
| 3 | ML Kit 플러그인 추가 | 앱 빌드 필요 |
| 4 | 기존 `LicenseUploadWithOCR` → 내부적으로 `DocumentUploadWithOCR` 사용 | 하위 호환 |
| 5 | 다른 서류 페이지에서 `DocumentUploadWithOCR` 사용 | 점진적 적용 |

---

## 비용 비교

| OCR 엔진 | 비용 | 장점 | 단점 |
|----------|------|------|------|
| **ML Kit** | 무료 | 온디바이스, 빠름, 프라이버시 | 손글씨 인식 낮음 |
| **Vision API** | $1.50/1000장 | 손글씨 최고, 좌표 정보 | 네트워크 필요, 비용 |

**권장 전략**:
- 기본: ML Kit (무료)
- 손글씨 서류 or ML Kit 실패 시: Vision API (폴백)

---

## 주의사항

- **면허증 좌표 정보 필요**: 면허증 같은 경우 텍스트 위치(좌표)를 알아야 마스킹 등 처리 가능
- Vision API는 좌표 정보 제공, ML Kit은 텍스트만 제공
- 좌표 필요한 경우 Vision API 유지 권장

---

## 참고 문서

- [Google ML Kit Text Recognition](https://developers.google.com/ml-kit/vision/text-recognition)
- [Capacitor ML Kit Plugin](https://github.com/nichealpham/capacitor-mlkit-text-recognition)
- [Google Cloud Vision API Pricing](https://cloud.google.com/vision/pricing)
