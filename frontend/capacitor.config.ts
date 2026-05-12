import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fantasyroguelike.game',
  appName: 'Fantasy Roguelike',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  android: { allowMixedContent: true },
};

export default config;
