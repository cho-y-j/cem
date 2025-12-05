# Android Studio 수동 열기 가이드

## 방법 1: Android Studio 직접 실행

1. **Android Studio 실행**
   - 시작 메뉴에서 "Android Studio" 검색 후 실행
   - 또는 `C:\Program Files\Android\Android Studio\bin\studio64.exe` 직접 실행

2. **프로젝트 열기**
   - Android Studio가 열리면 "Open" 클릭
   - 또는 File > Open
   - 다음 폴더 선택: `C:\Users\조연지\Documents\GitHub\cem\cem\android`

3. **Gradle 동기화**
   - Android Studio가 프로젝트를 열면 자동으로 Gradle 동기화 시작
   - 상단에 "Sync Now" 버튼이 나타나면 클릭
   - 또는 File > Sync Project with Gradle Files

## 방법 2: 명령어로 직접 열기

PowerShell에서 실행:

```powershell
# Android Studio 실행 (프로젝트 폴더 지정)
& "C:\Program Files\Android\Android Studio\bin\studio64.exe" "C:\Users\조연지\Documents\GitHub\cem\cem\android"
```

## 방법 3: 배치 파일 생성 (편의용)

`open-android-studio.bat` 파일 생성:

```batch
@echo off
start "" "C:\Program Files\Android\Android Studio\bin\studio64.exe" "%~dp0android"
```

프로젝트 루트 폴더에 저장 후 더블클릭하면 Android Studio가 열립니다.

## 다음 단계

Android Studio가 열리면:

1. **Gradle 동기화 완료 대기**
   - 하단 상태바에서 "Gradle sync completed" 확인

2. **APK 빌드**
   - Build > Build Bundle(s) / APK(s) > Build APK(s)
   - 빌드 완료 후 "locate" 링크 클릭
   - APK 위치: `android/app/build/outputs/apk/debug/app-debug.apk`

3. **APK 설치**
   - APK 파일을 Android 기기로 전송
   - 기기에서 파일 관리자로 APK 열기
   - 설치 진행


