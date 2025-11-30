import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cem.app',
  appName: 'CEM',
  webDir: 'dist',
  bundledWebRuntime: false,
  // IMPORTANT: 앱에서 Capacitor 플러그인(NFC, GPS, Biometric 등)을 사용하려면
  // server.url을 제거하고 로컬 빌드를 로드해야 합니다.
  // 개발 중 원격 서버를 보려면 주석을 제거하세요.
  // server: {
  //   url: "https://cem-21tp.onrender.com",
  //   cleartext: true
  // },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;


