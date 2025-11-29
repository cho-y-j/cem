# Clean 빌드 후 재빌드 가이드

## 문제
모든 태스크가 `UP-TO-DATE`로 표시되어 실제 빌드가 실행되지 않았습니다.

## 해결 방법

### Android Studio에서:

1. **Clean Project 실행**
   - 상단 메뉴: `Build` > `Clean Project`
   - 완료될 때까지 대기 (몇 분 소요)

2. **Rebuild Project 실행**
   - 상단 메뉴: `Build` > `Rebuild Project`
   - 또는 Gradle 탭에서 `clean` 실행 후 `assembleDebug` 실행

3. **빌드 완료 후 APK 확인**
   - `android\app\build\outputs\apk\debug\app-debug.apk`

### Gradle 탭에서 직접:

1. **Gradle 탭 열기** (오른쪽)
2. **`android` > `app` > `Tasks` > `build` 확장**
3. **`clean` 더블클릭** (완료 대기)
4. **`assembleDebug` 더블클릭** (빌드 실행)
5. **Build 탭에서 진행 상황 확인**

## APK 파일 위치

빌드가 성공하면 다음 위치에 생성됩니다:
```
android\app\build\outputs\apk\debug\app-debug.apk
```

## 확인 방법

파일 탐색기에서 직접 확인:
```
C:\Users\조연지\Documents\GitHub\cem\cem\android\app\build\outputs\apk\debug\
```


