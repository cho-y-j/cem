# Android Studio 에뮬레이터 실행 가이드

## 방법 1: Device Manager에서 실행 (가장 쉬운 방법)

### 1단계: Device Manager 열기
1. Android Studio를 엽니다
2. 상단 메뉴에서 **View** > **Tool Windows** > **Device Manager** 클릭
   - 또는 오른쪽 상단의 **Device Manager** 아이콘 클릭 (휴대폰 모양 아이콘)

### 2단계: 에뮬레이터 선택 및 실행
1. **Device Manager** 창에서 사용 가능한 에뮬레이터 목록 확인
2. 원하는 에뮬레이터 옆의 **▶️ 재생 버튼** 클릭
   - 예: "Medium Phone API 36.1" 같은 항목
3. 에뮬레이터가 시작됩니다 (처음 시작 시 몇 분 소요)

### 3단계: 에뮬레이터 확인
- 에뮬레이터 창이 열리면 준비 완료!
- Android 홈 화면이 보이면 정상 작동 중입니다

## 방법 2: 상단 툴바에서 실행

1. Android Studio 상단의 **디바이스 선택 드롭다운** 클릭
   - "No devices" 또는 기기 이름이 표시된 드롭다운
2. **Device Manager** 선택
3. 에뮬레이터 목록에서 원하는 기기 선택 후 **▶️ 재생 버튼** 클릭

## 방법 3: Run 버튼으로 자동 실행

1. Android Studio에서 프로젝트 열기
2. 상단의 **녹색 Run 버튼 (▶️)** 클릭
3. 에뮬레이터가 없으면 자동으로 Device Manager가 열립니다
4. 에뮬레이터를 선택하고 실행

## 에뮬레이터가 없는 경우

### 새 에뮬레이터 생성하기

1. **Device Manager** 열기
2. **+ Create Device** 버튼 클릭
3. **Phone** 카테고리 선택
4. 원하는 기기 선택 (예: Pixel 5)
5. **Next** 클릭
6. 시스템 이미지 선택 (예: API 35, Android 15)
   - 다운로드가 필요하면 **Download** 클릭
7. **Next** > **Finish** 클릭
8. 에뮬레이터가 생성되면 **▶️ 재생 버튼**으로 실행

## 에뮬레이터 실행 확인

에뮬레이터가 실행되면:
- Android Studio 하단에 "Medium Phone API 36.1" 같은 기기 이름이 표시됩니다
- 에뮬레이터 창에 Android 화면이 보입니다

## 앱 설치 방법

### 방법 1: APK 드래그 앤 드롭
1. 바탕화면의 `cem-app-debug.apk` 파일을 에뮬레이터 화면으로 드래그
2. 설치 완료 후 앱 실행

### 방법 2: Android Studio Run 버튼
1. 에뮬레이터가 실행 중인 상태에서
2. Android Studio 상단의 **녹색 Run 버튼 (▶️)** 클릭
3. 앱이 자동으로 빌드되고 설치됩니다

### 방법 3: ADB 명령어 (고급)
```powershell
# Android SDK의 adb 경로 사용
& "C:\Users\조연지\AppData\Local\Android\Sdk\platform-tools\adb.exe" install "C:\Users\조연지\Desktop\cem-app-debug.apk"
```

## 문제 해결

### 에뮬레이터가 느리게 실행되는 경우
- HAXM 또는 Hyper-V 설정 확인
- 에뮬레이터 설정에서 RAM/CPU 할당량 조정

### 에뮬레이터가 시작되지 않는 경우
- Android Studio 재시작
- AVD Manager에서 에뮬레이터 삭제 후 재생성

### "Medium Phone API 36.1 is already running" 오류
- 이미 에뮬레이터가 실행 중입니다
- 기존 에뮬레이터 창을 찾아 사용하거나
- Device Manager에서 에뮬레이터를 종료 후 다시 실행


