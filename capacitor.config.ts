import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jackale2.airplanejam', // permanent on Google Play and the App Store
  appName: 'Airplane Jam',
  webDir: 'dist',
  android: { backgroundColor: '#9fd7ee' },
};

export default config;
