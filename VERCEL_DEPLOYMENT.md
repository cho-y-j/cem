# Vercel 배포 가이드

## 현재 상태에서 배포 가능 여부

**네, Vercel로 배포하면 핸드폰에서 위치 전송 등이 가능합니다!**

### ✅ 배포 가능한 이유

1. **HTTPS 자동 지원**: Vercel은 모든 배포에 HTTPS를 자동으로 제공합니다
   - GPS 위치 추적은 HTTPS 환경에서만 작동하는데, Vercel이 자동으로 제공합니다
   - `localhost`는 예외이지만, 배포된 도메인은 HTTPS가 자동 적용됩니다

2. **모바일 브라우저 지원**: 웹 기반 앱이므로 별도 앱 설치 없이 모바일 브라우저에서 바로 사용 가능

3. **서버리스 함수 지원**: Express 서버를 Vercel의 serverless 함수로 변환 가능

## 배포 전 준비 사항

### 1. 환경 변수 설정

Vercel 프로젝트 설정에서 다음 환경 변수를 추가해야 합니다:

```env
# 데이터베이스 (Supabase)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT 인증
JWT_SECRET=your_jwt_secret_key

# OAuth (Manus)
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
OWNER_OPEN_ID=owner_open_id
OWNER_NAME=owner_name

# 기타
NODE_ENV=production
```

### 2. 빌드 설정 확인

`package.json`의 빌드 스크립트가 올바른지 확인:
```json
{
  "scripts": {
    "build": "vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"
  }
}
```

## 배포 방법

### 방법 1: Vercel CLI 사용 (권장)

```bash
# 1. Vercel CLI 설치
npm i -g vercel

# 2. 프로젝트 디렉토리에서 로그인
vercel login

# 3. 배포
vercel

# 4. 프로덕션 배포
vercel --prod
```

### 방법 2: GitHub 연동

1. GitHub에 코드 푸시
2. [Vercel Dashboard](https://vercel.com)에서 프로젝트 Import
3. GitHub 저장소 선택
4. 환경 변수 설정
5. Deploy 클릭

## 배포 후 확인 사항

### 1. GPS 위치 추적 테스트

모바일 브라우저에서 다음을 확인:

1. **HTTPS 연결 확인**: URL이 `https://`로 시작하는지 확인
2. **위치 권한 요청**: 브라우저에서 위치 권한 허용
3. **작업 시작**: Worker 앱에서 "작업 시작" 버튼 클릭
4. **위치 전송 확인**: 콘솔 또는 데이터베이스에서 위치 로그 확인

### 2. 모바일 최적화 확인

- 화면 크기에 맞게 레이아웃이 조정되는지 확인
- 버튼이 터치하기 쉽게 크기가 적절한지 확인
- 하단 네비게이션이 제대로 표시되는지 확인

## 문제 해결

### GPS 위치가 수집되지 않는 경우

1. **HTTPS 확인**: URL이 `https://`로 시작하는지 확인
2. **브라우저 권한 확인**: 브라우저 설정에서 위치 권한 허용 확인
3. **콘솔 확인**: 브라우저 개발자 도구에서 오류 메시지 확인
4. **네트워크 확인**: API 호출이 성공하는지 확인

### API 호출 실패 시

1. **환경 변수 확인**: Vercel 설정에서 모든 환경 변수가 올바르게 설정되었는지 확인
2. **함수 로그 확인**: Vercel Dashboard의 Functions 탭에서 로그 확인
3. **에러 메시지 확인**: 브라우저 개발자 도구의 Network 탭에서 실패한 요청 확인

## 중요 참고 사항

### GPS 위치 추적 요구사항

- ✅ **HTTPS 필수**: GPS API는 HTTPS 환경에서만 작동
- ✅ **브라우저 권한**: 사용자가 위치 권한을 허용해야 함
- ✅ **모바일 브라우저**: iOS Safari, Chrome 등에서 잘 작동
- ⚠️ **정확도**: 실내에서는 GPS 정확도가 낮을 수 있음

### Vercel 제한 사항

- **함수 실행 시간**: 기본 10초 (최대 60초까지 설정 가능)
- **함수 크기**: 최대 50MB
- **요청 제한**: 무료 플랜은 월 100GB 전송량 제한

## 배포 후 테스트 체크리스트

- [ ] HTTPS 연결 확인
- [ ] 로그인 기능 테스트
- [ ] Worker 앱 접근 테스트
- [ ] 작업 시작 버튼 작동 확인
- [ ] GPS 위치 수집 확인
- [ ] 위치 정보가 데이터베이스에 저장되는지 확인
- [ ] 위치 추적 페이지에서 위치 확인
- [ ] 모바일 UI/UX 확인

## 추가 개선 사항

배포 후 다음 기능을 추가로 개선할 수 있습니다:

1. **PWA (Progressive Web App)**: 홈 화면에 추가 기능
2. **오프라인 지원**: 서비스 워커로 오프라인 기능 제공
3. **푸시 알림**: Web Push API로 알림 기능 추가
4. **앱 아이콘**: 각 모바일 플랫폼에 맞는 아이콘 설정

---

**요약**: 현재 상태에서도 Vercel로 배포하면 핸드폰에서 위치 전송이 가능합니다. HTTPS가 자동으로 제공되므로 GPS 위치 추적이 정상 작동합니다!

