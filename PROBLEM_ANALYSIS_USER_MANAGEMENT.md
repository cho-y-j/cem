# 사용자 관리 시스템 근본 문제 분석

**작성일**: 2025-01-XX  
**심각도**: 🔴 **CRITICAL**

---

## 📋 발견된 문제 요약

### 1. 🔴 사용자 관리 (Admin) - Supabase Auth와 DB 동기화 문제

**증상:**
- Admin이 사용자 관리에서 Owner/BP/EP/Inspector를 생성/수정/삭제할 수 있음
- 하지만 실제 DB와 보여지는 것이 다름
- 삭제가 제대로 작동하지 않음

**근본 원인:**
1. **이중 저장소 문제**: 
   - Supabase Auth (인증용)
   - `users` 테이블 (애플리케이션 데이터용)
   - 두 저장소 간 동기화가 완벽하지 않음

2. **`getAllUsers()` 함수의 한계**:
   ```typescript
   // server/db.ts:144
   export async function getAllUsers(): Promise<User[]> {
     const supabase = getSupabase();
     const { data, error } = await supabase
       .from('users')
       .select('*');
     return toCamelCaseArray(data || []) as User[];
   }
   ```
   - `users` 테이블만 조회
   - Supabase Auth에만 있고 `users` 테이블에 없는 사용자는 표시되지 않음
   - 반대로 `users` 테이블에만 있고 Auth에 없는 사용자도 있을 수 있음

3. **삭제 로직의 불완전성**:
   ```typescript
   // server/users-router.ts:358-374
   const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
   const isUUID = uuidRegex.test(input.id);
   
   if (isUUID) {
     // Auth에서 삭제
   } else {
     console.log(`[Users] Skipping Auth delete (non-UUID user: ${input.id})`);
   }
   ```
   - UUID가 아닌 사용자는 Auth 삭제를 건너뛰어 불완전한 삭제 발생

---

### 2. 🔴 Worker 삭제 시 Foreign Key Constraint 에러

**증상:**
```
Unable to delete row as it is currently referenced by a foreign key constraint 
from the table `entry_request_items`.
Set an on delete behavior on the foreign key relation 
entry_request_items_paired_worker_id_fkey in the entry_request_items table 
to automatically respond when row(s) are being deleted in the workers table.
```

**근본 원인:**
1. **Foreign Key 제약 조건**:
   - `entry_request_items.paired_worker_id` → `workers.id` (Foreign Key)
   - `ON DELETE` 동작이 설정되지 않음 (기본값: `RESTRICT` 또는 `NO ACTION`)
   - Worker 삭제 시 참조하는 `entry_request_items` 레코드가 있으면 삭제 불가

2. **삭제 로직의 부재**:
   ```typescript
   // server/db.ts:1028-1040
   export async function deleteWorker(id: string) {
     const supabase = getSupabase();
     const { error } = await supabase
       .from('workers')
       .delete()
       .eq('id', id);
     // 관련 데이터 정리 없음!
   }
   ```

**해결 방안:**
1. **Option A: Foreign Key에 `ON DELETE CASCADE` 또는 `ON DELETE SET NULL` 추가**
   - 데이터베이스 레벨에서 자동 처리
   - 마이그레이션 필요

2. **Option B: 삭제 전 관련 데이터 정리**
   - `entry_request_items`에서 `paired_worker_id`를 `NULL`로 설정
   - 그 외 관련 테이블도 정리 (예: `deployments`, `check_ins` 등)

---

### 3. 🔴 Owner 화면에서 생성한 Worker가 보이지 않음

**증상:**
- `owner@test.com`에서 생성한 모든 Worker가 Owner 화면에 표시되지 않음

**근본 원인:**
1. **Worker 생성 시 `ownerId` 설정**:
   ```typescript
   // server/routers.ts:733
   await db.createWorker({ 
     id, 
     ...workerData,
     ownerId: ctx.user.id  // ✅ 올바르게 설정됨
   });
   ```

2. **Worker 조회 시 필터링 문제**:
   ```typescript
   // server/routers.ts:653-658
   } else if (role === "owner") {
     filters.ownerId = ctx.user.id;  // ✅ 필터 설정
     if (ctx.user.companyId) {
       filters.ownerCompanyId = filters.ownerCompanyId || ctx.user.companyId;
     }
   }
   ```

3. **`getWorkersWithFilters` 함수의 문제**:
   ```typescript
   // server/db.ts:930-931
   if (ownerCompanyId) {
     query = query.eq('owner_company_id', ownerCompanyId);  // ❌ 문제!
   }
   ```
   - `workers` 테이블에 `owner_company_id` 컬럼이 **존재하지 않음**!
   - 스키마 확인: `drizzle/schema.ts:182-196`
   - `workers` 테이블에는 `owner_id`만 있고 `owner_company_id`는 없음

4. **추가 문제: `workers` 테이블 구조**:
   ```typescript
   // drizzle/schema.ts:182-196
   export const workers = pgTable("workers", {
     id: varchar("id", { length: 64 }).primaryKey(),
     userId: varchar("user_id", { length: 64 }),
     workerTypeId: varchar("worker_type_id", { length: 64 }).notNull(),
     name: varchar("name", { length: 100 }).notNull(),
     ownerId: varchar("owner_id", { length: 64 }),  // ✅ 있음
     // owner_company_id: 없음! ❌
   });
   ```

**해결 방안:**
1. **Option A: `owner_company_id` 컬럼 추가**
   - `workers` 테이블에 `owner_company_id` 컬럼 추가
   - Worker 생성 시 `ctx.user.companyId`도 함께 저장
   - 마이그레이션 필요

2. **Option B: `ownerId`를 통해 `users.company_id` 조인**
   - `getWorkersWithFilters`에서 `ownerId`로 `users` 테이블 조인
   - `users.company_id`로 필터링

---

## 🔧 해결 방안 및 구현 완료

### ✅ Phase 1: Worker 삭제 문제 해결 (완료)

**구현 내용:**
1. ✅ `deleteWorker` 함수 개선 (`server/db.ts:1029-1061`):
   - 삭제 전 `entry_request_items`에서 `paired_worker_id`를 `NULL`로 설정
   - 에러 처리 개선 (throw Error로 변경)
   - 로그 추가

**수정 파일:**
- `server/db.ts`: `deleteWorker` 함수 개선

---

### ✅ Phase 2: Owner 화면 Worker 표시 문제 해결 (완료)

**구현 내용:**
1. ✅ `getWorkersWithFilters` 함수 수정 (`server/db.ts:925-941`):
   - `ownerCompanyId` 필터 제거 (컬럼이 존재하지 않음)
   - `ownerId` 필터만 사용하도록 수정
   - TODO 주석 추가 (향후 개선 방안)

**수정 파일:**
- `server/db.ts`: `getWorkersWithFilters` 함수 수정

**참고:**
- `workers` 테이블에 `owner_company_id` 컬럼이 없으므로 현재는 `ownerId` 필터만 사용
- 향후 필요 시 `owner_company_id` 컬럼 추가 또는 조인 방식으로 개선 가능

---

### ✅ Phase 3: 사용자 관리 시스템 개선 (부분 완료)

**구현 내용:**
1. ✅ 사용자 삭제 로직 개선 (`server/users-router.ts:358-391`):
   - UUID가 아닌 경우에도 이메일로 Auth 사용자 찾아 삭제 시도
   - Auth 삭제 실패해도 DB 삭제는 계속 진행 (레거시 사용자 대응)
   - 에러 처리 개선 (warn 로그로 변경, throw 제거)

**수정 파일:**
- `server/users-router.ts`: 사용자 삭제 로직 개선

**남은 작업:**
- ✅ `getAllUsers()` 함수 개선 (Supabase Auth와 동기화 확인) - **완료**
- ✅ 사용자 생성/수정 시 동기화 보장 (롤백 로직 이미 구현됨)

---

### ✅ Phase 4: 근본적인 스키마 및 제약 조건 개선 (완료)

**구현 내용:**
1. ✅ **Foreign Key 제약 조건 개선** (`drizzle/migrations-pg/0010_fix_foreign_key_constraints.sql`):
   - `entry_request_items.paired_worker_id`에 `ON DELETE SET NULL` 추가
   - `entry_request_items.paired_equipment_id`에도 동일하게 적용
   - 데이터베이스 레벨에서 자동 처리

2. ✅ **workers 테이블에 owner_company_id 컬럼 추가**:
   - 스키마 업데이트 (`drizzle/schema.ts`)
   - 마이그레이션 SQL 생성 (`drizzle/migrations-pg/0011_add_owner_company_id_to_workers.sql`)
   - 기존 데이터 마이그레이션 (owner_id를 통해 users.company_id 가져오기)
   - 인덱스 추가 (성능 향상)

3. ✅ **Worker 생성 시 owner_company_id 저장** (`server/routers.ts:734`):
   - Worker 생성 시 `ctx.user.companyId`도 함께 저장

4. ✅ **getWorkersWithFilters 함수 복원** (`server/db.ts:930-932`):
   - `owner_company_id` 필터 복원 (이제 컬럼이 존재함)

5. ✅ **getAllUsers() 함수 개선** (`server/db.ts:144-212`):
   - Supabase Auth와 users 테이블 동기화 확인
   - 불일치 사용자 감지 및 경고 로그

**수정 파일:**
- `drizzle/schema.ts`: workers 테이블에 ownerCompanyId 추가
- `drizzle/migrations-pg/0010_fix_foreign_key_constraints.sql`: Foreign Key 제약 조건 개선
- `drizzle/migrations-pg/0011_add_owner_company_id_to_workers.sql`: owner_company_id 컬럼 추가
- `server/db.ts`: getAllUsers, getWorkersWithFilters 개선
- `server/routers.ts`: Worker 생성 시 ownerCompanyId 저장

---

## 📊 우선순위

1. 🔴 **Phase 1: Worker 삭제 문제** (긴급)
2. 🔴 **Phase 2: Owner 화면 Worker 표시** (긴급)
3. 🟠 **Phase 3: 사용자 관리 시스템 개선** (중요)

---

## 🧪 테스트 계획

### Phase 1 테스트:
- [ ] Worker 삭제 시 `entry_request_items` 정리 확인
- [ ] Foreign Key 에러 없이 삭제되는지 확인

### Phase 2 테스트:
- [ ] Owner로 로그인하여 생성한 Worker가 목록에 표시되는지 확인
- [ ] 필터링이 올바르게 작동하는지 확인

### Phase 3 테스트:
- [ ] Admin에서 사용자 생성/수정/삭제가 올바르게 작동하는지 확인
- [ ] Supabase Auth와 `users` 테이블 동기화 확인

---

## 📝 참고 사항

- **Foreign Key 제약 조건 확인 필요**: Supabase에서 실제 제약 조건 확인
- **데이터 마이그레이션**: 기존 데이터에 대한 마이그레이션 스크립트 필요
- **롤백 계획**: 각 단계별 롤백 방법 준비

