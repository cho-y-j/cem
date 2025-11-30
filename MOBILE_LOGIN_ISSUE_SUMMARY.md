# 모바일 앱 로그인 문제 정리

## 🔴 현재 문제
**로그인 성공 후 처음 화면으로 돌아감**

## 📋 지금까지 시도한 해결 방법

### 1. CORS 설정 추가 ✅
- 서버에 CORS 미들웨어 추가
- 모바일 앱 origin (`https://localhost`) 허용
- **결과**: CORS 에러 해결됨

### 2. Authorization 헤더 전송 수정 ✅
- Headers 객체를 일반 객체로 변환하여 전달
- Authorization 헤더 로그 추가
- **결과**: 코드는 수정되었지만 여전히 헤더가 전송되지 않음

### 3. useAuth 토큰 체크 추가 ✅
- 모바일 앱에서는 토큰이 있을 때만 `auth.me` 쿼리 실행
- **결과**: 불필요한 호출은 줄었지만 근본 문제 미해결

### 4. 로그인 후 리다이렉션 로직 개선 ✅
- 사용자 정보를 캐시에 직접 설정
- 로딩 상태 확인 로직 추가
- **결과**: 여전히 문제 발생

## 🔍 발견된 문제점

### 문제 1: localStorage에 토큰이 없음
**증상**: `[API] No auth token found in localStorage`
**원인**: 
- 로그인 성공 후 토큰이 저장되지 않거나
- 저장되기 전에 `auth.me`가 실행되거나
- 서버에서 토큰을 반환하지 않음

### 문제 2: Authorization 헤더가 전송되지 않음
**증상**: Network 탭에서 Authorization 헤더가 없음
**원인**:
- localStorage에 토큰이 없어서 헤더를 추가할 수 없음

### 문제 3: 로그인 성공 후 리다이렉션 실패
**증상**: 로그인 성공 메시지는 나오지만 처음 화면으로 돌아감
**원인**:
- `auth.me`가 실패하여 사용자 정보를 가져오지 못함
- `WorkerMain`에서 사용자 정보가 없어서 로그인 페이지로 리다이렉션

## 🎯 근본 원인 추정

### 가능성 1: 서버에서 토큰을 반환하지 않음
- `auth.login` API가 `token` 필드를 반환하지 않을 수 있음
- 확인 필요: 서버 코드에서 `return { user, token }`이 제대로 작동하는지

### 가능성 2: 토큰 저장 타이밍 문제
- 로그인 성공 후 토큰 저장과 리다이렉션이 동시에 일어나서 충돌
- 확인 필요: 로그인 성공 후 토큰 저장 로그 확인

### 가능성 3: localStorage 접근 문제
- Capacitor 환경에서 localStorage가 제대로 작동하지 않을 수 있음
- 확인 필요: 로그인 후 localStorage.getItem('authToken') 확인

## 🔧 확인해야 할 사항

### 1. Chrome DevTools에서 확인
```
1. 로그인 시도
2. Console 탭에서 다음 로그 확인:
   - [PinLogin] Login success: ...
   - [PinLogin] Token saved verification: OK 또는 FAILED
   - [PinLogin] Token length: ...
   - [API] Authorization header added: ... 또는 [API] No auth token found
3. Network 탭에서 auth.login 요청 확인:
   - Response 탭에서 token 필드가 있는지 확인
   - Status가 200인지 확인
```

### 2. 서버 코드 확인 필요
- `server/routers.ts`의 `auth.login`이 `token`을 반환하는지 확인
- 서버 로그에서 토큰이 생성되는지 확인

### 3. localStorage 확인
- Console에서 직접 실행:
  ```javascript
  localStorage.getItem('authToken')
  ```

## 📝 다음 단계

1. **로그인 성공 시 서버 응답 확인**
   - Network 탭에서 `auth.login` 응답 확인
   - `token` 필드가 있는지 확인

2. **토큰 저장 확인**
   - Console에서 `[PinLogin] Token saved verification` 로그 확인
   - 직접 `localStorage.getItem('authToken')` 확인

3. **서버 코드 확인**
   - `server/routers.ts`에서 `auth.login`이 토큰을 반환하는지 확인

4. **대안 방법 고려**
   - 로그인 성공 시 받은 사용자 정보를 직접 사용
   - 토큰 없이도 일시적으로 작동하도록 수정

## 🚨 긴급 해결 방법 (임시)

로그인 성공 시 받은 사용자 정보를 직접 사용하여 리다이렉션:
- `auth.me` 쿼리 결과를 기다리지 않고
- 로그인 응답의 `data.user`를 직접 사용하여 리다이렉션
- 이후 `auth.me`가 성공하면 사용자 정보 업데이트

## 📌 참고 파일
- `client/src/main.tsx` - API 클라이언트 설정
- `client/src/pages/mobile/PinLogin.tsx` - 로그인 페이지
- `client/src/pages/mobile/WorkerMain.tsx` - Worker 메인 페이지
- `client/src/_core/hooks/useAuth.ts` - 인증 훅
- `server/routers.ts` - 서버 라우터 (auth.login)



