# Android APK 빌드 가이드

## 방법 1: Android Studio 사용 (권장)

### 1단계: Android Studio에서 프로젝트 열기

```bash
npx cap open android
```

이 명령어가 Android Studio를 자동으로 열고 프로젝트를 로드합니다.

### 2단계: Gradle 동기화

Android Studio가 열리면:
1. 상단에 "Sync Now" 버튼이 나타나면 클릭
2. 또는 File > Sync Project with Gradle Files

### 3단계: Firebase 설정 확인

다음 파일들이 올바르게 설정되었는지 확인:

**android/app/build.gradle** (이미 설정됨)
- `google-services.json` 파일이 `android/app/` 폴더에 있는지 확인
- `apply plugin: 'com.google.gms.google-services'` 가 자동으로 적용됨

**android/app/src/main/AndroidManifest.xml** (이미 설정됨)
- 알림 권한이 추가되어 있음
- 알림 채널 메타데이터가 추가되어 있음

**android/app/src/main/java/com/cem/app/MainActivity.java** (이미 설정됨)
- 알림 채널 생성 코드가 추가되어 있음

### 4단계: APK 빌드

#### Debug APK 빌드 (테스트용)
1. Build > Build Bundle(s) / APK(s) > Build APK(s)
2. 빌드 완료 후 "locate" 링크 클릭
3. `android/app/build/outputs/apk/debug/app-debug.apk` 파일 확인

#### Release APK 빌드 (배포용)
1. Build > Generate Signed Bundle / APK
2. APK 선택
3. 키스토어 생성 또는 기존 키스토어 사용
4. 빌드 완료 후 `android/app/build/outputs/apk/release/app-release.apk` 확인

### 5단계: APK 설치

#### 방법 A: USB 디버깅
1. Android 기기에서 개발자 옵션 활성화
2. USB 디버깅 활성화
3. USB로 기기 연결
4. Android Studio에서 Run 버튼 클릭 (또는 Shift+F10)

#### 방법 B: 직접 설치
1. APK 파일을 Android 기기로 전송 (이메일, 클라우드 등)
2. 기기에서 파일 관리자로 APK 파일 열기
3. "알 수 없는 출처" 허용 (필요한 경우)
4. 설치 진행

---

## 방법 2: 명령줄 사용 (빠른 빌드)

### Windows PowerShell에서 실행

```powershell
# Android 프로젝트 폴더로 이동
cd android

# Debug APK 빌드
.\gradlew assembleDebug

# 빌드된 APK 위치
# android/app/build/outputs/apk/debug/app-debug.apk
```

### 빌드 완료 후

```powershell
# APK 파일 확인
Get-ChildItem -Path "app\build\outputs\apk\debug" -Filter "*.apk"
```

---

## 빌드 전 확인 사항

### 1. Capacitor 동기화
```bash
# 웹 빌드 먼저 실행
pnpm build

# Android 프로젝트 동기화
npx cap sync android
```

### 2. Firebase 설정 확인
- `android/app/google-services.json` 파일 존재 확인
- Firebase Console에서 Android 앱이 등록되어 있는지 확인

### 3. 환경 변수 확인
서버의 `.env` 파일에 다음이 설정되어 있는지 확인:
```
FIREBASE_PROJECT_ID=cemapp-c6c17
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@cemapp-c6c17.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

---

## 빌드 오류 해결

### 오류: "google-services.json not found"
- `google-services.json` 파일이 `android/app/` 폴더에 있는지 확인
- 파일 이름이 정확한지 확인 (대소문자 구분)

### 오류: "Gradle sync failed"
- Android Studio에서 File > Invalidate Caches / Restart 실행
- `npx cap sync android` 다시 실행

### 오류: "SDK not found"
- Android Studio에서 SDK Manager 열기
- Android SDK Platform 35 설치 확인
- Build Tools 최신 버전 설치 확인

### 오류: "Java version mismatch"
- Java 17 이상 설치 확인
- `JAVA_HOME` 환경 변수 설정 확인

---

## 테스트 체크리스트

APK 설치 후 다음을 확인하세요:

1. **앱 실행**
   - 앱이 정상적으로 시작되는지 확인
   - 로그인 화면이 표시되는지 확인

2. **FCM 토큰 등록**
   - 로그인 후 서버 로그 확인
   - `[FCM] Token received:` 메시지 확인
   - 또는 `trpc.notifications.registerFcmToken` 호출 확인

3. **푸시 알림 수신**
   - 웹에서 알림 전송 (`http://localhost:3000/notifications/send`)
   - Android 앱에서 푸시 알림 수신 확인
   - 알림 클릭 시 앱이 열리는지 확인

4. **기존 기능 확인**
   - 위치 추적 기능 정상 작동 확인
   - NFC 기능 정상 작동 확인
   - 기타 모바일 기능 정상 작동 확인

---

## 빠른 빌드 명령어

```bash
# 전체 프로세스 (한 번에 실행)
pnpm build && npx cap sync android && cd android && ./gradlew assembleDebug
```

빌드된 APK는 `android/app/build/outputs/apk/debug/app-debug.apk`에 생성됩니다.


