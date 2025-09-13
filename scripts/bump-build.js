#!/usr/bin/env node

/**
 * iOS Build Number Bumper
 * 
 * Updates CFBundleVersion in iOS Info.plist to current timestamp
 * for release builds. This ensures each release has a unique build number
 * required for App Store submissions.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INFO_PLIST_PATH = path.join(__dirname, '../ios/App/App/Info.plist');

function bumpIOSBuildNumber() {
  // Check if iOS Info.plist exists
  if (!fs.existsSync(INFO_PLIST_PATH)) {
    console.log('ℹ️ iOS Info.plist not found - skipping build number bump');
    console.log('💡 Run "npx cap add ios" first to create iOS project');
    return true;
  }

  try {
    // Generate timestamp-based build number
    const buildNumber = Math.floor(Date.now() / 1000).toString();
    
    // Use PlistBuddy to update CFBundleVersion
    const plistBuddyCmd = `/usr/libexec/PlistBuddy -c "Set :CFBundleVersion ${buildNumber}" "${INFO_PLIST_PATH}"`;
    
    execSync(plistBuddyCmd, { stdio: 'pipe' });
    
    console.log(`✅ iOS build number updated to: ${buildNumber}`);
    console.log(`📱 CFBundleVersion set in: ${INFO_PLIST_PATH}`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to update iOS build number:', error.message);
    console.error('💡 Make sure you\'re running on macOS with PlistBuddy available');
    return false;
  }
}

function runBuildBump() {
  console.log('🔢 Bumping iOS build number for release...');
  
  const success = bumpIOSBuildNumber();
  
  if (success) {
    console.log('✅ Build number bump completed');
    return true;
  } else {
    console.error('❌ Build number bump failed');
    return false;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const success = runBuildBump();
  process.exit(success ? 0 : 1);
}

export { runBuildBump };