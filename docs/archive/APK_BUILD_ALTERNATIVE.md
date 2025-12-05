# APK 빌드 방법 (대안)

## 방법 1: Gradle 탭에서 빌드

1. **오른쪽 사이드바에서 "Gradle" 탭 찾기**
   - 없으면 View > Tool Windows > Gradle 클릭

2. **Gradle 탭에서:**
   - `android` > `app` > `Tasks` > `build` 확장
   - **`assembleDebug`** 더블클릭

3. **빌드 진행:**
   - 하단 "Build" 탭에서 진행 상황 확인
   - 완료되면 "BUILD SUCCESSFUL" 메시지 확인

## 방법 2: Terminal에서 빌드

Android Studio 하단의 **"Terminal"** 탭에서:

```bash
cd android
./gradlew assembleDebug
```

또는 현재 디렉토리가 android라면:

```bash
./gradlew assembleDebug
```

## 방법 3: Run 버튼 사용

1. 상단 툴바에서 **녹색 재생 버튼(Run)** 클릭
2. 또는 **Shift + F10**
3. 기기가 연결되어 있으면 자동 빌드 및 설치
4. 기기가 없어도 APK는 빌드됨

## 방법 4: Build Variants 확인

1. 왼쪽 사이드바에서 **"Build Variants"** 탭 찾기
2. 없으면 View > Tool Windows > Build Variants
3. app 모듈의 Variant가 "debug"로 설정되어 있는지 확인
4. Run 버튼 클릭

## 빌드 완료 후 APK 위치

빌드가 완료되면 APK 파일은 다음 위치에 생성됩니다:

```
android\app\build\outputs\apk\debug\app-debug.apk
```

파일 탐색기에서 직접 확인하거나, Android Studio에서:
- Build 탭에서 "locate" 링크 클릭
- 또는 파일 탐색기에서 위 경로로 이동

## 가장 쉬운 방법

**오른쪽 사이드바의 "Gradle" 탭을 찾아서 `assembleDebug`를 실행하는 것이 가장 확실합니다!**

Gradle 탭이 보이나요?


