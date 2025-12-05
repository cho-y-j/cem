# Equipment Owner 필터링 테스트 가이드

**테스트 일자**: 2025-01-XX  
**마이그레이션**: ✅ `0012_add_owner_company_id_to_equipment.sql` 적용 완료

---

## 🧪 테스트 체크리스트

### 1. 데이터베이스 검증

#### 1.1 컬럼 존재 확인
```sql
-- equipment 테이블에 owner_company_id 컬럼이 있는지 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'equipment'
  AND column_name = 'owner_company_id';
```

**예상 결과**: `owner_company_id | varchar | YES` 반환

#### 1.2 인덱스 확인
```sql
-- 인덱스가 생성되었는지 확인
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'equipment'
  AND indexname LIKE '%owner_company%'
ORDER BY indexname;
```

**예상 결과**: 
- `idx_equipment_owner_company_id`
- `idx_equipment_owner_id_company_id`

#### 1.3 데이터 마이그레이션 확인
```sql
-- 마이그레이션된 데이터 확인
SELECT 
    COUNT(*) as total_equipment,
    COUNT(owner_id) as equipment_with_owner_id,
    COUNT(owner_company_id) as equipment_with_owner_company_id,
    COUNT(CASE WHEN owner_id IS NOT NULL AND owner_company_id IS NULL THEN 1 END) as needs_migration
FROM equipment;
```

**예상 결과**: `needs_migration`이 0이어야 함 (모든 owner_id가 있는 equipment에 owner_company_id가 설정됨)

#### 1.4 데이터 정확성 확인
```sql
-- owner_id와 owner_company_id가 올바르게 매칭되는지 확인
SELECT 
    e.id,
    e.reg_num,
    e.owner_id,
    e.owner_company_id,
    u.company_id as user_company_id,
    CASE 
        WHEN e.owner_company_id = u.company_id THEN '✅ 일치'
        WHEN e.owner_company_id IS NULL AND u.company_id IS NULL THEN '⚠️ 둘 다 NULL'
        WHEN e.owner_company_id IS NULL THEN '❌ owner_company_id 누락'
        ELSE '❌ 불일치'
    END as status
FROM equipment e
LEFT JOIN users u ON e.owner_id = u.id
WHERE e.owner_id IS NOT NULL
ORDER BY status, e.reg_num
LIMIT 20;
```

**예상 결과**: 모든 레코드가 '✅ 일치' 또는 '⚠️ 둘 다 NULL'이어야 함

---

### 2. 기능 테스트

#### 2.1 Owner 계정으로 장비 목록 조회

**테스트 시나리오**:
1. Owner 계정으로 로그인 (예: `owner@test.com`)
2. 장비 관리 페이지 접속 (`/equipment`)
3. 생성한 장비가 목록에 표시되는지 확인

**예상 결과**:
- ✅ Owner가 생성한 모든 장비가 목록에 표시됨
- ✅ 다른 Owner의 장비는 표시되지 않음
- ✅ 필터링이 올바르게 작동함

#### 2.2 새 장비 생성 테스트

**테스트 시나리오**:
1. Owner 계정으로 로그인
2. 장비 관리 페이지에서 "장비 등록" 클릭
3. 장비 정보 입력 후 저장
4. 데이터베이스에서 확인:
   ```sql
   SELECT id, reg_num, owner_id, owner_company_id
   FROM equipment
   WHERE reg_num = '생성한_차량번호'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

**예상 결과**:
- ✅ `owner_id`가 현재 로그인한 Owner의 ID와 일치
- ✅ `owner_company_id`가 현재 로그인한 Owner의 `company_id`와 일치
- ✅ 장비 목록에 즉시 표시됨

#### 2.3 장비 필터링 테스트

**테스트 시나리오**:
1. Owner 계정으로 로그인
2. 장비 관리 페이지에서 Owner 회사 필터 선택
3. 필터 변경 시 목록이 올바르게 업데이트되는지 확인

**예상 결과**:
- ✅ 선택한 Owner 회사의 장비만 표시됨
- ✅ 필터 변경 시 즉시 반영됨

#### 2.4 Admin 계정 테스트

**테스트 시나리오**:
1. Admin 계정으로 로그인
2. 장비 관리 페이지 접속
3. 모든 장비가 표시되는지 확인
4. Owner 회사 필터로 특정 회사 장비만 필터링 가능한지 확인

**예상 결과**:
- ✅ 모든 장비가 표시됨 (필터 없을 때)
- ✅ Owner 회사 필터로 특정 회사 장비만 필터링 가능

---

### 3. 에러 케이스 테스트

#### 3.1 owner_id는 있지만 owner_company_id가 NULL인 경우

**테스트 시나리오**:
```sql
-- 테스트 데이터 생성 (owner_company_id가 NULL인 장비)
UPDATE equipment 
SET owner_company_id = NULL 
WHERE id = '테스트_장비_ID'
LIMIT 1;
```

1. Owner 계정으로 로그인
2. 장비 관리 페이지 접속
3. 해당 장비가 표시되는지 확인

**예상 결과**:
- ⚠️ `owner_company_id`가 NULL인 경우 `ownerId` 필터로 대체 작동해야 함
- 또는 마이그레이션 스크립트를 다시 실행하여 NULL 값 채우기

---

## 🔍 문제 해결

### 문제 1: 장비가 여전히 표시되지 않음

**확인 사항**:
1. `owner_company_id`가 올바르게 설정되었는지 확인
2. 브라우저 캐시 클리어 및 새로고침
3. 서버 로그 확인 (필터링 쿼리 에러 확인)

**해결 방법**:
```sql
-- owner_company_id가 NULL인 장비 수동 업데이트
UPDATE equipment e
SET owner_company_id = u.company_id
FROM users u
WHERE e.owner_id = u.id
  AND e.owner_company_id IS NULL
  AND u.company_id IS NOT NULL;
```

### 문제 2: 새로 생성한 장비가 표시되지 않음

**확인 사항**:
1. 장비 생성 시 `owner_company_id`가 저장되었는지 확인
2. 서버 로그에서 장비 생성 쿼리 확인

**해결 방법**:
- 코드가 최신 버전으로 배포되었는지 확인
- 장비 생성 후 데이터베이스에서 직접 확인

---

## ✅ 테스트 완료 체크리스트

- [ ] 데이터베이스 컬럼 및 인덱스 확인
- [ ] 데이터 마이그레이션 확인
- [ ] Owner 계정으로 장비 목록 조회 테스트
- [ ] 새 장비 생성 테스트
- [ ] 장비 필터링 테스트
- [ ] Admin 계정 테스트
- [ ] 에러 케이스 테스트

---

## 📊 테스트 결과 기록

### 데이터베이스 검증 결과
- 컬럼 존재: ✅ / ❌
- 인덱스 생성: ✅ / ❌
- 데이터 마이그레이션: ✅ / ❌ (마이그레이션된 레코드 수: ___)

### 기능 테스트 결과
- Owner 장비 목록 조회: ✅ / ❌
- 새 장비 생성: ✅ / ❌
- 장비 필터링: ✅ / ❌
- Admin 계정 테스트: ✅ / ❌

### 발견된 문제
1. 
2. 
3. 

---

**테스트 담당자**: ________  
**테스트 일자**: 2025-01-XX  
**테스트 결과**: ✅ 통과 / ❌ 실패

