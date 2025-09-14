# iOS Setup Guide

## Identifier Normalization

This project uses normalized identifiers to ensure consistent iOS deployment:
- **Bundle ID**: `com.monolit.eyehear`
- **Development Team**: `TC7CDLV36Q`
- **Code Signing**: Automatic

## Required Package.json Scripts

Add these scripts to your `package.json`:
```json
{
  "scripts": {
    "ios:setup-signing": "node scripts/setup-ios-signing.js",
    "ios:build": "npm run build && npx cap sync ios",
    "ios:run": "npm run ios:build && npx cap run ios"
  }
}
```

## Setup Process

### Initial iOS Platform Setup
```bash
# 1. Install dependencies
npm install

# 2. Add iOS platform
npx cap add ios

# 3. Configure signing and bundle identifiers
npm run ios:setup-signing

# 4. Build and sync
npm run build
npx cap sync ios
```

### After Pulling Changes
```bash
# Always run after pulling changes to ensure capacitor.config.json is updated
npm run build && npx cap sync ios
```

### Running on Device/Simulator
```bash
# Build for iOS deployment
npm run ios:build

# Run on iOS (opens Xcode)
npx cap run ios
```

## Important Notes

- The `capacitor.config.ts` file contains the canonical app ID: `com.monolit.eyehear`
- After any changes to Capacitor config, always run `npx cap sync ios`
- The iOS project is configured for automatic signing with team ID `TC7CDLV36Q`
- All bundle identifiers are kept in sync between Capacitor and Xcode project

## Troubleshooting

### Bundle ID Mismatch
If you see bundle ID conflicts:
```bash
npm run ios:setup-signing
npx cap sync ios
```

### Signing Issues
- Ensure you have access to development team `TC7CDLV36Q`
- Xcode project is configured for automatic signing
- Clear derived data in Xcode if needed

### Asset Loading Issues
- Verify `base: './'` is set in `vite.config.ts`
- Check that no `<base>` tags exist in `index.html`
- All assets should use relative paths starting with `./`