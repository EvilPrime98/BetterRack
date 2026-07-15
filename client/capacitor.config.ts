import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.amin.comicrackweb',
  appName: 'comic-rack-web',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    allowNavigation: ['192.168.1.117']
  }
};

export default config;
