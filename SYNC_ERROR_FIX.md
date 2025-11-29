# Gradle Sync 오류 해결 가이드

## 오류 확인 방법

### 1. 상세 오류 메시지 확인
1. Sync 탭에서 빨간색 오류 행을 클릭하여 확장
2. 또는 "Download info" 클릭하여 상세 로그 확인
3. 오류 메시지 전체를 복사

### 2. Build 탭 확인
1. 하단 "Build" 탭 클릭
2. 빨간색 오류 메시지 확인
3. 오류 메시지 전체를 복사

## 일반적인 오류 및 해결 방법

### 오류 1: 네트워크/다운로드 실패
**증상:** "Connection timeout", "Failed to download"

**해결:**
1. 인터넷 연결 확인
2. VPN/프록시 설정 확인
3. Gradle 캐시 삭제 후 재시도:
   ```bash
   cd android
   ./gradlew --stop
   rm -rf ~/.gradle/caches
   ```

### 오류 2: SDK 문제
**증상:** "SDK not found", "Android SDK"

**해결:**
1. Android Studio에서 File > Settings
2. Appearance & Behavior > System Settings > Android SDK
3. SDK Platforms 탭에서 Android API 35 설치 확인
4. SDK Tools 탭에서 필요한 도구 설치 확인

### 오류 3: Java 버전 문제
**증상:** "Unsupported class file", "Java version"

**해결:**
- 이미 Java 17로 설정되어 있으므로 이 문제는 아닐 가능성이 높습니다

### 오류 4: google-services.json 문제
**증상:** "google-services.json not found"

**해결:**
1. `android/app/google-services.json` 파일 존재 확인
2. 파일 이름이 정확한지 확인 (대소문자 구분)

## 빠른 해결 시도

### 방법 1: 캐시 무효화
1. File > Invalidate Caches / Restart
2. "Invalidate and Restart" 선택

### 방법 2: Gradle Wrapper 재생성
Terminal에서:
```bash
cd android
./gradlew --stop
./gradlew clean
```

### 방법 3: 수동 동기화
1. File > Sync Project with Gradle Files
2. 또는 상단 "Sync Now" 버튼

## 다음 단계

**오류 메시지를 알려주시면 정확한 해결 방법을 제시하겠습니다.**

Sync 탭에서 오류를 확장하거나 "Download info"를 클릭하여 상세 오류 메시지를 확인해주세요.


