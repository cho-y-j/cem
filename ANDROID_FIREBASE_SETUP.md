# Android Firebase 설정 가이드

## 현재 상태
- ✅ `google-services.json` 파일이 `android/app/`에 있음
- ✅ Capacitor Push Notifications 플러그인 설치 완료
- ✅ FCM 토큰 등록 코드 구현 완료

## Android Studio에서 설정하기

### 1. Android Studio에서 프로젝트 열기
```bash
npx cap open android
```

### 2. 프로젝트 레벨 build.gradle 수정

Android Studio에서 `android/build.gradle` 파일을 찾아서 수정:

```gradle
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.7.2'
        classpath 'com.google.gms:google-services:4.4.0'  // 이 줄 추가
    }
}
```

### 3. 앱 레벨 build.gradle 수정

`android/app/build.gradle` 파일을 찾아서:

**파일 맨 위에 추가:**
```gradle
apply plugin: 'com.google.gms.google-services'  // 이 줄 추가
```

**dependencies 섹션에 추가:**
```gradle
dependencies {
    // ... 기존 dependencies ...
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-messaging'
}
```

### 4. AndroidManifest.xml 수정

`android/app/src/main/AndroidManifest.xml` 파일을 찾아서:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- 인터넷 권한 추가 -->
    <uses-permission android:name="android.permission.INTERNET" />
    
    <application>
        <!-- ... 기존 내용 ... -->
        
        <!-- 알림 채널 설정 (Android 8.0+) -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_channel_id"
            android:value="cem_notifications" />
    </application>
</manifest>
```

### 5. 알림 채널 생성 (Java/Kotlin 코드)

`android/app/src/main/java/com/cem/app/MainActivity.java` 파일을 찾아서:

```java
package com.cem.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // 알림 채널 생성 (Android 8.0+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                "cem_notifications",
                "CEM 알림",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("CEM 앱 알림 채널");
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    }
}
```

## 빌드 및 테스트

### 1. Gradle 동기화
Android Studio에서 "Sync Now" 클릭

### 2. APK 빌드
- Build > Build Bundle(s) / APK(s) > Build APK(s)
- 또는 터미널에서: `cd android && ./gradlew assembleDebug`

### 3. 테스트
- 실제 Android 기기에 APK 설치
- 앱 실행 후 로그인
- FCM 토큰이 등록되는지 확인 (서버 로그에서 확인)
- 알림 전송 테스트

## 문제 해결

### google-services.json 파일을 찾을 수 없다는 오류
- `google-services.json` 파일이 `android/app/` 폴더에 있는지 확인
- 파일 이름이 정확한지 확인 (대소문자 구분)

### 빌드 오류
- Android Studio에서 "Invalidate Caches / Restart" 실행
- `npx cap sync android` 다시 실행

### FCM 토큰이 등록되지 않음
- 앱 권한 설정 확인 (알림 권한)
- 서버 로그에서 FCM 초기화 메시지 확인
- 환경 변수가 올바르게 설정되었는지 확인


