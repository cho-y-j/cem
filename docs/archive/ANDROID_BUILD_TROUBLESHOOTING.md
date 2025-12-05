# Android 빌드 문제 해결 가이드

## 현재 상황
- Android Studio에서 빌드는 성공했다고 표시되지만 APK가 생성되지 않음
- 터미널에서는 JAVA_HOME 오류 발생

## 해결 방법

### 방법 1: Android Studio에서 직접 APK 빌드 (가장 확실한 방법)

1. **Android Studio 상단 메뉴에서:**
   - `Build` > `Build Bundle(s) / APK(s)` > `Build APK(s)` 클릭
   - 또는 `Build` > `Make Project` (Ctrl+F9)

2. **빌드 완료 후:**
   - 하단에 알림이 나타나면 "locate" 클릭
   - 또는 직접 확인: `android\app\build\outputs\apk\debug\app-debug.apk`

### 방법 2: Gradle 탭에서 직접 실행

1. **오른쪽 Gradle 탭 열기**
2. **`android` > `app` > `Tasks` > `build` 확장**
3. **`assembleDebug` 더블클릭**
4. **하단 Build 탭에서 진행 상황 확인**
5. **"BUILD SUCCESSFUL" 확인 후 APK 위치 확인**

### 방법 3: Build Variants 확인

1. **왼쪽 하단 "Build Variants" 탭 클릭**
2. **`app` 모듈의 "Active Build Variant"가 `debug`인지 확인**
3. **만약 `release`로 되어 있으면 `debug`로 변경**

### 방법 4: 캐시 정리 및 재빌드

1. **File > Invalidate Caches / Restart**
2. **"Invalidate and Restart" 클릭**
3. **Android Studio 재시작 후 다시 빌드**

## APK 파일 확인 위치

```
android\app\build\outputs\apk\debug\app-debug.apk
```

## 빌드가 성공했는데 APK가 없는 경우

1. **Build Output 탭 확인**
   - 실제 오류 메시지가 있는지 확인
   - "BUILD SUCCESSFUL"이 정말로 표시되는지 확인

2. **파일 탐색기에서 직접 확인**
   - `android\app\build\outputs\apk\debug\` 폴더 확인
   - 숨김 파일이 아닌지 확인

3. **다른 빌드 타입 확인**
   - `android\app\build\outputs\apk\release\` 폴더도 확인

## 여전히 안 되면

Android Studio의 Build Output 탭에서 전체 로그를 복사해서 확인이 필요합니다.


