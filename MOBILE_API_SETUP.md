# 모바일 앱 API 설정 가이드

## 문제 해결 완료 ✅

모바일 앱에서 로그인 에러가 발생하던 원인을 해결했습니다:
- **문제**: API URL이 상대 경로(`/api/trpc`)로 설정되어 에뮬레이터/실기기에서 서버에 접근 불가
- **해결**: Capacitor 환경 감지하여 적절한 API URL 자동 설정

## 에뮬레이터에서 테스트하기

### 1. 서버 실행 확인
터미널에서 서버가 실행 중인지 확인:
```powershell
# 서버가 실행 중이어야 합니다 (localhost:3000)
```

### 2. 앱 다시 빌드
변경사항을 적용하기 위해 앱을 다시 빌드해야 합니다:

```powershell
# 웹 빌드
pnpm build

# Android 프로젝트 동기화
cd android
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
.\gradlew.bat clean assembleDebug
```

### 3. 에뮬레이터에서 앱 실행
- Android Studio에서 에뮬레이터 실행
- APK 설치 후 앱 실행
- 로그인 시도

## 실제 기기에서 테스트하기

실제 Android 기기에서 테스트하려면:

### 1. 개발 서버의 로컬 IP 주소 확인
```powershell
ipconfig
# IPv4 주소 확인 (예: 192.168.0.100)
```

### 2. 환경 변수 설정
`.env` 파일에 추가:
```
VITE_API_URL=http://192.168.0.100:3000
```
(실제 IP 주소로 변경)

### 3. 앱 다시 빌드
```powershell
pnpm build
cd android
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
.\gradlew.bat clean assembleDebug
```

### 4. 기기와 PC가 같은 Wi-Fi 네트워크에 연결되어 있어야 함

## API URL 자동 감지 로직

앱은 다음 순서로 API URL을 결정합니다:

1. **환경 변수** (`VITE_API_URL`)가 설정되어 있으면 사용
2. **Android 에뮬레이터**: `http://10.0.2.2:3000/api/trpc` (호스트 머신의 localhost)
3. **실제 기기**: `http://[기기IP]:3000/api/trpc` (환경 변수 설정 권장)
4. **웹 브라우저**: `/api/trpc` (상대 경로)

## 다음 단계

1. 앱을 다시 빌드하세요
2. 에뮬레이터에서 테스트하세요
3. 로그인이 정상 작동하는지 확인하세요


