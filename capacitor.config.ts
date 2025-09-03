import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.9f6d2239d1174792964a0f73a0226ebb',
  appName: 'eyehear-hungarian-flow',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: true
    }
  },
  server: {
    url: 'https://9f6d2239-d117-4792-964a-0f73a0226ebb.lovableproject.com?forceHideBadge=true',
    cleartext: true,
    allowNavigation: [
      'https://9f6d2239-d117-4792-964a-0f73a0226ebb.lovableproject.com'
    ]
  },
  ios: {
    contentInset: 'automatic',
    path: 'ios'
  },
  android: {
    path: 'android'
  }
};

export default config;