# 건설현장 장비·인력 통합관리 시스템 배포 가이드

## 개요

본 시스템은 **Vercel**을 통한 프론트엔드 및 백엔드 배포와 **Supabase** 또는 **MySQL/TiDB** 데이터베이스를 사용하도록 설계되었습니다.

## 시스템 아키텍처

- **프론트엔드**: React + Vite (Vercel 배포)
- **백엔드**: Express + tRPC (Vercel Serverless Functions)
- **데이터베이스**: MySQL/TiDB (현재 템플릿 기본 설정) 또는 Supabase PostgreSQL
- **인증**: Manus OAuth (기본 제공)
- **파일 스토리지**: S3 호환 스토리지 (기본 제공)

## 1. Supabase 설정 (선택사항)

현재 프로젝트는 MySQL/TiDB를 기본으로 사용하지만, Supabase PostgreSQL로 전환하려면 다음 단계를 따르세요.

### 1.1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com) 계정 생성 및 로그인
2. 새 프로젝트 생성
3. 데이터베이스 비밀번호 설정

### 1.2. 데이터베이스 스키마 변경

Supabase는 PostgreSQL을 사용하므로 Drizzle ORM 스키마를 PostgreSQL용으로 변경해야 합니다.

**변경 필요 사항:**

1. `drizzle/schema.ts` 파일에서 MySQL 타입을 PostgreSQL 타입으로 변경
   - `mysqlTable` → `pgTable`
   - `mysqlEnum` → `pgEnum`
   - `varchar` → `varchar` (동일)
   - `timestamp` → `timestamp`
   - `datetime` → `timestamp`
   - `json` → `jsonb`

2. `drizzle.config.ts` 파일 수정
   ```typescript
   import { defineConfig } from "drizzle-kit";
   
   export default defineConfig({
     schema: "./drizzle/schema.ts",
     out: "./drizzle",
     dialect: "postgresql", // mysql → postgresql
     dbCredentials: {
       url: process.env.DATABASE_URL!,
     },
   });
   ```

3. 패키지 변경
   ```bash
   pnpm remove drizzle-orm mysql2
   pnpm add drizzle-orm postgres
   ```

4. `server/db.ts` 파일 수정
   ```typescript
   import { drizzle } from "drizzle-orm/postgres-js";
   import postgres from "postgres";
   
   let _db: ReturnType<typeof drizzle> | null = null;
   
   export async function getDb() {
     if (!_db && process.env.DATABASE_URL) {
       try {
         const client = postgres(process.env.DATABASE_URL);
         _db = drizzle(client);
       } catch (error) {
         console.warn("[Database] Failed to connect:", error);
         _db = null;
       }
     }
     return _db;
   }
   ```

### 1.3. 환경 변수 설정

Supabase 프로젝트 설정에서 다음 정보를 가져와 환경 변수로 설정합니다.

```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

## 2. Vercel 배포

### 2.1. Vercel 프로젝트 생성

1. [Vercel](https://vercel.com) 계정 생성 및 로그인
2. GitHub 저장소 연결
3. 프로젝트 Import

### 2.2. 환경 변수 설정

Vercel 프로젝트 설정에서 다음 환경 변수를 추가합니다:

**필수 환경 변수:**

```env
# 데이터베이스
DATABASE_URL=your_database_connection_string

# JWT 인증
JWT_SECRET=your_jwt_secret_key

# Manus OAuth (자동 주입됨)
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
OWNER_OPEN_ID=owner_open_id
OWNER_NAME=owner_name

# 앱 설정
VITE_APP_TITLE=건설현장 장비·인력 통합관리 시스템
VITE_APP_LOGO=your_logo_url

# 내장 API (자동 주입됨)
BUILT_IN_FORGE_API_URL=https://forge-api.manus.im
BUILT_IN_FORGE_API_KEY=your_api_key

# 분석 (선택사항)
VITE_ANALYTICS_ENDPOINT=your_analytics_endpoint
VITE_ANALYTICS_WEBSITE_ID=your_website_id
```

### 2.3. 빌드 설정

Vercel 프로젝트 설정에서 다음과 같이 빌드 설정을 구성합니다:

- **Framework Preset**: Other
- **Build Command**: `pnpm build`
- **Output Directory**: `client/dist`
- **Install Command**: `pnpm install`

### 2.4. 배포

1. GitHub에 코드 푸시
2. Vercel이 자동으로 빌드 및 배포 시작
3. 배포 완료 후 제공된 URL로 접속

## 3. 데이터베이스 마이그레이션

### 3.1. 로컬에서 마이그레이션 생성

```bash
pnpm db:push
```

이 명령어는 다음을 수행합니다:
1. `drizzle-kit generate`: 마이그레이션 SQL 파일 생성
2. `drizzle-kit migrate`: 데이터베이스에 마이그레이션 적용

### 3.2. 프로덕션 데이터베이스 마이그레이션

Vercel 배포 후 처음 한 번만 실행:

```bash
# 로컬에서 프로덕션 DATABASE_URL 사용
DATABASE_URL=your_production_db_url pnpm db:push
```

또는 Vercel CLI 사용:

```bash
vercel env pull .env.local
pnpm db:push
```

## 4. 초기 데이터 설정

### 4.1. 관리자 계정 설정

시스템 첫 로그인 시 프로젝트 소유자(OWNER_OPEN_ID)는 자동으로 `admin` 역할이 부여됩니다.

### 4.2. 마스터 데이터 입력

관리자로 로그인 후 다음 순서로 데이터를 입력합니다:

1. **장비 종류** (`/admin/equip-types`)
   - 예: 크레인, 펌프카, 굴삭기, 지게차 등

2. **인력 유형** (`/admin/worker-types`)
   - 예: 크레인 운전자, 용접공, 건설기계 조종사 등

3. **장비별 필수 서류** (장비 종류 상세 페이지)
   - 예: 건설기계등록증, 보험가입증명서 등

4. **인력별 필수 서류** (인력 유형 상세 페이지)
   - 예: 건설기계조종사면허증, 안전교육이수증 등

5. **안전점검표 템플릿** (`/admin/checklist-forms`)
   - JSON 형식으로 동적 점검표 양식 정의

## 5. 역할별 사용 가이드

### 5.1. 관리자 (admin)

- 시스템 전체 설정 관리
- 사용자 역할 부여
- 마스터 데이터 관리

### 5.2. 장비 임대사업자 (owner)

- 장비/인력 등록
- 서류 업로드
- 운용 현황 모니터링

### 5.3. 협력사 (bp)

- 서류 승인/반려
- 작업 확인서 승인
- 정산 관리

### 5.4. 운영사 (ep)

- 최종 반입 승인
- 전체 현황 모니터링

### 5.5. 운전자 (worker)

- 작업 확인서 제출
- 근태 관리

### 5.6. 안전점검원 (inspector)

- 안전점검 수행
- 점검 결과 기록

## 6. 문제 해결

### 6.1. 데이터베이스 연결 오류

- `DATABASE_URL` 환경 변수가 올바르게 설정되었는지 확인
- 데이터베이스 서버가 실행 중인지 확인
- 방화벽 설정 확인 (Vercel IP 허용)

### 6.2. 빌드 오류

- `pnpm install` 실행하여 의존성 재설치
- Node.js 버전 확인 (권장: v18 이상)
- TypeScript 오류 확인 및 수정

### 6.3. 인증 오류

- Manus OAuth 설정 확인
- `JWT_SECRET` 환경 변수 확인
- 쿠키 설정 확인 (HTTPS 필수)

## 7. 추가 기능 구현 가이드

### 7.1. 파일 업로드

현재 S3 호환 스토리지가 기본 제공됩니다. 서류 업로드 시:

```typescript
import { storagePut } from "./server/storage";

const { key, url } = await storagePut(
  `documents/${Date.now()}-file.pdf`,
  fileBuffer,
  "application/pdf"
);
```

### 7.2. 알림 기능

만료 예정 서류 알림을 위해 Vercel Cron Jobs 사용:

1. `vercel.json`에 cron 설정 추가
2. `/api/cron/check-expiring-docs` 엔드포인트 생성
3. 이메일/SMS 발송 로직 구현

### 7.3. PDF 생성

작업 확인서 PDF 생성:

```bash
pnpm add jspdf
```

```typescript
import jsPDF from "jspdf";

const doc = new jsPDF();
doc.text("작업 확인서", 10, 10);
doc.save("work-journal.pdf");
```

## 8. 보안 고려사항

- 모든 API 엔드포인트에 인증 적용 (`protectedProcedure`)
- 역할 기반 접근 제어 (RBAC) 구현
- 민감한 데이터 암호화
- HTTPS 사용 (Vercel 자동 제공)
- 환경 변수로 비밀 정보 관리

## 9. 성능 최적화

- 데이터베이스 인덱스 추가
- 이미지 최적화 (WebP 형식 사용)
- 코드 스플리팅 (Vite 자동 지원)
- CDN 활용 (Vercel Edge Network)

## 10. 지원 및 문의

추가 지원이 필요한 경우:
- GitHub Issues
- 이메일: support@example.com
- 문서: https://docs.example.com

---

**배포 체크리스트:**

- [ ] Supabase 또는 데이터베이스 프로젝트 생성
- [ ] 데이터베이스 연결 문자열 확인
- [ ] Vercel 프로젝트 생성
- [ ] 환경 변수 설정
- [ ] 빌드 설정 확인
- [ ] 데이터베이스 마이그레이션 실행
- [ ] 관리자 계정 확인
- [ ] 마스터 데이터 입력
- [ ] 기능 테스트 완료
- [ ] 프로덕션 배포

**참고 자료:**
- [Vercel 문서](https://vercel.com/docs)
- [Supabase 문서](https://supabase.com/docs)
- [Drizzle ORM 문서](https://orm.drizzle.team/docs/overview)
- [tRPC 문서](https://trpc.io/docs)

