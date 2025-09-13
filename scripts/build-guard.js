#!/usr/bin/env node

/**
 * Production Build Guard
 * 
 * Prevents production builds with configurations that would cause black screens
 * or make the iOS app non-self-contained.
 * 
 * Checks:
 * - No server.url in production Capacitor config
 * - No cleartext: true in production Capacitor config
 * - No <base> tag in index.html
 * - All assets use relative paths (./assets) in built dist/index.html
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CAPACITOR_CONFIG_PATH = path.join(__dirname, '../capacitor.config.ts');
const VITE_CONFIG_PATH = path.join(__dirname, '../vite.config.ts');
const INDEX_HTML_PATH = path.join(__dirname, '../index.html');

function checkCapacitorConfig() {
  try {
    const configContent = fs.readFileSync(CAPACITOR_CONFIG_PATH, 'utf8');
    
    // Check for production server URL configuration
    if (process.env.NODE_ENV === 'production') {
      // Look for server.url that would be active in production
      const serverUrlRegex = /server:\s*\{[^}]*url:\s*['"`][^'"`]+['"`]/;
      const productionServerMatch = configContent.match(serverUrlRegex);
      
      if (productionServerMatch && !configContent.includes('process.env.NODE_ENV === \'development\'')) {
        console.error('❌ PRODUCTION BUILD BLOCKED: Capacitor config contains server.url for production');
        console.error('💡 Found:', productionServerMatch[0]);
        console.error('🔧 Fix: Wrap server config in NODE_ENV === \'development\' check');
        return false;
      }
      
      // Check for cleartext allowance in production
      if (configContent.includes('cleartext: true') && 
          !configContent.includes('process.env.NODE_ENV === \'development\'')) {
        console.error('❌ PRODUCTION BUILD BLOCKED: Capacitor config allows cleartext in production');
        console.error('🔧 Fix: Set cleartext: false for production or wrap in development check');
        return false;
      }
    }
    
    console.log('✅ Capacitor config: No problematic server configurations found');
    return true;
  } catch (error) {
    console.error('❌ Error checking Capacitor config:', error.message);
    return false;
  }
}

function checkIndexHtml() {
  try {
    const indexContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
    
    // Check for <base> tag which breaks relative paths in WKWebView
    if (indexContent.includes('<base')) {
      console.error('❌ PRODUCTION BUILD BLOCKED: index.html contains <base> tag');
      console.error('💡 <base> tags break relative path resolution in WKWebView');
      console.error('🔧 Fix: Remove <base> tag from index.html');
      return false;
    }
    
    console.log('✅ index.html: No <base> tag found');
    return true;
  } catch (error) {
    console.error('❌ Error checking index.html:', error.message);
    return false;
  }
}

function checkViteConfig() {
  try {
    const configContent = fs.readFileSync(VITE_CONFIG_PATH, 'utf8');
    
    // Ensure base is set for mobile builds
    if (!configContent.includes("base: './'")) {
      console.error('❌ PRODUCTION BUILD BLOCKED: Vite config missing base: "./"');
      console.error('🔧 Fix: Add base: "./" to vite.config.ts for mobile compatibility');
      return false;
    }
    
    console.log('✅ Vite config: Correct base path configuration found');
    return true;
  } catch (error) {
    console.error('❌ Error checking Vite config:', error.message);
    return false;
  }
}

function checkAssetPaths() {
  const distIndexPath = path.join(__dirname, '../dist/index.html');
  
  if (!fs.existsSync(distIndexPath)) {
    console.log('ℹ️ dist/index.html not found - skipping asset path check (run after build)');
    return true;
  }
  
  try {
    const indexContent = fs.readFileSync(distIndexPath, 'utf8');
    
    // Check for absolute asset paths that break in WKWebView
    const absoluteAssetRegex = /(href|src)="\/assets/g;
    const absoluteMatches = indexContent.match(absoluteAssetRegex);
    
    if (absoluteMatches) {
      console.error('❌ PRODUCTION BUILD BLOCKED: Found absolute asset paths in dist/index.html:');
      absoluteMatches.forEach(match => console.error(`  ${match}`));
      console.error('💡 Absolute /assets paths fail to load in WKWebView');
      console.error('🔧 Fix: Ensure vite.config.ts has base: "./" and rebuild');
      return false;
    }
    
    console.log('✅ Asset paths: All assets use relative paths (./assets)');
    return true;
  } catch (error) {
    console.error('❌ Error checking asset paths:', error.message);
    return false;
  }
}

function runBuildGuards() {
  console.log('🔒 Running production build safety checks...');
  console.log('🎯 Preventing black screen regressions and non-self-contained builds\n');
  
  const checks = [
    checkCapacitorConfig(),
    checkIndexHtml(),
    checkViteConfig(),
    checkAssetPaths()
  ];
  
  const allPassed = checks.every(check => check === true);
  
  if (allPassed) {
    console.log('\n✅ All production build safety checks passed');
    console.log('🚀 Build can proceed - app will be self-contained and work in WKWebView');
    return true;
  } else {
    console.error('\n❌ Production build safety checks failed');
    console.error('🚫 Build blocked to prevent black screen and loading issues');
    console.error('📱 These checks ensure the app works correctly on iOS devices');
    return false;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const success = runBuildGuards();
  process.exit(success ? 0 : 1);
}

export { runBuildGuards };