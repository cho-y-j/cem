# 서류 인증 시스템 확장 계획

> **상태**: API 키 대기 중
> **작성일**: 2025-12-05
> **우선순위**: API 키 발급 후 진행

---

## 현재 상태

| 자격증 | API | 키 상태 |
|--------|-----|---------|
| 운전면허증 | RIMS (한국도로교통공단) | ✅ 사용 중 |
| 건설기계조종사면허 | Q-NET (한국산업인력공단) | ❌ 키 없음 |
| 화물운송자격증 | 한국교통안전공단 | ❌ 키 없음 |

---

## API 발급 필요 목록

### 1. 건설기계조종사면허
- **제공처**: 한국산업인력공단 (Q-NET)
- **API 포털**: https://openapi.q-net.or.kr 또는 https://openapi.hrdkorea.or.kr
- **공공데이터포털**: https://www.data.go.kr
- **용도**: 국가기술자격 진위확인

### 2. 화물운송자격증
- **제공처**: 한국교통안전공단
- **API URL**: `https://apis.data.go.kr/B553881/lcnsCheckService`
- **공공데이터포털**: [운수종사자 자격증 진위여부 확인 API](https://www.data.go.kr/data/15126335/openapi.do)
- **용도**: 버스, 택시, 화물 자격증 진위 및 취소 여부 확인
- **필요 정보**: 성명, 생년월일, 자격증번호

---

## 현재 면허증 인증 구조 (참고용)

```
[Client] LicenseUploadWithOCR.tsx
    ↓ useLicenseOCR.ts → trpc.workers.extractLicenseInfo (Vision API OCR)
    ↓ trpc.workers.verifyLicense (RIMS API 검증)
[Server]
    ↓ routers.ts → vision-api.ts (OCR)
    ↓ routers.ts → rims-api.ts (RIMS 검증)
```

### 관련 파일
- `client/src/components/LicenseUploadWithOCR.tsx` - 면허증 업로드 UI
- `client/src/hooks/useLicenseOCR.ts` - OCR Hook
- `server/_core/vision-api.ts` - Google Vision API
- `server/_core/rims-api.ts` - RIMS API 클라이언트
- `server/_core/rims-crypto.ts` - RIMS 암호화

---

## 확장 계획 (API 키 발급 후)

### 아키텍처: 검증 서비스 레지스트리

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DocumentVerificationService                       │
│  - verify(docType, data) → 적절한 API 호출                           │
│  - extractInfo(docType, image) → OCR + 파싱                          │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    VerificationApiRegistry                           │
│  'RIMS'        → RIMSApiClient (운전면허 - 현재 사용 중)              │
│  'QNET'        → QNetApiClient (건설기계조종사 - 추가 예정)           │
│  'KOTSA'       → KotsaApiClient (화물운송 - 추가 예정)                │
└─────────────────────────────────────────────────────────────────────┘
```

### 스키마 변경 (예정)

```sql
-- 서류 유형 마스터 테이블
CREATE TABLE document_types (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,      -- 'driver_license', 'cargo_license' 등
  name VARCHAR(200) NOT NULL,            -- '운전면허증', '화물운송자격증'

  -- OCR 설정
  ocr_enabled BOOLEAN DEFAULT false,
  ocr_parser VARCHAR(50),                -- 파싱 규칙 ID

  -- 검증 API 설정
  verification_api VARCHAR(50),          -- 'RIMS', 'QNET', 'KOTSA', null
  verification_enabled BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW()
);
```

### 파일 구조 (예정)

```
server/_core/
├── document-verification.ts   # 통합 검증 서비스 (NEW)
├── rims-api.ts                # 운전면허 API (기존)
├── qnet-api.ts                # 건설기계조종사 API (NEW)
├── kotsa-api.ts               # 화물운송 API (NEW)
└── vision-api.ts              # Google Vision OCR (기존)
```

---

## 새 자격증 추가 시 작업 (확장성)

1. 공공데이터포털에서 API 키 발급
2. `{api-name}-api.ts` 클라이언트 생성
3. `verificationApis` 레지스트리에 등록
4. `ocrParsers`에 파싱 규칙 등록 (필요시)
5. DB에 `document_types` 레코드 추가
6. **끝!** - UI는 자동으로 적용됨

---

## TODO (API 키 발급 후)

- [ ] 건설기계조종사면허 API 키 발급
- [ ] 화물운송자격증 API 키 발급
- [ ] API 문서 확인 (요청/응답 스펙)
- [ ] 각 API 클라이언트 구현
- [ ] 통합 검증 서비스 구현
- [ ] Admin에서 서류 유형 선택 UI 개선

---

## 참고 링크

- [공공데이터포털](https://www.data.go.kr)
- [한국산업인력공단 오픈 API](https://openapi.hrdkorea.or.kr/main)
- [Q-net 자격증 진위확인](https://www.q-net.or.kr/qlf006.do)
- [운수종사자 자격증 진위여부 API](https://www.data.go.kr/data/15126335/openapi.do)
