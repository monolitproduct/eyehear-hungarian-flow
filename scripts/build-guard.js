#!/usr/bin/env node

/**
 * Production Build Guard
 * 
 * Prevents production builds with development configurations that would
 * make the iOS app non-self-contained (requiring remote server URLs).
 * 
 * Checks:
 * - No server.url in production Capacitor config
 * - No development-only configurations in production builds
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CAPACITOR_CONFIG_PATH = path.join(__dirname, '../capacitor.config.ts');
const VITE_CONFIG_PATH = path.join(__dirname, '../vite.config.ts');

function checkCapacitorConfig() {
  try {
    const configContent = fs.readFileSync(CAPACITOR_CONFIG_PATH, 'utf8');
    
    // Check for development server URL in production
    if (process.env.NODE_ENV === 'production') {
      // Look for hardcoded server URLs that would be active in production
      const hasProductionServerUrl = configContent.includes('server: {') && 
        !configContent.includes('process.env.NODE_ENV === \'development\'');
      
      if (hasProductionServerUrl) {
        console.error('❌ PRODUCTION BUILD BLOCKED: Capacitor config contains server.url for production');
        console.error('💡 Production builds must be self-contained. Remove server.url from production config.');
        return false;
      }
      
      // Check for cleartext allowance in production
      if (configContent.includes('cleartext: true') && 
          !configContent.includes('process.env.NODE_ENV === \'development\'')) {
        console.error('❌ PRODUCTION BUILD BLOCKED: Capacitor config allows cleartext in production');
        console.error('💡 Production builds must use HTTPS only. Set cleartext: false for production.');
        return false;
      }
    }
    
    console.log('✅ Capacitor config: Production safety checks passed');
    return true;
  } catch (error) {
    console.error('❌ Error checking Capacitor config:', error.message);
    return false;
  }
}

function checkViteConfig() {
  try {
    const configContent = fs.readFileSync(VITE_CONFIG_PATH, 'utf8');
    
    // Ensure base is set for mobile builds
    if (!configContent.includes("base: './'")) {
      console.warn('⚠️  Vite config: base should be set to "./" for mobile compatibility');
    }
    
    console.log('✅ Vite config: Production safety checks passed');
    return true;
  } catch (error) {
    console.error('❌ Error checking Vite config:', error.message);
    return false;
  }
}

function runBuildGuards() {
  console.log('🔒 Running production build safety checks...');
  
  const checks = [
    checkCapacitorConfig(),
    checkViteConfig()
  ];
  
  const allPassed = checks.every(check => check === true);
  
  if (allPassed) {
    console.log('✅ All production build safety checks passed');
    return true;
  } else {
    console.error('❌ Production build safety checks failed');
    console.error('🚫 Build blocked to prevent non-self-contained iOS app');
    return false;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const success = runBuildGuards();
  process.exit(success ? 0 : 1);
}

export { runBuildGuards };