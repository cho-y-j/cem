# 로컬 서버 디버깅 가이드

## 로컬 서버 실행 방법

### 1. 의존성 설치 (이미 설치되어 있다면 생략)
```bash
pnpm install
```

### 2. 환경 변수 확인
`.env` 파일이 있는지 확인하고, Supabase 연결 정보가 올바른지 확인하세요.

### 3. 로컬 서버 실행
```bash
pnpm dev
```

서버가 `http://localhost:3000` (또는 사용 가능한 포트)에서 실행됩니다.

## 출근 대상 0 문제 디버깅

### 로그 확인 방법

1. **터미널에서 로그 확인**
   - `pnpm dev` 실행 후 터미널에서 로그를 실시간으로 확인할 수 있습니다.
   - 출근 현황 페이지를 열면 다음과 같은 로그가 출력됩니다:

```
[getTodayStats] ===== Deployment 조회 결과 =====
[getTodayStats] User role: ep
[getTodayStats] User company ID: company-aINGYYBiR9rMApb5m9gui
[getTodayStats] Active deployments count: 2
[getTodayStats] Active deployments data: [...]
[getTodayStats] ===== 출근 대상 계산 시작 =====
[getTodayStats] EP Company IDs: [...]
[getTodayStats] Work zones query result: {...}
[getTodayStats] Valid EP Company IDs (work_zone이 있는): [...]
[getTodayStats] Deployment worker_id: ep_company_id=..., valid=true/false
[getTodayStats] ===== 출근 대상 계산 결과 =====
[getTodayStats] Expected workers: 2
```

### 확인할 사항

1. **Deployment 조회 단계**
   - `Active deployments count`가 0이면 → deployment 조회 문제
   - `Deployment query error`가 있으면 → 쿼리 오류

2. **Work Zone 조회 단계**
   - `Work zones found`가 0이면 → work_zone 조회 문제
   - `Work zones query result`에 error가 있으면 → 쿼리 오류

3. **필터링 단계**
   - 각 deployment의 `valid=true/false` 확인
   - `ep_company_id`가 올바른지 확인
   - `validEpCompanyIds`에 포함되어 있는지 확인

### 예상되는 문제점

1. **Deployment 조회 실패**
   - 권한별 필터링 문제
   - `bp_company_id`, `ep_company_id`, `owner_id` 필터링 오류

2. **Work Zone 조회 실패**
   - `is_active` 필터링 문제
   - `company_id` 매칭 문제

3. **필터링 로직 오류**
   - `ep_company_id`가 NULL인 경우
   - `validEpCompanyIds`에 포함되지 않는 경우

## 테스트 시나리오

### EP로 로그인 테스트
1. `ep@test.com`으로 로그인
2. 출근 현황 페이지 접속
3. 터미널 로그 확인:
   - `User role: ep`
   - `User company ID: company-aINGYYBiR9rMApb5m9gui`
   - `Active deployments count: 2` (예상)
   - `Work zones found: 1` (예상)
   - `Expected workers: 2` (예상)

### BP로 로그인 테스트
1. `bp@test.com`으로 로그인
2. 출근 현황 페이지 접속
3. 터미널 로그 확인:
   - `User role: bp`
   - `User company ID: company-tSMrSTYp2-3TLwYjlEoLg`
   - `Active deployments count: 2` (예상)
   - `Work zones found: 1` (예상)
   - `Expected workers: 2` (예상)

### Owner로 로그인 테스트
1. `owner@test.com`으로 로그인
2. 출근 현황 페이지 접속
3. 터미널 로그 확인:
   - `User role: owner`
   - `User ID: 7a66d65b-432b-4984-8e95-0b5e3d0821e8`
   - `Active deployments count: 2` (예상)
   - `Work zones found: 1` (예상)
   - `Expected workers: 2` (예상)

## 문제 해결 후

원인을 찾아 수정한 후:
1. 디버깅 로그를 제거하거나 간소화
2. 테스트 완료 확인
3. GitHub에 커밋 및 푸시

