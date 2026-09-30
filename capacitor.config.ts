import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.airplanejam', // TODO(owner): final reverse-domain id (cannot change after publishing)
  appName: 'Airplane Jam', // TODO(owner): final game name
  webDir: 'dist',
  android: { backgroundColor: '#9fd7ee' },
};

export default config;
