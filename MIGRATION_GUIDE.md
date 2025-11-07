# 데이터베이스 마이그레이션 가이드

**작성일**: 2025-10-25  
**목적**: Companies 테이블 및 위치 추적 기능 추가

---

## 📋 마이그레이션 방법

### 방법 1: Supabase SQL Editor 사용 (추천)

1. Supabase 대시보드 접속: https://zlgehckxiuhjpfjlaycf.supabase.co
2. 좌측 메뉴에서 "SQL Editor" 클릭
3. "New query" 클릭
4. `supabase_companies_migration.sql` 파일 내용 복사 & 붙여넣기
5. "Run" 버튼 클릭
6. 성공 메시지 확인

### 방법 2: psql 명령어 사용

```bash
psql "postgresql://postgres:cho2239148!@db.zlgehckxiuhjpfjlaycf.supabase.co:5432/postgres" \
  -f supabase_companies_migration.sql
```

---

## 📊 생성/수정되는 테이블

### 1. companies (신규)
- Owner/BP/EP 회사 정보 관리
- company_type: 'owner', 'bp', 'ep'

### 2. equipment (수정)
- `owner_company_id` 추가: 장비 소유 회사
- `assigned_worker_id` 추가: 배정된 운전자

### 3. workers (수정)
- `owner_company_id` 추가: 인력 소속 회사

### 4. entry_requests (수정)
- `owner_company_id`: 요청한 Owner 회사
- `owner_user_id`: 요청한 사용자
- `target_bp_company_id`: 요청을 받을 BP 회사
- `bp_approved_user_id`: BP 승인자
- `bp_work_plan_url`: BP가 업로드한 작업계획서
- `target_ep_company_id`: 최종 승인할 EP 회사
- `ep_approved_user_id`: EP 승인자
- 기타 승인/반려 관련 컬럼

### 5. location_logs (신규)
- 운전자/장비 위치 추적
- latitude, longitude, accuracy
- logged_at: 위치 기록 시간

### 6. emergency_alerts (신규)
- 긴급 상황 알림
- alert_type: 'emergency', 'accident', 'breakdown'
- status: 'active', 'resolved', 'false_alarm'

### 7. work_sessions (신규)
- 작업 세션 기록
- session_type: 'work', 'break', 'overtime'
- start_time, end_time, duration_minutes

### 8. entry_request_items (수정)
- `request_type` 추가: 'equipment_with_worker', 'equipment_only', 'worker_only'

---

## ✅ 마이그레이션 확인

마이그레이션 후 다음 쿼리로 확인:

```sql
-- 테이블 존재 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('companies', 'location_logs', 'emergency_alerts', 'work_sessions');

-- Companies 테이블 구조 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'companies';

-- Equipment 테이블 새 컬럼 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'equipment' 
  AND column_name IN ('owner_company_id', 'assigned_worker_id');
```

---

## 🔄 롤백 (필요시)

```sql
-- 새로 추가된 테이블 삭제
DROP TABLE IF EXISTS emergency_alerts CASCADE;
DROP TABLE IF EXISTS location_logs CASCADE;
DROP TABLE IF EXISTS work_sessions CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- Equipment 테이블 컬럼 제거
ALTER TABLE equipment 
  DROP COLUMN IF EXISTS owner_company_id,
  DROP COLUMN IF EXISTS assigned_worker_id;

-- Workers 테이블 컬럼 제거
ALTER TABLE workers 
  DROP COLUMN IF EXISTS owner_company_id;

-- Entry Requests 테이블 컬럼 제거
ALTER TABLE entry_requests
  DROP COLUMN IF EXISTS owner_company_id,
  DROP COLUMN IF EXISTS owner_user_id,
  DROP COLUMN IF EXISTS target_bp_company_id,
  DROP COLUMN IF EXISTS bp_approved_user_id,
  DROP COLUMN IF EXISTS bp_work_plan_url,
  DROP COLUMN IF EXISTS target_ep_company_id,
  DROP COLUMN IF EXISTS ep_approved_user_id;
```

---

## 📝 다음 단계

마이그레이션 완료 후:
1. 백엔드 API 구현 (Companies CRUD)
2. 프론트엔드 회사 관리 페이지 추가
3. 반입 요청 프로세스 수정
4. 위치 추적 기능 구현
5. 긴급 상황 알림 구현

---

**작성자**: Manus AI

