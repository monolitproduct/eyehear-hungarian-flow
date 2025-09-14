#!/usr/bin/env node

/**
 * Configure iOS project with proper bundle identifier and signing settings
 * Run this after `npx cap add ios` to ensure consistent identifiers
 */

const fs = require('fs');
const path = require('path');

const XCODE_PROJECT_PATH = 'ios/App/App.xcodeproj/project.pbxproj';
const BUNDLE_ID = 'com.monolit.eyehear';
const DEVELOPMENT_TEAM = 'TC7CDLV36Q';

function updateXcodeProject() {
  if (!fs.existsSync(XCODE_PROJECT_PATH)) {
    console.log('❌ Xcode project not found. Run `npx cap add ios` first.');
    process.exit(1);
  }

  console.log('🔧 Configuring iOS project signing and bundle identifier...');

  let content = fs.readFileSync(XCODE_PROJECT_PATH, 'utf8');

  // Update PRODUCT_BUNDLE_IDENTIFIER for all build configurations
  content = content.replace(
    /PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/g,
    `PRODUCT_BUNDLE_IDENTIFIER = ${BUNDLE_ID};`
  );

  // Set development team
  content = content.replace(
    /DEVELOPMENT_TEAM = [^;]*;/g,
    `DEVELOPMENT_TEAM = ${DEVELOPMENT_TEAM};`
  );

  // Add DEVELOPMENT_TEAM if not present
  if (!content.includes('DEVELOPMENT_TEAM')) {
    content = content.replace(
      /(CODE_SIGN_STYLE = [^;]+;)/g,
      `$1\n\t\t\t\tDEVELOPMENT_TEAM = ${DEVELOPMENT_TEAM};`
    );
  }

  // Set automatic code signing
  content = content.replace(
    /CODE_SIGN_STYLE = [^;]+;/g,
    'CODE_SIGN_STYLE = Automatic;'
  );

  // Clear provisioning profile specifier for automatic signing  
  content = content.replace(
    /PROVISIONING_PROFILE_SPECIFIER = [^;]*;/g,
    'PROVISIONING_PROFILE_SPECIFIER = "";'
  );

  // Add PROVISIONING_PROFILE_SPECIFIER if not present
  if (!content.includes('PROVISIONING_PROFILE_SPECIFIER')) {
    content = content.replace(
      /(CODE_SIGN_STYLE = Automatic;)/g,
      '$1\n\t\t\t\tPROVISIONING_PROFILE_SPECIFIER = "";'
    );
  }

  // Disable user script sandboxing to fix rsync sandbox errors
  content = content.replace(
    /ENABLE_USER_SCRIPT_SANDBOXING = [^;]*;/g,
    'ENABLE_USER_SCRIPT_SANDBOXING = NO;'
  );

  // Add ENABLE_USER_SCRIPT_SANDBOXING if not present
  if (!content.includes('ENABLE_USER_SCRIPT_SANDBOXING')) {
    content = content.replace(
      /(CODE_SIGN_STYLE = Automatic;)/g,
      '$1\n\t\t\t\tENABLE_USER_SCRIPT_SANDBOXING = NO;'
    );
  }

  // Ensure PBXProject TargetAttributes includes DevelopmentTeam
  const targetAttributesRegex = /(TargetAttributes = \{[^}]*?[A-F0-9]{24} = \{)/g;
  content = content.replace(targetAttributesRegex, (match) => {
    if (!match.includes('DevelopmentTeam')) {
      return match + `\n\t\t\t\t\tDevelopmentTeam = ${DEVELOPMENT_TEAM};`;
    }
    return match.replace(/DevelopmentTeam = [^;]*;/, `DevelopmentTeam = ${DEVELOPMENT_TEAM};`);
  });

  // Fix CocoaPods build phase file lists
  content = fixCocoaPodsBuildPhase(content);

  fs.writeFileSync(XCODE_PROJECT_PATH, content, 'utf8');

  console.log('✅ iOS project configured successfully:');
  console.log(`   • Bundle ID: ${BUNDLE_ID}`);
  console.log(`   • Development Team: ${DEVELOPMENT_TEAM}`);
  console.log('   • Code Signing: Automatic');
  console.log('   • Provisioning Profile: Automatic');
  console.log('   • Script Sandboxing: Disabled (fixes rsync errors)');
}

function fixCocoaPodsBuildPhase(content) {
  // Ensure CocoaPods build phase includes proper file lists to avoid build warnings
  const embedPodsRegex = /(\[CP\] Embed Pods Frameworks[\s\S]*?shellScript = "[^"]*";)/;
  
  if (embedPodsRegex.test(content)) {
    console.log('🔧 Updating CocoaPods build phase file lists...');
    
    // The file lists will be automatically created by CocoaPods when the project syncs
    // This ensures they're referenced in the build phase when they exist
    content = content.replace(
      /(inputFileListPaths = \([^)]*\);)/g,
      'inputFileListPaths = (\n\t\t\t\t"${PODS_ROOT}/Target Support Files/Pods-App/Pods-App-frameworks-${CONFIGURATION}-input-files.xcfilelist",\n\t\t\t);'
    );
    
    content = content.replace(
      /(outputFileListPaths = \([^)]*\);)/g,
      'outputFileListPaths = (\n\t\t\t\t"${PODS_ROOT}/Target Support Files/Pods-App/Pods-App-frameworks-${CONFIGURATION}-output-files.xcfilelist",\n\t\t\t);'
    );
  }
  
  return content;
}

function verifyConfiguration() {
  const content = fs.readFileSync(XCODE_PROJECT_PATH, 'utf8');
  
  const bundleIdMatches = content.match(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g) || [];
  const teamMatches = content.match(/DEVELOPMENT_TEAM = ([^;]+);/g) || [];
  
  console.log('\n🔍 Verification:');
  bundleIdMatches.forEach((match, i) => {
    console.log(`   Build Config ${i + 1}: ${match}`);
  });
  teamMatches.forEach((match, i) => {
    console.log(`   Team Config ${i + 1}: ${match}`);
  });

  const allBundlesCorrect = bundleIdMatches.every(match => match.includes(BUNDLE_ID));
  const allTeamsCorrect = teamMatches.every(match => match.includes(DEVELOPMENT_TEAM));

  if (allBundlesCorrect && allTeamsCorrect) {
    console.log('✅ All configurations match expected values');
  } else {
    console.log('❌ Some configurations may need manual adjustment');
  }
}

if (require.main === module) {
  updateXcodeProject();
  verifyConfiguration();
}

module.exports = { updateXcodeProject, verifyConfiguration };