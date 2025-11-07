# 건설현장 장비·인력 통합관리 시스템

건설 현장에서 운영되는 다양한 임대 장비와 관련 인력을 효율적으로 관리하기 위한 통합 플랫폼입니다.

## 주요 기능

### 1. 역할 기반 접근 제어 (RBAC)

시스템은 6가지 사용자 역할을 지원합니다:

- **관리자 (admin)**: 시스템 전체 설정 및 마스터 데이터 관리
- **장비 임대사업자 (owner)**: 장비/인력 등록 및 서류 관리
- **협력사 (bp)**: 서류 승인 및 작업 확인서 검토
- **운영사 (ep)**: 최종 반입 승인 및 전체 현황 모니터링
- **운전자 (worker)**: 작업 확인서 제출 및 근태 관리
- **안전점검원 (inspector)**: 안전점검 수행 및 결과 기록

### 2. 유연한 마스터 데이터 관리

- **장비 종류 관리**: 크레인, 펌프카, 굴삭기 등 다양한 장비 종류 정의
- **인력 유형 관리**: 크레인 운전자, 용접공 등 인력 유형 정의
- **필수 서류 정의**: 장비/인력 유형별 필수 서류 및 만료일 설정
- **안전점검표 템플릿**: JSON 기반 동적 점검표 양식 생성

### 3. 서류 만료일 추적

- 서류별 만료일 자동 추적
- 만료 예정 서류 대시보드 (30일, 7일, 당일 알림)
- 만료 현황 실시간 모니터링

### 4. 안전점검 관리

- 장비 종류별 맞춤형 안전점검표
- 모바일 친화적 점검 인터페이스
- 점검 결과 JSON 저장 및 이력 관리

### 5. 작업 확인서 관리

- 운전자 작업 확인서 제출
- 협력사 승인/반려 워크플로우
- 정산 연동 준비

## 기술 스택

### 프론트엔드

- **React 19**: 최신 React 기능 활용
- **Vite**: 빠른 개발 서버 및 빌드
- **Tailwind CSS 4**: 유틸리티 우선 CSS 프레임워크
- **shadcn/ui**: 고품질 UI 컴포넌트
- **Wouter**: 경량 라우팅 라이브러리

### 백엔드

- **Express 4**: Node.js 웹 프레임워크
- **tRPC 11**: 타입 안전 API
- **Drizzle ORM**: TypeScript ORM
- **MySQL/TiDB**: 관계형 데이터베이스 (또는 Supabase PostgreSQL)

### 인증 및 스토리지

- **Manus OAuth**: 통합 인증 시스템
- **S3 호환 스토리지**: 파일 업로드 및 관리

### 배포

- **Vercel**: 프론트엔드 및 백엔드 서버리스 배포
- **Supabase**: PostgreSQL 데이터베이스 (선택사항)

## 시작하기

### 사전 요구사항

- Node.js 18 이상
- pnpm 8 이상
- MySQL 8 이상 또는 Supabase 계정

### 설치

```bash
# 의존성 설치
pnpm install

# 환경 변수 설정
cp .env.example .env
# .env 파일 편집하여 DATABASE_URL 등 설정

# 데이터베이스 마이그레이션
pnpm db:push

# 개발 서버 실행
pnpm dev
```

개발 서버는 `http://localhost:3000`에서 실행됩니다.

## 프로젝트 구조

```
construction-equipment-management/
├── client/                 # 프론트엔드 소스
│   ├── src/
│   │   ├── pages/         # 페이지 컴포넌트
│   │   ├── components/    # 재사용 가능한 UI 컴포넌트
│   │   ├── lib/           # 유틸리티 및 tRPC 클라이언트
│   │   └── App.tsx        # 라우팅 설정
├── server/                # 백엔드 소스
│   ├── routers.ts         # tRPC 라우터 정의
│   ├── db.ts              # 데이터베이스 헬퍼 함수
│   └── _core/             # 프레임워크 코어 (수정 금지)
├── drizzle/               # 데이터베이스 스키마 및 마이그레이션
│   └── schema.ts          # Drizzle ORM 스키마
├── shared/                # 프론트엔드/백엔드 공유 코드
└── storage/               # S3 스토리지 헬퍼
```

## 개발 워크플로우

### 1. 데이터베이스 스키마 변경

```bash
# drizzle/schema.ts 파일 수정
# 마이그레이션 생성 및 적용
pnpm db:push
```

### 2. API 추가

1. `server/db.ts`에 데이터베이스 헬퍼 함수 추가
2. `server/routers.ts`에 tRPC 프로시저 추가
3. 프론트엔드에서 `trpc.*.useQuery/useMutation` 사용

### 3. 페이지 추가

1. `client/src/pages/` 디렉토리에 페이지 컴포넌트 생성
2. `client/src/App.tsx`에 라우트 추가
3. `client/src/components/DashboardLayout.tsx`에 메뉴 항목 추가 (선택사항)

## 배포

자세한 배포 가이드는 [DEPLOYMENT.md](./DEPLOYMENT.md)를 참조하세요.

### 간단 배포 (Vercel)

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

## 환경 변수

필수 환경 변수:

```env
DATABASE_URL=mysql://user:password@host:port/database
JWT_SECRET=your_jwt_secret_key
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
```

선택적 환경 변수:

```env
VITE_APP_TITLE=건설현장 장비·인력 통합관리 시스템
VITE_APP_LOGO=https://example.com/logo.png
```

## 데이터베이스 스키마

주요 테이블:

- `users`: 사용자 및 권한
- `equip_types`: 장비 종류
- `worker_types`: 인력 유형
- `type_docs`: 장비별 필수 서류
- `worker_docs`: 인력별 필수 서류
- `checklist_forms`: 안전점검표 템플릿
- `equipment`: 등록된 장비
- `workers`: 등록된 인력
- `docs_compliance`: 업로드된 서류
- `check_records`: 안전점검 기록
- `work_journal`: 작업 확인서

## API 문서

tRPC를 사용하여 타입 안전 API를 제공합니다. 주요 라우터:

- `auth`: 인증 관련
- `users`: 사용자 관리 (관리자 전용)
- `equipTypes`: 장비 종류 관리
- `workerTypes`: 인력 유형 관리
- `equipment`: 장비 관리
- `workers`: 인력 관리
- `docsCompliance`: 서류 관리
- `checkRecords`: 안전점검 기록
- `workJournal`: 작업 확인서

## 보안

- 모든 API는 인증 필요 (`protectedProcedure`)
- 역할 기반 접근 제어 (RBAC)
- JWT 기반 세션 관리
- HTTPS 사용 (Vercel 자동 제공)
- 환경 변수로 비밀 정보 관리

## 라이선스

MIT License

## 지원

문의사항이 있으시면 다음으로 연락주세요:
- GitHub Issues
- 이메일: support@example.com

---

**Made with ❤️ for Construction Industry**

