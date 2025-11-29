import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cem.app',
  appName: 'CEM',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    url: "https://cem-21tp.onrender.com",
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;


