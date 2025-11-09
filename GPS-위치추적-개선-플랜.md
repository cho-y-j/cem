# GPS 기반 위치 추적 시스템 개선 작업 플랜

**작업 시작일**: 2025-11-09  
**작업 상태**: 🔄 진행 중

---

## 📋 현재 상태 분석

### ✅ 구현된 기능
1. **기본 GPS 전송 기능**
   - `server/location-router.ts`: 위치 기록 API
   - `server/mobile-router.ts`: `sendLocation` API
   - `client/src/pages/mobile/WorkerMain.tsx`: GPS 전송 로직 (5분 간격)
   - `client/src/pages/LocationTracking.tsx`: 실시간 위치 지도

2. **위치 추적 데이터베이스**
   - `location_logs` 테이블: 위치 이력 저장
   - 최근 10분 이내 위치만 "활성"으로 조회

3. **필터링 기능 (부분 구현)**
   - 오너사별, BP사별, EP사별 필터
   - 차량번호 검색

### ⚠️ 발견된 문제
1. **GPS 전송 간격 고정**: 5분으로 하드코딩되어 있음
2. **휴식 중 GPS 전송**: 작업 세션 상태와 관계없이 GPS 전송 계속됨
3. **작업 종료 후 GPS 전송**: 작업 종료 후에도 GPS 전송 계속됨
4. **위치 추적 에러**: 사용자 보고 (구체적 에러 로그 확인 필요)
5. **필터링 기능 부족**: 차종별, 운전자별 필터 없음
6. **이동 동선 분석**: 미구현

---

## 🎯 개선 목표

### Phase 1: GPS 전송 로직 개선 (우선순위 1)
- [ ] GPS 전송 간격 설정 기능 (관리자 조정 가능)
- [ ] 휴식 중 GPS 전송 중지
- [ ] 작업 종료 후 GPS 전송 중지

### Phase 2: 위치 추적 에러 수정 (우선순위 2)
- [ ] 에러 로그 분석
- [ ] GPS 수신 실패 시 처리 로직 개선
- [ ] 네트워크 오류 시 재시도 로직 추가

### Phase 3: 지도 및 필터링 개선 (우선순위 3)
- [ ] 지도에 차량과 운전자 정보 표시 개선
- [ ] 차종별 필터 추가
- [ ] 운전자별 필터 추가
- [ ] 마커 아이콘 차별화

### Phase 4: 이동 동선 추적 및 분석 (우선순위 4)
- [ ] 위치 이력 조회 API 개선
- [ ] 시간대별 이동 경로 시각화 (Polyline)
- [ ] 이동 거리 계산
- [ ] 체류 시간 분석
- [ ] 분석 리포트 생성

---

## 📝 상세 작업 단계

### Step 1: GPS 전송 간격 설정 기능 구현

**작업 내용:**
1. 데이터베이스 스키마 확인/추가
   - `system_settings` 테이블 확인
   - `gps_tracking_interval_minutes` 컬럼 추가 (기본값: 5)

2. 설정 API 구현
   - `system.getGpsInterval` - GPS 전송 간격 조회
   - `system.setGpsInterval` - GPS 전송 간격 설정 (Admin/EP만 가능)

3. 워커 앱에서 설정값 읽기
   - `WorkerMain.tsx`에서 설정값 조회
   - 동적으로 GPS 전송 간격 설정

**예상 소요 시간:** 1-2시간

---

### Step 2: 휴식 중 및 작업 종료 후 GPS 전송 중지

**작업 내용:**
1. 작업 세션 상태 확인 로직 추가
   - `currentSession.status` 확인
   - `workStatus === "working"` 또는 `"overtime"`: GPS 전송
   - `workStatus === "break"`: GPS 전송 중지
   - `workStatus === "completed"` 또는 세션 없음: GPS 전송 중지

2. GPS 전송 로직 개선
   - `startLocationTracking()`: 작업 시작 시만 호출
   - `stopLocationTracking()`: 휴식 시작, 작업 종료 시 호출
   - 휴식 종료 시 GPS 전송 재개

3. 작업 세션 상태 변경 감지
   - `currentSession` 변경 시 GPS 전송 상태 업데이트

**예상 소요 시간:** 1-2시간

---

### Step 3: 위치 추적 에러 수정

**작업 내용:**
1. 에러 로그 분석
   - Render 로그 확인
   - 클라이언트 콘솔 에러 확인

2. 에러 처리 로직 개선
   - GPS 수신 실패 시 재시도 로직
   - 네트워크 오류 시 재시도 로직
   - 에러 메시지 개선

**예상 소요 시간:** 1-2시간

---

### Step 4: 지도 및 필터링 개선

**작업 내용:**
1. 지도 마커 개선
   - 차량 정보와 운전자 정보 함께 표시
   - 마커 아이콘 차별화 (차종별, 상태별)
   - 마커 클릭 시 상세 정보 표시

2. 필터링 기능 추가
   - 차종별 필터 (장비 타입별)
   - 운전자별 필터
   - 다중 필터 조합 지원

**예상 소요 시간:** 2-3시간

---

### Step 5: 이동 동선 추적 및 분석

**작업 내용:**
1. 위치 이력 조회 API 개선
   - `location.getHistory` 개선
   - 시간대별 필터링 지원

2. 이동 경로 시각화
   - Google Maps Polyline 사용
   - 시간대별 경로 표시

3. 이동 거리 및 체류 시간 계산
   - Haversine 공식 활용
   - 체류 시간 분석

4. 분석 리포트 생성
   - 일별/주별/월별 리포트
   - Excel/PDF 다운로드

**예상 소요 시간:** 3-4시간

---

## ✅ 체크리스트

### Phase 1: GPS 전송 로직 개선
- [ ] Step 1-1: 데이터베이스 스키마 확인/추가
- [ ] Step 1-2: 설정 API 구현
- [ ] Step 1-3: 워커 앱에서 설정값 읽기
- [ ] Step 2-1: 작업 세션 상태 확인 로직 추가
- [ ] Step 2-2: GPS 전송 로직 개선
- [ ] Step 2-3: 작업 세션 상태 변경 감지

### Phase 2: 위치 추적 에러 수정
- [ ] Step 3-1: 에러 로그 분석
- [ ] Step 3-2: 에러 처리 로직 개선

### Phase 3: 지도 및 필터링 개선
- [ ] Step 4-1: 지도 마커 개선
- [ ] Step 4-2: 필터링 기능 추가

### Phase 4: 이동 동선 추적 및 분석
- [ ] Step 5-1: 위치 이력 조회 API 개선
- [ ] Step 5-2: 이동 경로 시각화
- [ ] Step 5-3: 이동 거리 및 체류 시간 계산
- [ ] Step 5-4: 분석 리포트 생성

---

## 📊 예상 소요 시간

- **Phase 1**: 2-4시간
- **Phase 2**: 1-2시간
- **Phase 3**: 2-3시간
- **Phase 4**: 3-4시간

**전체 예상 소요 시간**: 8-13시간

---

## 🔗 관련 파일

### 서버
- `server/location-router.ts` - 위치 추적 API
- `server/mobile-router.ts` - 모바일 API (GPS 전송)
- `server/db.ts` - 데이터베이스 함수
- `server/system-router.ts` - 시스템 설정 API (추가 필요)

### 클라이언트
- `client/src/pages/mobile/WorkerMain.tsx` - 워커 메인 페이지
- `client/src/pages/LocationTracking.tsx` - 위치 추적 페이지

### 데이터베이스
- `drizzle/schema.ts` - 스키마 정의
- `location_logs` 테이블

---

**작업 시작**: 2025-11-09

