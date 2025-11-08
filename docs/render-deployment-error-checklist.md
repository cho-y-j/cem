# Render 배포 에러 체크리스트

**작성일**: 2025-11-08
**프로젝트**: GPS 출근 체크 시스템 배포

---

## 🔍 체크리스트

### 1. 빌드 단계 에러

#### 1.1 pnpm-lock.yaml 동기화
- [ ] `ERR_PNPM_OUTDATED_LOCKFILE` 에러 확인
- [ ] 해결: 로컬에서 `pnpm install` 실행 후 커밋/푸시

#### 1.2 의존성 설치 실패
- [ ] `xlsx` 패키지 설치 실패 확인
- [ ] `@vis.gl/react-google-maps` 패키지 설치 실패 확인
- [ ] 해결: `package.json`의 `dependencies` 확인

#### 1.3 TypeScript 컴파일 에러
- [ ] `tsc --noEmit` 에러 확인
- [ ] 해결: 로컬에서 `pnpm check` 실행하여 에러 수정

#### 1.4 Vite 빌드 에러
- [ ] `vite build` 실패 확인
- [ ] 해결: 로컬에서 `pnpm build` 실행하여 에러 확인

---

### 2. 런타임 에러

#### 2.1 모듈 import 에러

**xlsx 모듈 에러 (가능성 높음)**
```
Error: Cannot find module 'xlsx'
또는
Error: require() of ES Module
```

**해결 방법**:
```typescript
// server/check-in-router.ts
// 현재:
import * as XLSX from "xlsx";

// 대안 1: 동적 import 사용
const XLSX = await import("xlsx");

// 대안 2: createRequire 사용
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
```

**확인 사항**:
- [ ] `xlsx`가 `dependencies`에 있는지 확인 (✅ 확인됨)
- [ ] `package.json`에 `"type": "module"` 확인 (✅ 확인됨)
- [ ] Render 빌드 로그에서 `xlsx` 설치 확인

#### 2.2 라우터 등록 에러

**에러 메시지**:
```
Cannot find module './check-in-router'
또는
checkInRouter is not defined
```

**확인 사항**:
- [ ] `server/check-in-router.ts` 파일 존재 확인 (✅ 확인됨)
- [ ] `server/routers.ts`에서 import 확인 (✅ 확인됨)
- [ ] `server/routers.ts`에서 라우터 등록 확인 (✅ 확인됨)

#### 2.3 데이터베이스 테이블 없음

**에러 메시지**:
```
relation "work_zones" does not exist
relation "check_ins" does not exist
relation "webauthn_credentials" does not exist
```

**해결 방법**:
1. 마이그레이션 실행:
   ```bash
   pnpm db:push
   ```

2. 또는 SQL 직접 실행:
   ```sql
   -- drizzle/schema.ts를 기반으로 테이블 생성
   ```

**확인 사항**:
- [ ] `drizzle/schema.ts`에 테이블 정의 확인 (✅ 확인됨)
- [ ] 마이그레이션 파일 생성 확인
- [ ] Render 환경에서 마이그레이션 실행 여부

---

### 3. 환경 변수 에러

#### 3.1 필수 환경 변수 누락

**확인할 환경 변수**:
- [ ] `DATABASE_URL` - Supabase 연결 문자열
- [ ] `JWT_SECRET` - JWT 토큰 시크릿
- [ ] `VITE_GOOGLE_MAPS_API_KEY` - Google Maps API 키 (작업 구역 관리용)

**에러 메시지**:
```
DATABASE_URL is not defined
Cannot connect to database
```

---

### 4. 파일 경로 에러

#### 4.1 정적 파일 경로

**에러 메시지**:
```
Could not find the build directory: /opt/render/project/src/server/_core/public
```

**해결**: ✅ 이미 수정됨 (`server/_core/vite.ts`)

---

### 5. 특정 에러 패턴

#### 5.1 xlsx ESM/CommonJS 호환성

**증상**: 
- `XLSX.write is not a function`
- `XLSX.utils is undefined`

**해결 방법 1**: 동적 import 사용
```typescript
// server/check-in-router.ts 수정
export const checkInRouter = router({
  // ... 다른 프로시저들 ...
  
  exportToExcel: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      // 동적 import 사용
      const XLSX = await import("xlsx");
      
      // 나머지 코드는 동일
      const checkIns = await db.getCheckIns({
        startDate: input.startDate,
        endDate: input.endDate,
      });
      
      // ... 엑셀 생성 코드 ...
    }),
});
```

**해결 방법 2**: createRequire 사용
```typescript
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
```

#### 5.2 Google Maps API 키

**에러 메시지**:
```
Google Maps API key is not set
```

**해결**: Render 환경 변수에 `VITE_GOOGLE_MAPS_API_KEY` 추가

---

## 📋 배포 로그 확인 방법

### Render 대시보드에서:
1. 프로젝트 선택
2. "Events" 또는 "Logs" 탭 클릭
3. 최근 배포 로그 확인

### 확인할 항목:
- [ ] 빌드 단계: `pnpm install` 성공 여부
- [ ] 빌드 단계: `pnpm run build` 성공 여부
- [ ] 런타임: 서버 시작 에러
- [ ] 런타임: 첫 API 호출 에러

---

## 🚀 빠른 수정 가이드

### 가장 가능성 높은 에러: xlsx 모듈

**즉시 수정**:
```typescript
// server/check-in-router.ts
// 6번째 줄 수정
// 변경 전:
import * as XLSX from "xlsx";

// 변경 후:
// 파일 상단에서 import 제거하고, exportToExcel 함수 내부에서 동적 import 사용
```

---

## 📝 배포 로그 공유 방법

배포 로그를 확인하신 후, 다음 정보를 공유해주세요:

1. **빌드 단계 에러** (있다면):
   ```
   [에러 메시지 복사]
   ```

2. **런타임 에러** (있다면):
   ```
   [에러 메시지 복사]
   ```

3. **서버 시작 로그**:
   ```
   [로그 복사]
   ```

---

## ✅ 확인 완료 항목

- [x] `xlsx` 패키지가 `dependencies`에 있음
- [x] 라우터가 `server/routers.ts`에 등록됨
- [x] 스키마에 테이블 정의가 있음
- [x] 정적 파일 경로 수정됨

---

**다음 단계**: 배포 로그를 공유해주시면 구체적인 에러를 분석하겠습니다!

