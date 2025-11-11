# 건설장비 및 인력 관리 시스템 (ERMS) - TODO 및 작업 가이드

차량 **마지막 업데이트**: 2025-11-11 (오후)
**프로젝트**: Equipment and Resource Management System (ERMS)
**Supabase 프로젝트**: erms (zlgehckxiuhjpfjlaycf) - ACTIVE_HEALTHY
**현재 단계**: ✅ **시간 표시 및 UI/UX 개선 완료** → 🔄 **워커-차량 매칭 및 GPS 위치 추적 개선 준비**

---

## 🎉 오늘 완료한 작업 (2025-11-11)

### ✅ 출근 시간 표시 문제 완전 해결

**문제:**
- 출근 시간이 UTC 시간(예: 05:11)으로 표시됨
- 한국 시간(KST, 예: 14:11)으로 변환되지 않음
- 클라이언트 측 시간 변환은 올바르게 작동하지만 데이터베이스 저장이 문제

**근본 원인:**
- `drizzle/schema.ts`에서 `checkInTime` 컬럼이 `timestamp`로 정의됨
- PostgreSQL의 `timestamp`는 타임존 정보를 포함하지 않음
- `timestamptz` (timestamp with time zone)를 사용해야 타임존 정보 저장

**해결 방법:**
- ✅ `drizzle/schema.ts`에서 `checkInTime` 컬럼을 `timestamp`에서 `timestamp with timezone`로 변경
- ✅ `createdAt` 컬럼도 동일하게 `timestamp with timezone`로 변경
- ✅ Drizzle 마이그레이션 SQL 생성 (`0008_moaning_dark_beast.sql`)
- ✅ Supabase SQL 에디터에서 마이그레이션 실행 완료
- ✅ 클라이언트에서 `toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' })` 사용하여 정확한 표시

**수정된 파일:**
- `drizzle/schema.ts` - checkInTime, createdAt 컬럼 타입 변경
- `drizzle/migrations-pg/0008_moaning_dark_beast.sql` - 마이그레이션 SQL
- `fix-check-in-time-timezone.sql` - 수동 마이그레이션 파일

**결과:**
- ✅ 출근 시간이 정확한 한국 시간(KST)으로 저장되고 표시됨
- ✅ 브라우저 타임존과 무관하게 정확한 시간 표시
- ✅ 타임존 정보가 데이터베이스에 저장되어 데이터 무결성 보장

**상태:** ✅ **완료 및 테스트 성공**

---

### ✅ Inspector 차량/운전자 서류 조회 및 UI 개선

**배경:**
- Inspector 모바일 페이지에서 차량 검색 시 배정 운전자 정보와 회사 정보까지 확인하고,
- 점검 화면에서 장비/운전자 서류를 바로 열람하고 싶다는 요청이 있었음.

**구현 내용:**
- ✅ `server/db.ts`  
  - `searchEquipmentByVehicleNumber`가 BP/Owner 회사 정보를 함께 반환하도록 업데이트  
  - `getEquipmentInspectionContext` 추가: 장비, 배정 운전자, 서류, Owner 정보를 통합 조회  
  - 누락된 관계 조인(`owner_company`)을 직접 조회하도록 수정해 404 오류 제거
- ✅ `server/safety-inspection-router.ts`  
  - `getEquipmentContext` tRPC 쿼리 추가
- ✅ `client/src/pages/mobile/InspectorMain.tsx`  
  - 검색 결과 카드에 운전자 + BP + Owner 뱃지 표시
- ✅ `client/src/pages/mobile/SafetyInspectionNew.tsx`  
  - 점검 화면에 배정 운전자 카드, 서류 목록 모달, 하단 네비게이션 `서류 보기` 버튼 추가  
  - 장비/운전자 서류를 모달에서 직접 열람 가능 (파일은 원본 형식으로 새 탭에서 열림)

**주의 사항:**
- 브라우저에서 바로 보기 원하면 PDF/이미지 형식으로 업로드하는 것이 가장 안정적  
  (워드 파일은 브라우저가 지원하지 않아 다운로드로 처리됨)

**상태:** ✅ **완료 및 배포, 테스트 대기**

---

### ✅ Inspector NFC 태그 연동

**요구사항:**
- 현장에서 차량에 부착된 NFC 태그를 스캔해 즉시 장비/운전자 정보를 띄우고 점검을 시작하고자 함.
- 태그로 장비를 찾을 수 있도록 DB/서버/모바일 UI 전반의 연동 필요.

**구현 내용:**
- ✅ 데이터베이스
  - `equipment` 테이블에 `nfc_tag_id` 컬럼 추가 (`drizzle/schema.ts`, `0009_add_nfc_tag_to_equipment.sql`)
  - NULL 허용 + 유니크 인덱스 (태그 하나당 하나의 장비 매칭)
- ✅ 서버
  - `getEquipmentInspectionContextByNfcTag` 유틸 추가 (`server/db.ts`)
  - `safetyInspection.getEquipmentByNfcTag` tRPC 쿼리 노출 (`server/safety-inspection-router.ts`)
- ✅ 모바일 Inspector UI
  - 차량 검색 카드에 `NFC 태그 스캔` 버튼 추가 (`client/src/pages/mobile/InspectorMain.tsx`)
  - Web NFC API(`NDEFReader`) 기반으로 태그 스캔 → TRPC fetch → 점검 화면으로 네비게이션
  - 스캔 진행/미지원 상태 안내, 태그값 토스트 노출, 검색 결과 카드에 NFC 태그 표시

**주의/후속 작업:**
- 실사용 전에 Supabase에 `0009_add_nfc_tag_to_equipment.sql` 마이그레이션 적용 필수
- Web NFC는 Android Chrome 최신 버전에서만 지원 (iOS/데스크톱은 비활성 안내 문구 표시)
- 향후 Admin/Owner UI에서 태그를 등록/수정하는 기능 추가 검토

**상태:** ✅ **완료 및 배포, 실기기 테스트 대기**

---

### ✅ WorkZones 페이지 레이아웃 문제 완전 해결

**문제:**
- 왼쪽 메뉴바와 본문 사이에 불필요한 빈 공간 존재
- 콘텐츠가 우측으로 밀려나 보임
- 다른 페이지는 정상인데 WorkZones 페이지만 문제

**근본 원인 발견:**
- `App.tsx`에서 이미 **모든 페이지를 DashboardLayout으로 감싸고 있음** (라우터 레벨)
- `WorkZones.tsx`가 **내부에서 다시 DashboardLayout을 사용**하여 **이중 적용**됨
- 결과: 레이아웃 패딩과 마진이 두 번 적용되어 빈 공간 발생

**비교:**
- `CheckInMonitoring.tsx`: ✅ DashboardLayout 없음 (App.tsx에서만 적용) - 정상
- `WorkZones.tsx`: ❌ DashboardLayout 이중 사용 - 레이아웃 깨짐

**해결 방법:**
- ✅ `WorkZones.tsx`에서 `DashboardLayout` import 제거
- ✅ `WorkZones.tsx`에서 `<DashboardLayout>` 래퍼 제거
- ✅ `DashboardLayout.tsx`를 원래 상태(`p-4`)로 복원
- ✅ WorkZones를 CheckInMonitoring과 동일한 구조로 변경

**수정된 파일:**
- `client/src/pages/WorkZones.tsx` - DashboardLayout 이중 사용 제거
- `client/src/components/DashboardLayout.tsx` - 원래 패딩 복원

**결과:**
- ✅ 왼쪽 사이드바와 콘텐츠 사이 빈 공간 완전 제거
- ✅ 다른 페이지들과 동일한 레이아웃으로 정상 표시
- ✅ 반응형 동작 정상

**상태:** ✅ **완료 및 테스트 성공**

---

### ✅ 모바일 출근 체크 에러 수정

**문제:**
- "출근체크 실패: deployment not defined" 에러 발생
- 출근 완료 후 화면이 자동으로 업데이트되지 않음

**해결 방법:**
- ✅ 서버 코드에서 `deployment` 변수를 `activeDeployment`로 수정
- ✅ `equipment_id` 필드명 수정 (`equipmentId` → `equipment_id`)
- ✅ 출근 완료 후 여러 방법으로 강제 새로고침:
  - `utils.checkIn.getTodayStatus.invalidate()` 호출
  - `utils.checkIn.getTodayStatus.refetch()` 호출
  - `refetchCheckIn()` 호출
  - 500ms 후 한 번 더 refetch (UI 업데이트 보장)
- ✅ 에러 메시지 개선 (deployment → 투입)

**수정된 파일:**
- `server/check-in-router.ts` - `activeDeployment` 사용
- `client/src/pages/mobile/WorkerMain.tsx` - UI 새로고침 로직 개선

**상태:** ✅ **완료**

---

## 🎉 오늘 완료한 작업 (2025-11-09)

### ✅ WebAuthn 생체 인증 버그 수정

**수정된 문제들:**
1. ✅ **"인증 챌린지 생성에 실패했습니다" 에러 수정**
   - `allowCredentials` 타입 문제 해결 (일시적으로 제거하여 우회)
   - `simplewebauthn/server`의 내부 검증 로직과 `Uint8Array` 타입 불일치 문제
   - **임시 해결**: `generateAuthenticationOptions`에서 `allowCredentials` 제거
   - **근본 해결 필요**: `allowCredentials`를 올바른 형식으로 전달하도록 개선 필요

2. ✅ **생체 인증 등록 후 UI 업데이트 문제 해결**
   - `BiometricSetup.tsx`에 `refetchOnMount`, `refetchOnWindowFocus` 옵션 추가
   - 등록 성공 후 `setTimeout`으로 `refetch` 호출하여 DB 업데이트 대기
   - 버튼 텍스트 동적 변경: "새 생체 인증 등록" → "추가 생체 인증 등록"
   - 등록된 크레덴셜 개수 표시 추가

3. ✅ **`toCamelCaseArray` import 문제 해결**
   - `server/webauthn-router.ts`에서 `toCamelCaseArray`를 `db-utils`에서 직접 import

4. ✅ **React DOM `removeChild` 에러 수정**
   - `CheckInMonitoring.tsx`, `EntryRequestDetail.tsx`, `PdfViewerModal.tsx`에서 `removeChild` 호출 전 부모 노드 확인 추가
   - `DashboardLayout.tsx`에서 SSR hydration 에러 방지를 위해 `localStorage` 접근을 `useEffect` 내부로 이동

5. ✅ **모바일 Chrome 자동 번역 방지**
   - `client/index.html`에 `<meta name="google" content="notranslate" />` 추가
   - `lang="ko"` 설정

6. ✅ **출근 시간 기록 오류 수정**
   - KST 변환 로직 제거, `new Date()` 직접 사용
   - PostgreSQL/Supabase가 타임존을 자동 처리하므로 클라이언트에서 표시 시에만 변환

**수정된 파일:**
- `server/webauthn-router.ts` - `allowCredentials` 임시 제거, `toCamelCaseArray` import 수정
- `client/src/pages/mobile/BiometricSetup.tsx` - UI 업데이트 로직 개선
- `client/src/pages/mobile/WorkerMain.tsx` - 에러 핸들링 개선
- `client/src/pages/CheckInMonitoring.tsx` - `removeChild` 안전성 개선
- `client/src/components/DashboardLayout.tsx` - SSR hydration 에러 방지
- `client/src/components/EntryRequestDetail.tsx` - `removeChild` 안전성 개선
- `client/src/components/PdfViewerModal.tsx` - `removeChild` 안전성 개선
- `client/index.html` - 자동 번역 방지 메타 태그 추가
- `server/check-in-router.ts` - 출근 시간 기록 로직 수정

---

## 🎉 이전 완료한 작업 (2025-11-09 오전)

### ✅ 모바일 출근 체크 에러 수정
- 🔴 **긴급 버그 수정**: `deployments.work_zone_id` 컬럼 문제 해결
- `check-in-router.ts` 수정: deployment 조회에서 존재하지 않는 컬럼 제거
- work_zone 자동 선택 로직 추가: BP 회사의 활성 work_zone 자동 조회

### ✅ WebAuthn 생체 인증 시스템 구현 완료 (100%)

**라이브러리 설치:**
- `@simplewebauthn/server 13.2.2` ✅
- `@simplewebauthn/browser 13.2.2` ✅

**서버 구현 (server/webauthn-router.ts):**
- ✅ 등록 챌린지 생성 (`generateRegistrationOptions`)
- ✅ 크레덴셜 검증 및 저장 (`verifyRegistrationResponse`)
- ✅ 인증 챌린지 생성 (`generateAuthenticationOptions`)
- ✅ 인증 검증 (`verifyAuthenticationResponse`)
- ✅ 크레덴셜 목록 조회 및 삭제
- ✅ 리플레이 공격 방지 (카운터 업데이트)

**클라이언트 구현:**
- ✅ 생체 인증 설정 페이지 (`/mobile/biometric-setup`)
  - 지문/얼굴 인식 등록
  - 등록된 기기 목록 표시
  - 기기 삭제 기능
- ✅ WorkerMain 페이지 통합
  - PIN 출근 버튼
  - 생체 인증 출근 버튼
  - 생체 인증 설정 링크
  - GPS + 생체 인증 통합 플로우

**지원 플랫폼:**
- ✅ iOS (Face ID / Touch ID)
- ✅ Android (지문 인식)
- ✅ Windows (Windows Hello)
- ✅ macOS (Touch ID)

**보안 기능:**
- ✅ FIDO2 표준 준수
- ✅ 공개키 암호화 (서버에는 공개키만 저장)
- ✅ 챌린지-응답 검증
- ✅ 카운터 기반 리플레이 공격 방지
- ✅ 생체 정보는 기기 내부에만 저장 (서버 전송 안 함)

**빌드 테스트:**
- ✅ TypeScript 컴파일 성공
- ✅ Vite 프로덕션 빌드 성공

---

## 🎉 이전 완료한 작업 (2025-11-08)

### ✅ GPS 기반 출근 체크 시스템 구현

**구현 내용:**
- ✅ 작업 구역 관리 페이지 (`/work-zones`)
  - 원형 구역 (Circle) 및 다각형 구역 (Polygon) 지원
  - Google Maps 연동으로 지도에서 직접 구역 설정
  - 그리기 모드 토글 버튼 추가 (지도 클릭으로 점 추가/중심 이동)
  - 폴리곤 점 드래그로 위치 조정 가능
  - UI/UX 개선: 대화상자 크기 확대, 행 기반 목록 표시

- ✅ 출근 체크 API (`server/check-in-router.ts`)
  - GPS 좌표 기반 출근 체크
  - 작업 구역 내/외 출근 여부 자동 판단
  - 원형 구역: 중심점과 반경으로 거리 계산
  - 다각형 구역: Ray casting 알고리즘으로 내부 여부 확인
  - 투입된 Worker만 출근 가능하도록 검증 추가

- ✅ 출근 현황 모니터링 페이지 (`/check-in-monitoring`)
  - 필터 기능: BP 회사, Owner 회사, 사용자 종류, 이름 검색, 날짜
  - 통계 카드: 총 출근자, 구역 내/외 출근, 생체 인증
  - 시간대별 분포 (오전/오후)
  - 엑셀 다운로드 기능

- ✅ 데이터베이스 스키마 확장
  - `work_zones` 테이블에 `zone_type` (circle/polygon) 추가
  - `polygon_coordinates` 컬럼 추가 (JSON 형식)
  - `center_lat`, `center_lng`, `radius_meters` nullable로 변경

**테스트 완료:**
- ✅ 작업 구역 생성/수정/삭제
- ✅ 원형 구역 설정 및 마커 드래그/클릭 이동
- ✅ 다각형 구역 설정 및 점 추가/삭제/드래그
- ✅ 출근 현황 페이지 필터 동작 확인

**관련 파일:**
- `client/src/pages/WorkZones.tsx`
- `client/src/pages/CheckInMonitoring.tsx`
- `server/check-in-router.ts`
- `server/work-zone-router.ts`
- `server/db.ts`
- `drizzle/schema.ts`

---

## 🐛 현재 발견된 문제 (2025-11-11)

### 1. 🟠 DashboardLayout 반응형 개선 필요

**증상:**
- 좌측 네비게이션 바와 우측 공간이 항상 표시됨
- 모바일에서도 사이드바가 기본적으로 표시되어 공간을 차지함
- 화면 축소 시 콘텐츠가 잘릴 수 있음

**현재 상태:**
- `DashboardLayout`은 `SidebarProvider`와 `SidebarInset`을 사용
- `isMobile`을 사용하여 모바일에서 상단 바만 표시하지만, 사이드바 자체는 항상 표시됨
- shadcn/ui의 Sidebar 컴포넌트는 기본적으로 항상 표시되고, 모바일에서는 오버레이로 작동해야 함

**개선 필요:**
- 모바일에서 사이드바가 기본적으로 숨겨지고, 햄버거 메뉴로만 열리도록 개선
- 화면 크기에 따라 사이드바 동작 최적화
- WorkZones 페이지의 중앙 정렬 및 반응형 개선 (부분 완료)

**예상 소요 시간:** 2-3시간

---

### 2. 🔴 Worker 지문 출근 문제 해결 (진행 중)

**현재 상태:**
- ✅ WebAuthn 생체 인증 시스템 구현 완료
- ✅ `handleBiometricCheckIn` 함수 구현됨
- ✅ GPS + 생체 인증 통합 플로우 구현됨

**확인 필요 사항:**
1. 생체 인증 등록 여부 확인
2. 챌린지 생성 성공 여부
3. 인증 검증 성공 여부
4. 출근 체크 API 호출 성공 여부
5. 에러 메시지 및 로그 확인

**관련 파일:**
- `client/src/pages/mobile/WorkerMain.tsx` - `handleBiometricCheckIn` 함수
- `server/webauthn-router.ts` - `generateAuthenticationChallenge`, `verifyAuthentication`
- `server/check-in-router.ts` - 출근 체크 API

**예상 소요 시간:** 1-2시간

---

## 🐛 이전 발견된 문제 (2025-11-09)

### 1. 🟠 WebAuthn `allowCredentials` 타입 문제 (임시 해결됨, 근본 해결 필요)

**증상:**
- 생체 인증 출근 시 "인증 챌린지 생성에 실패했습니다. input replace is not a function" 에러 발생
- `simplewebauthn/server`의 내부 검증 로직이 `allowCredentials.id`를 문자열로 기대하지만 `Uint8Array`를 전달하여 발생

**임시 해결:**
- ✅ `generateAuthenticationOptions`에서 `allowCredentials` 제거
- ✅ `verifyAuthentication`에서 크레덴셜 검증 수행

**근본 해결 필요:**
- `allowCredentials`를 올바른 형식으로 전달하도록 개선
- `simplewebauthn/server` 라이브러리의 최신 버전 확인 및 업데이트
- 또는 `allowCredentials` 없이도 안전하게 작동하도록 검증 로직 강화

**예상 소요 시간:** 1-2시간

---

### 2. ✅ 모바일 출근 체크 실패 (해결됨)

**증상:**
- 모바일에서 출근 버튼 클릭 시 "투입정보조회중 오류가 발생했습니다" 에러 발생

**원인:**
- `deployments.work_zone_id` 컬럼이 존재하지 않음

**해결:**
- ✅ `check-in-router.ts` 수정 완료
- ✅ BP 회사의 활성 work_zone 자동 조회 로직 추가

---

### 2. ✅ 출근 현황 페이지 Select 컴포넌트 에러 (해결됨)

**증상:**
- 출근 현황 페이지 접속 시 Select 컴포넌트 에러 발생
- `Error: A <Select.Item /> must have a value prop that is not an empty string`

**원인:**
- Select 컴포넌트의 "전체" 옵션에 빈 문자열(`""`) 사용
- shadcn/ui Select는 빈 문자열을 허용하지 않음

**해결:**
- ✅ `value="all"`로 변경하고 `onValueChange`에서 `"all"`을 `undefined`로 변환
- ✅ 필터 상태를 `undefined`로 관리

**수정 완료 파일:**
- `client/src/pages/CheckInMonitoring.tsx`

---

### 3. 🟠 check_ins와 users 간 Foreign Key 관계 에러 (해결됨)

**증상:**
- 출근 현황 페이지에서 `Could not find a relationship between 'check_ins' and 'users'` 에러 발생

**원인:**
- Supabase 쿼리에서 foreign key 관계를 자동으로 찾지 못함
- `check_ins_user_id_fkey` 관계가 스키마 캐시에 없을 수 있음

**해결:**
- ✅ `getCheckIns` 함수에서 `users` 정보를 별도로 조회하여 병합
- ✅ foreign key 관계에 의존하지 않고 직접 조인

**수정 완료 파일:**
- `server/db.ts` (`getCheckIns` 함수)

---

## 📋 다음 작업 계획 (2025-11-10)

### 🔴 우선순위 1: 워커-차량 매칭 및 GPS 위치 추적 시스템 개선

**작업 내용:**

#### 1.1 워커-차량 매칭 및 작업확인서/운전자 안전점검 작성
- ✅ **현재 상태**: 기본 기능 구현됨 (`equipment.assignDriver`, `workJournal`, `safetyInspections`)
- 🔄 **개선 필요**:
  - 워커가 배정된 차량과 매칭되어 작업확인서 작성 가능하도록 UI 개선
  - 운전자 안전점검 작성 플로우 개선
  - 작업 시작 시 자동으로 차량 매칭 확인

**관련 파일:**
- `server/routers.ts` - `equipment.assignDriver`
- `server/work-journal-router.ts` - 작업확인서 API
- `server/safety-inspection-router.ts` - 안전점검 API
- `client/src/pages/mobile/WorkerMain.tsx` - 워커 메인 페이지
- `client/src/pages/mobile/DriverInspection.tsx` - 운전자 점검 페이지

**예상 소요 시간:** 2-3시간

---

#### 1.2 GPS 5분 간격 전송 개선

**현재 상태:**
- ✅ 기본 GPS 전송 기능 구현됨 (`server/location-router.ts`, `client/src/pages/mobile/WorkerMain.tsx`)
- ✅ 작업 시작 시 GPS 전송 시작
- ✅ 5분 간격으로 GPS 전송

**개선 필요:**
1. **관리자가 GPS 전송 간격 조정 가능하도록 설정**
   - Admin/EP가 설정 페이지에서 GPS 전송 간격 설정 (기본 5분)
   - 설정값을 데이터베이스에 저장
   - 워커 앱에서 설정값을 읽어서 사용

2. **휴식 중 GPS 전송 중지**
   - 현재: 작업 세션 상태와 관계없이 GPS 전송
   - 개선: `workStatus === "resting"`일 때 GPS 전송 중지
   - 휴식 종료 시 GPS 전송 재개

3. **작업 종료 후 GPS 전송 중지**
   - 현재: 작업 종료 후에도 GPS 전송 계속됨
   - 개선: `workStatus === "finished"` 또는 작업 세션 종료 시 GPS 전송 중지

**수정 필요 파일:**
- `server/mobile-router.ts` - GPS 전송 간격 설정 API 추가
- `client/src/pages/mobile/WorkerMain.tsx` - GPS 전송 로직 개선
- `server/db.ts` - GPS 전송 간격 설정 저장/조회 함수 추가
- `drizzle/schema.ts` - 설정 테이블 추가 (또는 기존 설정 테이블 활용)

**예상 소요 시간:** 3-4시간

---

#### 1.3 차량 위치 추적 시스템 개선

**현재 상태:**
- ✅ 기본 위치 추적 기능 구현됨 (`server/location-router.ts`, `client/src/pages/LocationTracking.tsx`)
- ✅ 실시간 위치 지도 (Google Maps)
- ✅ 10초마다 자동 새로고침
- ⚠️ **문제**: 위치 추적에 에러 발생 (사용자 보고)

**개선 필요:**
1. **위치 추적 에러 수정**
   - 현재 에러 원인 분석 필요
   - GPS 수신 실패 시 처리 로직 개선
   - 네트워크 오류 시 재시도 로직 추가

2. **지도에 차량과 운전자 표기**
   - 현재: 워커 위치만 표시
   - 개선: 차량 정보와 운전자 정보를 함께 표시
   - 마커 클릭 시 상세 정보 표시 (차량 번호, 운전자 이름, 회사 정보 등)

3. **필터링 기능 추가**
   - 차종별 필터 (장비 타입별)
   - 운전자별 필터
   - 오너사별 필터
   - BP사별 필터
   - EP사별 필터
   - 다중 필터 조합 지원

4. **이동 동선 추적 및 분석**
   - 위치 이력 저장 (현재 `location_logs` 테이블 활용)
   - 시간대별 이동 경로 시각화 (Polyline)
   - 이동 거리 계산
   - 체류 시간 분석
   - 분석 리포트 생성 (일별/주별/월별)

**수정 필요 파일:**
- `server/location-router.ts` - 위치 추적 로직 개선
- `server/db.ts` - 위치 이력 조회 및 분석 함수 추가
- `client/src/pages/LocationTracking.tsx` - 필터링 및 시각화 개선
- `drizzle/schema.ts` - 위치 이력 테이블 확인 및 필요 시 스키마 확장

**예상 소요 시간:** 4-5시간

---

## 📝 상세 작업 플랜: 워커-차량 매칭 및 GPS 위치 추적 시스템

### Phase 1: 워커-차량 매칭 및 작업확인서/운전자 안전점검 작성

**목표:**
- 워커가 배정된 차량과 매칭되어 작업확인서 및 운전자 안전점검을 작성할 수 있도록 개선

**작업 단계:**
1. **데이터베이스 스키마 확인**
   - `equipment.assigned_worker_id` 확인
   - `work_journal` 테이블 구조 확인
   - `safety_inspections` 테이블 구조 확인

2. **워커 메인 페이지 개선 (`WorkerMain.tsx`)**
   - 배정된 차량 정보 표시
   - 작업 시작 버튼 클릭 시 차량 매칭 확인
   - 작업확인서 작성 버튼 추가 (배정된 차량이 있을 때만 활성화)
   - 운전자 안전점검 작성 버튼 추가 (배정된 차량이 있을 때만 활성화)

3. **작업확인서 작성 플로우 개선**
   - 워커가 배정된 차량 정보 자동 입력
   - 작업 시작 시간 자동 기록
   - 작업 종료 시간 기록

4. **운전자 안전점검 작성 플로우 개선**
   - 배정된 차량의 템플릿 자동 로드
   - 점검 항목 자동 채우기 (차량 정보)

**예상 소요 시간:** 2-3시간

---

### Phase 2: GPS 5분 간격 전송 개선

**목표:**
- 관리자가 GPS 전송 간격을 조정할 수 있도록 설정
- 휴식 중 및 작업 종료 후 GPS 전송 중지

**작업 단계:**
1. **GPS 전송 간격 설정 테이블 생성**
   - `system_settings` 테이블에 `gps_tracking_interval_minutes` 컬럼 추가
   - 또는 별도 `gps_settings` 테이블 생성
   - 기본값: 5분

2. **설정 API 구현**
   - `system.getGpsInterval` - GPS 전송 간격 조회
   - `system.setGpsInterval` - GPS 전송 간격 설정 (Admin/EP만 가능)

3. **워커 앱 GPS 전송 로직 개선 (`WorkerMain.tsx`)**
   - 설정값을 읽어서 동적으로 GPS 전송 간격 설정
   - 작업 세션 상태 확인:
     - `workStatus === "working"` 또는 `workStatus === "overtime"`: GPS 전송
     - `workStatus === "resting"`: GPS 전송 중지
     - `workStatus === "finished"` 또는 작업 세션 종료: GPS 전송 중지
   - 휴식 종료 시 GPS 전송 재개

4. **설정 페이지 추가 (Admin/EP용)**
   - GPS 전송 간격 설정 UI
   - 실시간 적용 확인

**예상 소요 시간:** 3-4시간

---

### Phase 3: 차량 위치 추적 시스템 개선

**목표:**
- 위치 추적 에러 수정
- 지도에 차량과 운전자 정보 표시
- 필터링 기능 추가 (차종별, 운전자별, 오너사별, BP사별)
- 이동 동선 추적 및 분석 기능

**작업 단계:**
1. **위치 추적 에러 수정**
   - 현재 에러 로그 분석 (Render MCP 활용)
   - GPS 수신 실패 시 처리 로직 개선
   - 네트워크 오류 시 재시도 로직 추가
   - 에러 메시지 개선

2. **지도 마커 개선 (`LocationTracking.tsx`)**
   - 차량 정보와 운전자 정보를 함께 표시
   - 마커 아이콘 차별화 (차종별, 상태별)
   - 마커 클릭 시 상세 정보 표시:
     - 차량 번호
     - 운전자 이름
     - 오너사/BP사/EP사 정보
     - 현재 위치 시간
     - GPS 정확도

3. **필터링 기능 추가**
   - 차종별 필터 (Select 컴포넌트)
   - 운전자별 필터 (Select 컴포넌트)
   - 오너사별 필터 (Select 컴포넌트)
   - BP사별 필터 (Select 컴포넌트)
   - EP사별 필터 (Select 컴포넌트)
   - 다중 필터 조합 지원
   - 필터 초기화 버튼

4. **이동 동선 추적 및 분석**
   - 위치 이력 조회 API 개선 (`location.getHistory`)
   - 시간대별 이동 경로 시각화 (Google Maps Polyline)
   - 이동 거리 계산 (Haversine 공식 활용)
   - 체류 시간 분석
   - 분석 리포트 생성:
     - 일별 리포트 (이동 거리, 체류 시간, 경로)
     - 주별 리포트 (요약 통계)
     - 월별 리포트 (요약 통계)
   - 리포트 다운로드 (Excel/PDF)

**예상 소요 시간:** 4-5시간

---

### Phase 4: 통합 테스트 및 최적화

**목표:**
- 모든 기능 통합 테스트
- 성능 최적화
- UI/UX 개선

**작업 단계:**
1. **통합 테스트**
   - 워커-차량 매칭 테스트
   - GPS 전송 간격 설정 테스트
   - 휴식 중 GPS 전송 중지 테스트
   - 작업 종료 후 GPS 전송 중지 테스트
   - 위치 추적 에러 수정 확인
   - 필터링 기능 테스트
   - 이동 동선 분석 테스트

2. **성능 최적화**
   - GPS 전송 빈도 최적화
   - 위치 이력 조회 쿼리 최적화
   - 지도 렌더링 최적화 (마커 클러스터링)

3. **UI/UX 개선**
   - 필터 UI 개선
   - 지도 인터랙션 개선
   - 리포트 UI 개선

**예상 소요 시간:** 2-3시간

---

**전체 예상 소요 시간:** 11-15시간

---

### 🟡 우선순위 2: WebAuthn `allowCredentials` 근본 해결

**작업 내용:**
1. `simplewebauthn/server` 라이브러리 최신 버전 확인
2. `allowCredentials`를 올바른 형식으로 전달하도록 수정
3. 또는 `allowCredentials` 없이도 안전하게 작동하도록 검증 로직 강화

**예상 소요 시간:** 1-2시간

---

### 🟡 우선순위 3: 생체 인증 실제 테스트

**작업 내용:**
1. 모바일 기기(iPhone/Android)에서 테스트
   - 생체 인증 등록 테스트
   - 지문/얼굴 인식으로 출근 테스트
   - 다중 기기 등록 테스트

2. 에러 케이스 테스트
   - 생체 인증 취소
   - 등록되지 않은 상태에서 출근 시도
   - 챌린지 만료
   - GPS 실패 시 처리

**예상 소요 시간:** 2시간

---

## 🎯 이전 완료 작업 (2025-11-07)

### ✅ 반입 요청 전체 보기 기능 추가
- PDF를 브라우저에서 직접 볼 수 있는 기능
- 모바일 Inspector도 작업계획서를 브라우저에서 볼 수 있도록 개선

### ✅ UI 개선: EP 승인 화면 버튼 크기 조정
- 모든 버튼에 `size="sm"` 적용
- 버튼 텍스트 간결화

### ✅ 투입 관리 개선 (근본 문제 해결)
- `entryRequestsV2.list` API가 items 배열을 반환하도록 수정
- EP 승인된 모든 장비/인력 자동 표시

### ✅ 작업 확인서 월별 정리표 추가
- BP/Owner/EP용 월별 정리표 탭 추가
- Deployment별로 그룹화하여 카드 형식으로 표시

---

## 🚀 시작하기 전에 읽어야 할 것

### 필수 문서
1. `CLAUDE.md` - 프로젝트 아키텍처 및 개발 가이드 (가장 중요!)
2. `최종완성보고서.md` - 완료된 기능 전체 목록
3. `모바일작업완료보고서.md` - 모바일 기능 완성 보고서
4. `README_반입요청개선.md` - 반입 요청 개선 사항

### Supabase MCP 사용 가이드

**MCP 연결 상태**: ✅ 연결됨  
**조직**: esms (bnreqwqoxhacnvaidvtw)  
**활성 프로젝트**: erms (zlgehckxiuhjpfjlaycf) - ap-south-1 리전

**MCP로 할 수 있는 작업들**:
- ✅ 프로젝트 조회 및 관리
- ✅ 데이터베이스 테이블 조회
- ✅ SQL 실행
- ✅ 마이그레이션 적용
- ✅ TypeScript 타입 생성
- ✅ Edge Functions 관리
- ✅ 로그 조회
- ✅ 보안/성능 권고사항 확인
- ✅ 문서 검색

**중요**: 데이터베이스 작업 시 MCP 도구를 우선적으로 사용하세요!
중요= context7 mcp 를 이용하여 최신업데이트 코드문서를 확인해

---

## 📊 현재 프로젝트 상태

### ✅ 완료된 주요 기능 (구현 완료 - 테스트 진행 중)

#### Phase 1-3: 기본 시스템
- ✅ 회사 관리 (Owner/BP/EP)
- ✅ 사용자 관리 (Admin/Owner/BP/EP/Worker/Inspector)
- ✅ 장비 관리 (등록, 서류 업로드, 상태 관리)
- ✅ 인력 관리 (등록, 서류 업로드, 상태 관리)
- ✅ 서류 관리 (통합 조회, 승인/반려, Supabase Storage 연동)
- ✅ **반입 요청 관리** (3단계 승인 프로세스) - **구현 완료, 테스트 필요**
- ✅ **투입 관리 및 작업확인서** - **구현 완료, 테스트 필요**
- ✅ **안전점검 시스템** - **구현 완료, 테스트 필요**
- ✅ **GPS 기반 출근 체크 시스템** - **구현 완료, 버그 수정 중**

#### Phase 4: GPS 위치 추적 및 긴급 상황 대응
- ✅ GPS 위치 추적 (5분 간격)
- ✅ 실시간 위치 지도 (Google Maps)
- ✅ 긴급 알림 시스템
- ✅ 긴급 알림 목록 페이지

#### Phase 5: 작업 현황 모니터링
- ✅ 작업 현황 모니터링 페이지
- ✅ 경과 시간 실시간 계산
- ✅ 휴식 시간 준수 체크 (4시간 이상 경고)
- ✅ 통계 대시보드

#### 모바일 최적화
- ✅ Worker 앱 (작업 시작/종료, 휴식, 긴급 버튼)
- ✅ Inspector 앱 (안전점검)
- ✅ PIN 로그인 (4자리)
- ✅ 서류 촬영 및 업로드
- ✅ 점검 일지, 작업 일지
- 🔄 **GPS 출근 체크** - **구현 완료, 버그 수정 중**

---

## 🧪 현재 단계: 테스트 및 개선

### 진행 상황
- **작업 확인서**: ✅ 구현 완료
- **반입 절차**: ✅ 구현 완료
- **안전확인서 작성**: ✅ 구현 완료
- **GPS 출근 체크**: 🔄 구현 완료, 버그 수정 중
- **다음**: 버그 수정 → 테스트 → UI 개선 → 권한 체크

---

## 🔴 우선순위 1: 긴급 수정 사항

### 1. 모바일 출근 체크 실패 🔴 (긴급!)

**증상:**
- 모바일에서 출근 버튼 클릭 시 "투입정보조회중 오류가 발생했습니다" 에러
- Render 로그: `column deployments.work_zone_id does not exist`

**원인:**
- `check-in-router.ts`에서 존재하지 않는 `deployments.work_zone_id` 컬럼 조회

**수정 계획:**
- [ ] `server/check-in-router.ts` 84번째 줄 수정
- [ ] deployment 조회 쿼리에서 `work_zone_id` 제거
- [ ] `work_zone_id` 결정 로직 개선 (deployment와 별개로 처리)

**수정 완료:** ⬜

---

## 🟠 우선순위 2: 데이터베이스 및 백엔드

### 1. RLS (Row Level Security) 활성화 🔄 (중요!)
- **현재 상태**: DISABLED
- **위험도**: 높음 (프로덕션 배포 전 필수)
- **조치**: MCP로 RLS 정책 설계 및 적용

### 2. 데이터 무결성 제약 조건 추가
- **목적**: 중복 투입 방지, 비즈니스 룰 강제
- **조치**: 제약 조건 또는 트리거로 구현

### 3. 서류 만료 스케줄러 구현
- **파일**: `server/_core/scheduler.ts`
- **조치**: node-cron 설치 및 스케줄러 구현

---

## 🟡 우선순위 3: 프론트엔드 개선

### 1. 역할별 대시보드 커스터마이징 🔄 (부분 완료)
- **개선 필요**: Admin/Owner/BP/EP/Worker 대시보드 강화

### 2. 통계 및 리포트 기능 강화
- **개선 필요**: 차트, Excel/PDF 다운로드

### 3. 실시간 알림 시스템
- **목표**: WebSocket 또는 Push Notification

---

## 🟢 우선순위 4: 개발 경험 및 품질

### 1. 타입 안전성 개선
- [ ] `any` 타입 제거
- [ ] 전역 타입 정의 파일 생성

### 2. 에러 처리 개선
- [ ] 전역 에러 바운더리 강화
- [ ] API 에러 메시지 표준화

### 3. 성능 최적화
- [ ] React Query 캐싱 전략 개선
- [ ] 코드 스플리팅

### 4. 테스트 코드 작성
- [ ] 단위 테스트 (Vitest)
- [ ] API 테스트 (tRPC router 테스트)
- [ ] E2E 테스트 (Playwright)

---

## 🔵 우선순위 5: 프로덕션 준비

### 1. 환경 변수 관리
- [ ] 프로덕션 환경 변수 분리
- [ ] 시크릿 키 로테이션 계획

### 2. 파일 저장소 (Supabase Storage)
- [ ] Storage 버킷 정책 설정
- [ ] 파일 크기/형식 제한 적용

### 3. 보안 강화
- [ ] JWT_SECRET 강력한 랜덤 문자열로 변경
- [ ] CORS 설정 검토
- [ ] Rate Limiting 추가

### 4. 모니터링 및 로깅
- [ ] 에러 로깅 시스템 구축
- [ ] 성능 모니터링

---

## 🎨 선택적 개선 사항 (Nice to Have)

### 1. PWA (Progressive Web App) 지원
- [ ] Service Worker 추가
- [ ] 오프라인 모드
- [ ] Web Push Notification

### 2. 모바일 기능 강화
- [ ] 생체 인증 (Face ID / Touch ID)
- [ ] QR 코드 스캔
- [ ] 음성 입력

### 3. 국제화 (i18n)
- [ ] 다국어 지원 (한국어, 영어)

### 4. 문서화
- [ ] API 문서 자동 생성
- [ ] 컴포넌트 Storybook

---

## 🐛 알려진 이슈

### 1. 모바일 출근 체크 실패 🔴 (긴급!)
- **문제**: `deployments.work_zone_id` 컬럼이 존재하지 않음
- **해결책**: deployment 조회 쿼리에서 `work_zone_id` 제거
- **상태**: 수정 필요

### 2. Case Sensitivity in Roles ⚠️
- **문제**: 역할 비교 시 대소문자 불일치
- **해결책**: 항상 `.toLowerCase()` 사용

### 3. 무한 로딩 문제 ⚠️
- **증상**: 일부 페이지에서 무한 로딩
- **조사 필요**: 빌드 최적화, React Query 설정

### 4. 파일 삭제 시 Storage 미삭제 ⚠️
- **문제**: DB에서만 삭제되고 Supabase Storage에서는 남아있음
- **해결책**: 삭제 API에서 Storage 파일도 함께 삭제

---

## 📚 주요 명령어

### 개발
```bash
pnpm dev              # 개발 서버 시작
pnpm build            # 프로덕션 빌드
pnpm start            # 프로덕션 서버 실행
pnpm check            # TypeScript 타입 체크
pnpm format           # Prettier 포맷팅
pnpm test             # Vitest 테스트
```

### 데이터베이스
```bash
pnpm db:push          # 마이그레이션 생성 및 적용
```

### Supabase MCP (AI Assistant 사용)
- 테이블 조회: `mcp_supabase_list_tables`
- SQL 실행: `mcp_supabase_execute_sql`
- 마이그레이션: `mcp_supabase_apply_migration`
- TypeScript 타입: `mcp_supabase_generate_typescript_types`
- 로그 확인: `mcp_supabase_get_logs`
- 보안 체크: `mcp_supabase_get_advisors`

---

## 🔗 중요 링크

### 문서
- [프로젝트 아키텍처](./CLAUDE.md)
- [완성 보고서](./최종완성보고서.md)
- [작업 가이드](./다음작업가이드.md)
- [배포 가이드](./DEPLOYMENT.md)

### 외부 문서
- [tRPC](https://trpc.io/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Supabase](https://supabase.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)

---

## 💡 다음 작업 시작 방법

1. **이 파일(`todos.md`)을 먼저 읽기**
2. **`CLAUDE.md` 읽기** - 아키텍처 이해
3. **우선순위 1부터 작업 시작** (현재: 모바일 출근 체크 에러 수정)
4. **MCP 도구를 적극 활용** (데이터베이스, 로그, 보안 체크)
5. **작업 완료 시 이 파일 업데이트**

---

## 📝 작업 요약

### 오늘 완료 (2025-11-08)
- ✅ GPS 기반 출근 체크 시스템 구현
- ✅ 작업 구역 관리 (원형/다각형)
- ✅ 출근 현황 모니터링 페이지
- ✅ 필터 기능 (BP 회사, Owner 회사, 사용자 종류, 이름, 날짜)
- ✅ Select 컴포넌트 빈 문자열 에러 수정
- ✅ check_ins-users 관계 에러 수정

### 발견된 문제
- 🔴 모바일 출근 체크 실패: `deployments.work_zone_id` 컬럼이 존재하지 않음

### 다음 작업 계획
- 🎯 **모바일 출근 체크 에러 수정** (긴급!)
- 🎯 **출근 체크 로직 개선** (work_zone_id 결정 방법)
- 🎨 **출근 현황 페이지 추가 기능** (실시간 새로고침, 지도 표시)

### 이후 우선순위
1. RLS (Row Level Security) 활성화
2. 성능 최적화
3. 보안 강화
4. 프로덕션 배포 준비

---

## 📊 작업 통계 (2025-11-09)

### 완료된 기능
- ✅ 모바일 출근 체크 에러 수정
- ✅ WebAuthn 생체 인증 시스템 (100%)
  - 서버 구현 (등록/인증/검증)
  - 클라이언트 구현 (설정 페이지 + 출근 통합)
  - FIDO2 표준 준수
  - 다중 플랫폼 지원

### 신규 파일
1. `server/webauthn-router.ts` - WebAuthn API (완전 구현)
2. `client/src/pages/mobile/BiometricSetup.tsx` - 생체 인증 설정 페이지

### 수정된 파일
1. `server/check-in-router.ts` - 출근 체크 에러 수정
2. `client/src/pages/mobile/WorkerMain.tsx` - 생체 인증 통합
3. `client/src/App.tsx` - BiometricSetup 라우트 추가
4. `package.json` - @simplewebauthn 라이브러리 추가

### 빌드 상태
- ✅ TypeScript 컴파일 성공
- ✅ Vite 프로덕션 빌드 성공

---

**마지막 업데이트**: 2025-11-11 (오후)
**다음 작업**: 워커-차량 매칭 및 GPS 위치 추적 시스템 개선
**Supabase MCP**: ✅ 연결됨 및 사용 가능
**Render MCP**: ✅ 연결됨 및 사용 가능
**오늘 작업 요약**:
- ✅ 출근 시간 표시 문제 완전 해결 (timestamptz 적용)
- ✅ WorkZones 페이지 레이아웃 문제 완전 해결 (DashboardLayout 이중 사용 제거)
