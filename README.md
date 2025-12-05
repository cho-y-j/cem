# CEM - 건설현장 장비·인력 통합관리 시스템

건설 현장에서 운영되는 다양한 임대 장비와 관련 인력을 효율적으로 관리하기 위한 통합 플랫폼입니다.

> **최종 업데이트**: 2025-12-05

## 주요 기능

### 1. 역할 기반 접근 제어 (RBAC)

시스템은 6가지 사용자 역할을 지원합니다:

| 역할 | 설명 | 접근 방식 |
|------|------|-----------|
| **관리자 (admin)** | 시스템 전체 설정 및 마스터 데이터 관리 | 웹 (데스크톱) |
| **장비 임대사업자 (owner)** | 장비/인력 등록 및 서류 관리 | 웹 (데스크톱) |
| **협력사 (bp)** | 반입요청 승인 및 작업 확인서 검토 | 웹 (데스크톱) |
| **운영사 (ep)** | 최종 반입 승인 및 전체 현황 모니터링 | 웹 (데스크톱) |
| **운전자 (worker)** | 작업 확인서 제출 및 근태 관리 | 모바일 앱 (PIN 로그인) |
| **안전점검원 (inspector)** | 안전점검 수행 및 결과 기록 | 모바일 앱 |

### 2. 반입요청 워크플로우

3단계 승인 프로세스:
```
[Owner] 반입요청 생성 → [BP] 검토/승인 → [EP] 최종 승인 → 투입 관리
```

### 3. 서류 관리 및 인증

- **운전면허 자동 검증**: RIMS API 연동 (한국도로교통공단)
- **OCR 자동 추출**: Google Vision API 활용
- **만료일 추적**: 30일, 7일, 당일 알림
- **서류 유형별 관리**: 장비/인력 유형에 따른 필수 서류 정의

### 4. 모바일 기능

- **PIN 로그인**: 운전자용 4자리 PIN 인증
- **생체 인증**: WebAuthn (지문/Face ID) 지원
- **GPS 출퇴근**: 위치 기반 체크인/체크아웃
- **NFC 태그**: 장비별 NFC 태그 스캔

### 5. 안전점검 관리

- 장비 종류별 맞춤형 안전점검표 (JSON 기반)
- 모바일 친화적 점검 인터페이스
- 운전자 일일 점검 시스템
- 점검 이력 관리 및 통계

### 6. 실시간 모니터링

- 긴급 알림 시스템
- 위치 추적 대시보드
- 체크인 현황 모니터링

## 기술 스택

### 프론트엔드
- **React 19** + **Vite 7**
- **Tailwind CSS 4** + **shadcn/ui**
- **Wouter** (라우팅)
- **TanStack Query** (서버 상태 관리)

### 백엔드
- **Express 4** + **tRPC 11**
- **Drizzle ORM** + **PostgreSQL** (Supabase)

### 모바일
- **Capacitor 7** (Android/iOS)
- **Firebase Cloud Messaging** (푸시 알림)

### 외부 API
- **RIMS API**: 운전면허 진위 확인
- **Google Vision API**: OCR
- **Google Maps API**: 위치 서비스

### 배포
- **Vercel**: 프론트엔드 + 서버리스 백엔드
- **Supabase**: PostgreSQL + Storage

## 시작하기

### 사전 요구사항

- Node.js 20+
- pnpm 10+
- Supabase 계정

### 설치

```bash
# 의존성 설치
pnpm install

# 환경 변수 설정 (.env 파일 생성)
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
JWT_SECRET=xxx

# 개발 서버 실행
pnpm dev
```

개발 서버: `http://localhost:3000`

### 주요 명령어

```bash
pnpm dev          # 개발 서버 실행
pnpm build        # 프로덕션 빌드
pnpm check        # TypeScript 타입 체크
pnpm db:push      # DB 마이그레이션
```

## 프로젝트 구조

```
cem/
├── client/                    # React 프론트엔드
│   └── src/
│       ├── pages/            # 페이지 컴포넌트 (63개)
│       │   ├── mobile/       # 모바일 전용 (31개)
│       │   └── admin/        # 관리자 전용 (12개)
│       ├── components/       # 재사용 컴포넌트 (83개)
│       └── hooks/            # 커스텀 훅
├── server/                    # Express + tRPC 백엔드
│   ├── routers.ts            # 메인 라우터
│   ├── *-router.ts           # 기능별 라우터 (18개)
│   ├── db.ts                 # DB 헬퍼 함수
│   └── _core/                # 프레임워크 코어
├── drizzle/                   # Drizzle ORM
│   ├── schema.ts             # DB 스키마
│   └── migrations-pg/        # 마이그레이션 (22개)
├── android/                   # Capacitor Android
├── docs/                      # 문서
│   └── archive/              # 아카이브 문서
├── scripts/                   # 개발 스크립트
│   ├── dev-utils/            # JS/MJS 유틸리티
│   └── sql/                  # SQL 스크립트
└── CLAUDE.md                  # AI 개발 가이드
```

## 접속 정보

### 데스크톱 (웹)
- URL: `https://your-domain.vercel.app/login`
- 역할: admin, owner, bp, ep

### 모바일
- URL: `https://your-domain.vercel.app/mobile/login`
- 역할: worker (PIN 로그인)
- Inspector: `/mobile/inspector/login`

## 환경 변수

```env
# 필수
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
JWT_SECRET=xxx

# 외부 API
RIMS_AUTH_KEY=xxx              # 운전면허 검증
RIMS_SECRET_KEY=xxx
GOOGLE_CLOUD_VISION_KEY=xxx    # OCR
VITE_GOOGLE_MAPS_API_KEY=xxx   # 지도

# Firebase (모바일 푸시)
FIREBASE_PROJECT_ID=xxx
FIREBASE_CLIENT_EMAIL=xxx
FIREBASE_PRIVATE_KEY=xxx
```

## 라이선스

MIT License

---

**Made with React + tRPC + Supabase**
