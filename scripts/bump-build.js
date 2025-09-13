#!/usr/bin/env node

/**
 * Build Version Bumper for iOS Release Builds
 * 
 * This script automatically increments the CFBundleVersion in Info.plist
 * with a timestamp-based build number for iOS App Store releases.
 * 
 * Usage: npm run bump-build
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INFO_PLIST_PATH = path.join(__dirname, '../ios/App/App/Info.plist');

function generateBuildNumber() {
  // Generate timestamp-based build number: YYYYMMDDHHMM
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  
  return `${year}${month}${day}${hour}${minute}`;
}

function bumpBuildVersion() {
  try {
    // Check if Info.plist exists
    if (!fs.existsSync(INFO_PLIST_PATH)) {
      console.error(`❌ Info.plist not found at: ${INFO_PLIST_PATH}`);
      console.log('💡 Make sure to run `npx cap add ios` first');
      process.exit(1);
    }

    // Read the Info.plist file
    const infoPlistContent = fs.readFileSync(INFO_PLIST_PATH, 'utf8');
    
    // Generate new build number
    const newBuildNumber = generateBuildNumber();
    
    // Replace CFBundleVersion value
    const updatedContent = infoPlistContent.replace(
      /<key>CFBundleVersion<\/key>\s*<string>.*?<\/string>/,
      `<key>CFBundleVersion</key>\n\t<string>${newBuildNumber}</string>`
    );

    // Write back to file
    fs.writeFileSync(INFO_PLIST_PATH, updatedContent, 'utf8');
    
    console.log(`✅ Build version bumped to: ${newBuildNumber}`);
    console.log(`📱 iOS Info.plist updated at: ${INFO_PLIST_PATH}`);
    
    // Also log current CFBundleShortVersionString for reference
    const versionMatch = infoPlistContent.match(/<key>CFBundleShortVersionString<\/key>\s*<string>(.*?)<\/string>/);
    if (versionMatch) {
      console.log(`📦 App version: ${versionMatch[1]}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error bumping build version:', error.message);
    return false;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const success = bumpBuildVersion();
  process.exit(success ? 0 : 1);
}

export { bumpBuildVersion };