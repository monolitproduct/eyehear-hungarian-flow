# iOS Setup Guide

## Identifier Normalization

This project uses normalized identifiers to ensure consistent iOS deployment:
- **Bundle ID**: `com.monolit.eyehear`
- **Development Team**: Auto-detected Personal Team ("David dr. Proczeller")
- **Code Signing**: Automatic

## Required Package.json Scripts

Add this script to your `package.json`:
```json
{
  "scripts": {
    "ios:prepare": "npm run build && npx cap sync ios && node scripts/setup-ios-signing.js && (cd ios/App && pod install || true)"
  }
}
```

## Setup Process

### Fresh Clone or After `npx cap add ios`
```bash
# 1. Install dependencies  
npm ci

# 2. Add the ios:prepare script to package.json (see above)

# 3. Prepare iOS project (builds, syncs, configures signing, installs pods)
npm run ios:prepare

# 4. Run on device/simulator
npx cap run ios
```

### After Pulling Changes
```bash
# Always run after pulling changes
npm run ios:prepare
```

### Manual Steps (if needed)
```bash
# Individual commands (ios:prepare does all of these)
npm run build
npx cap sync ios
node scripts/setup-ios-signing.js
cd ios/App && pod install
```

## Important Notes

- The `capacitor.config.ts` file contains the canonical app ID: `com.monolit.eyehear`
- After any changes to Capacitor config, always run `npm run ios:prepare`
- The iOS project auto-detects your Personal Team ("David dr. Proczeller") for automatic signing
- All bundle identifiers are kept in sync between Capacitor and Xcode project
- Personal Team is fine for device testing; for App Store, switch to the org's paid team later

## Native iOS Speech Recognition

This app now supports native iOS speech recognition through Capacitor:

- **On iOS devices**: Uses Apple's native speech recognition with better accuracy and performance
- **On web browsers**: Falls back to Web Speech API (Chrome/Safari required)  
- **Permissions**: App will request microphone and speech recognition permissions on first use
- **Languages**: Configured for Hungarian (`hu-HU`) speech recognition

The "Browser not supported" banner will only appear on web when the browser lacks Web Speech API support - it never shows on iOS devices.

**Required privacy strings** (already included in `Info.plist`):
- `NSMicrophoneUsageDescription`: For speech recording
- `NSSpeechRecognitionUsageDescription`: For Apple's speech recognition service

## Troubleshooting

### Bundle ID Mismatch
If you see bundle ID conflicts:
```bash
node scripts/setup-ios-signing.js
npx cap sync ios
```

### Signing Issues
- The setup script auto-detects your Personal Team ("David dr. Proczeller") 
- Xcode project is configured for automatic signing
- Clear derived data in Xcode if needed

### Asset Loading Issues
- Verify `base: './'` is set in `vite.config.ts`
- Check that no `<base>` tags exist in `index.html`
- All assets should use relative paths starting with `./`