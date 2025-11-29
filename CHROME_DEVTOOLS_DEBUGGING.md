# Chrome DevTools로 모바일 앱 디버깅 가이드

## 🎯 목적
모바일 앱에서 발생하는 "failed to fetch" 에러를 Chrome DevTools로 디버깅하는 방법입니다.

## 📋 사전 준비

### 1. Android 기기 설정

#### 실제 기기 사용 시:
1. **개발자 옵션 활성화**
   - 설정 > 휴대전화 정보 > 빌드 번호를 7번 연속 탭
   
2. **USB 디버깅 활성화**
   - 설정 > 개발자 옵션 > USB 디버깅 활성화

3. **USB로 PC 연결**
   - USB 케이블로 기기를 PC에 연결
   - 기기에서 "USB 디버깅 허용" 팝업이 나타나면 확인

#### 에뮬레이터 사용 시:
- 에뮬레이터가 실행 중이면 자동으로 연결됩니다

### 2. Chrome 브라우저 열기

1. Chrome 브라우저 실행
2. 주소창에 입력: `chrome://inspect`
3. "Devices" 섹션 확인

## 🔍 디버깅 시작하기

### 방법 1: Chrome DevTools 사용 (권장)

1. **Chrome에서 `chrome://inspect` 접속**
   ```
   chrome://inspect
   ```

2. **기기/에뮬레이터 확인**
   - "Remote Target" 섹션에 연결된 기기가 표시됩니다
   - 예: `com.cem.app` 또는 `CEM`

3. **앱 실행**
   - 모바일 기기/에뮬레이터에서 앱 실행
   - 로그인 화면까지 진행

4. **inspect 클릭**
   - `chrome://inspect` 페이지에서 앱 이름 옆의 **"inspect"** 버튼 클릭
   - 새 창이 열리며 Chrome DevTools가 표시됩니다

5. **Console 탭 확인**
   - DevTools의 **Console** 탭 클릭
   - 여기서 모든 JavaScript 로그를 확인할 수 있습니다
   - `[API]` 로그가 표시됩니다

6. **Network 탭 확인**
   - DevTools의 **Network** 탭 클릭
   - 앱에서 로그인 시도
   - 실패한 요청을 클릭하여 상세 정보 확인
   - **Headers**, **Preview**, **Response** 탭에서 에러 원인 확인

### 방법 2: ADB Logcat 사용 (터미널)

```powershell
# Android SDK의 adb 경로 확인
$adbPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"

# 로그 확인 (필터링)
& $adbPath logcat | Select-String -Pattern "API|fetch|error|Error"

# 또는 모든 로그 확인
& $adbPath logcat
```

## 🐛 "failed to fetch" 에러 디버깅

### 1. Console 탭에서 확인할 내용:

```javascript
// 이런 로그들이 표시됩니다:
[API] POST https://cem-21tp.onrender.com/api/trpc
[API] Fetch error: TypeError: Failed to fetch
[API] URL: https://cem-21tp.onrender.com/api/trpc
[API] Headers: {...}
```

### 2. Network 탭에서 확인할 내용:

1. **요청이 전송되었는지 확인**
   - Network 탭에 요청이 표시되는지 확인
   - 요청이 없으면 네트워크 연결 문제

2. **요청 상태 확인**
   - Status: 200 (성공), 4xx/5xx (서버 에러), (failed) (네트워크 에러)

3. **요청 헤더 확인**
   - Headers 탭에서 `Authorization` 헤더가 있는지 확인
   - `Content-Type` 헤더 확인

4. **응답 확인**
   - Response 탭에서 서버 응답 확인
   - 에러 메시지 확인

### 3. 일반적인 문제와 해결책:

#### 문제 1: 요청이 Network 탭에 표시되지 않음
**원인**: 네트워크 연결 문제 또는 CORS 문제
**해결**: 
- 인터넷 연결 확인
- 서버가 실행 중인지 확인 (Render.com 대시보드)

#### 문제 2: Status가 (failed) 또는 CORS 에러
**원인**: CORS 설정 문제 또는 서버 접근 불가
**해결**:
- 서버의 CORS 설정 확인
- API URL이 올바른지 확인

#### 문제 3: Authorization 헤더가 없음
**원인**: 토큰이 저장되지 않았거나 전송되지 않음
**해결**:
- Console에서 `localStorage.getItem('authToken')` 확인
- 로그인 성공 후 토큰이 저장되는지 확인

## 📱 실시간 디버깅 팁

### Console에서 직접 실행:

```javascript
// 토큰 확인
localStorage.getItem('authToken')

// 저장된 이메일 확인
localStorage.getItem('savedEmail')

// API URL 확인
// Console에서 직접 fetch 테스트
fetch('https://cem-21tp.onrender.com/api/trpc', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('authToken')
  },
  body: JSON.stringify({...})
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

### Network 탭에서 요청 재전송:

1. Network 탭에서 실패한 요청 우클릭
2. "Copy" > "Copy as fetch"
3. Console 탭에 붙여넣기
4. 수정하여 재실행

## 🔧 문제 해결 체크리스트

- [ ] Chrome DevTools가 연결되었는가?
- [ ] 앱이 실행 중인가?
- [ ] Console 탭에 로그가 표시되는가?
- [ ] Network 탭에 요청이 표시되는가?
- [ ] Authorization 헤더가 있는가?
- [ ] 서버가 실행 중인가? (Render.com 확인)
- [ ] 인터넷 연결이 정상인가?

## 💡 추가 팁

1. **Console 필터링**: Console 탭에서 `[API]` 또는 `error`로 필터링
2. **Network 필터링**: Network 탭에서 `trpc` 또는 `api`로 필터링
3. **스크린샷**: 문제 발생 시 Network 탭 스크린샷 저장
4. **로그 복사**: Console 로그를 복사하여 공유

## 🚀 빠른 시작 명령어

```powershell
# 1. 기기 연결 확인
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices

# 2. Chrome에서 디버깅 시작
Start-Process "chrome://inspect"

# 3. 로그 실시간 확인
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" logcat | Select-String -Pattern "API|error"
```

