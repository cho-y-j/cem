# Gradle 설정 위치 안내

## Android Studio에서 Gradle 설정 찾기

### 방법 1: 직접 Gradle 섹션 찾기

1. **Settings 창이 열려있다면:**
   - 왼쪽 메뉴에서 "Build, Execution, Deployment" 확장
   - **"Gradle"** 항목을 찾으세요 (Build Tools와 별도 항목입니다)
   - "Gradle" 클릭

2. **Settings 창이 닫혀있다면:**
   - File > Settings (또는 Ctrl+Alt+S)
   - 왼쪽에서 "Build, Execution, Deployment" > **"Gradle"** 클릭

### 방법 2: 검색으로 찾기

1. Settings 창 상단의 검색창에 **"Gradle"** 입력
2. "Gradle" 항목 선택

## Gradle 설정에서 확인할 사항

Gradle 섹션을 열면 다음을 확인하세요:

1. **Gradle JDK**
   - "Gradle JDK" 드롭다운에서 Java 17 선택
   - Java 17이 없다면 "Download JDK" 클릭하여 설치

2. **Gradle 사용 설정**
   - "Use Gradle from" 옵션 확인
   - "Specified location" 또는 "'gradle-wrapper.properties' file" 선택

3. **Build and run using**
   - "Gradle" 선택

## 빠른 해결: Build 탭에서 오류 확인

Gradle 설정을 찾기 전에, 먼저 오류를 확인하세요:

1. Android Studio 하단의 **"Build"** 탭 클릭
2. 빨간색 오류 메시지 확인
3. 오류 메시지를 알려주시면 정확한 해결 방법을 제시하겠습니다

## 대안: Terminal에서 직접 확인

Android Studio 하단의 "Terminal" 탭에서:

```bash
cd android
./gradlew --version
```

이 명령어로 Gradle이 제대로 설치되어 있는지 확인할 수 있습니다.


