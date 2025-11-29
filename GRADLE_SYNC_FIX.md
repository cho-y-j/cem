# Gradle 동기화 문제 해결 가이드

## 일반적인 오류 및 해결 방법

### 1. Java 버전 오류

**오류 메시지:**
- "Unsupported class file major version"
- "Java version mismatch"

**해결 방법:**
1. Android Studio에서 File > Settings (또는 Ctrl+Alt+S)
2. Build, Execution, Deployment > Build Tools > Gradle
3. Gradle JDK를 Java 17로 변경
4. Apply > OK
5. File > Sync Project with Gradle Files

### 2. Gradle 다운로드 실패

**오류 메시지:**
- "Connection timeout"
- "Failed to download"

**해결 방법:**
1. Android Studio에서 File > Settings
2. Build, Execution, Deployment > Gradle
3. "Use Gradle from"을 "Specified location"으로 변경
4. Gradle 경로 지정: `C:\Users\조연지\.gradle\wrapper\dists\gradle-8.7-bin\...`
5. 또는 오프라인 모드 사용

### 3. 네트워크/프록시 문제

**해결 방법:**
1. `android/gradle.properties` 파일에 추가:
```properties
systemProp.http.proxyHost=
systemProp.http.proxyPort=
systemProp.https.proxyHost=
systemProp.https.proxyPort=
```

### 4. 캐시 문제

**해결 방법:**
1. Android Studio에서 File > Invalidate Caches / Restart
2. "Invalidate and Restart" 선택
3. 재시작 후 다시 Sync

### 5. Google Services 플러그인 오류

**오류 메시지:**
- "google-services.json not found"

**해결 방법:**
1. `android/app/google-services.json` 파일이 있는지 확인
2. 파일 이름이 정확한지 확인 (대소문자 구분)
3. `android/app/build.gradle`에서 자동으로 적용되는지 확인

## 빠른 해결 방법

### 방법 1: 캐시 무효화 및 재시작
```
File > Invalidate Caches / Restart > Invalidate and Restart
```

### 방법 2: Gradle 동기화 강제 실행
```
File > Sync Project with Gradle Files
```

### 방법 3: Gradle Wrapper 재생성
터미널에서:
```bash
cd android
./gradlew --stop
./gradlew clean
```

### 방법 4: 수동으로 Gradle 동기화
1. Android Studio 하단의 "Terminal" 탭 열기
2. 다음 명령어 실행:
```bash
cd android
./gradlew build --refresh-dependencies
```

## 오류 메시지 확인 방법

1. Android Studio 하단의 "Build" 탭 확인
2. 빨간색 오류 메시지 클릭하여 상세 내용 확인
3. 오류 메시지를 복사하여 검색

## 도움이 필요한 경우

오류 메시지를 알려주시면 더 구체적인 해결 방법을 제시하겠습니다.


