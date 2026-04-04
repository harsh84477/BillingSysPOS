import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smartpos.app',
  appName: 'Invoice Adda',
  webDir: 'dist',
  server: {
    // No local server needed — app uses Supabase (cloud backend)
    // Remove this block entirely so the APK loads from bundled assets
    androidScheme: 'https',
  },
  android: {
    minSdkVersion: 24, // Android 7.0 (Nougat) — minimum required by Capacitor/Cordova
    targetSdkVersion: 34,
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
  plugins: {
    // IndexedDB works natively in the WebView — no extra plugin needed
  },
};

export default config;
