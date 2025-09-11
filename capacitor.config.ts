import { CapacitorConfig } from '@capacitor/cli';

// Guard against remote server URL in production builds
if (process.env.NODE_ENV === 'production' && process.env.CAPACITOR_SERVER_URL) {
  throw new Error('Production builds must not use remote server.url - app must be self-contained with bundled assets');
}

const config: CapacitorConfig = {
  appId: 'app.lovable.9f6d2239d1174792964a0f73a0226ebb',
  appName: 'eyehear-hungarian-flow',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: true
    }
  },
  server: process.env.NODE_ENV === 'development' ? {
    // Development only: Hot-reload from Lovable sandbox
    url: 'https://9f6d2239-d117-4792-964a-0f73a0226ebb.lovableproject.com?forceHideBadge=true',
    cleartext: true,
    allowNavigation: [
      'https://9f6d2239-d117-4792-964a-0f73a0226ebb.lovableproject.com'
    ]
  } : {
    // Production: Self-contained app with bundled assets only
    cleartext: false
    // NO server.url - forces use of bundled dist assets
    // NO allowNavigation - app is fully self-contained
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