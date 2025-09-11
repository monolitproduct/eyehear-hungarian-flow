# EyeHear - App Store Connect Privacy Alignment

## Data Types Collected (App Store Connect Declaration)

This document outlines exactly what data types and purposes to declare in App Store Connect to match the app's actual behavior and PrivacyInfo.xcprivacy file.

### 1. User Content - Audio/Text
**Collection:** YES  
**Linked to User:** YES  
**Tracking:** NO  
**Purpose:** App Functionality  
**Details:** Speech transcripts created by the user, stored in Supabase database

### 2. Contact Info - Email Address  
**Collection:** YES  
**Linked to User:** YES  
**Tracking:** NO  
**Purpose:** App Functionality  
**Details:** Required for user account creation and authentication via Supabase Auth

### 3. Identifiers - User ID
**Collection:** YES  
**Linked to User:** YES  
**Tracking:** NO  
**Purpose:** App Functionality  
**Details:** Supabase user UUID for data association and access control

## Data NOT Collected

- ❌ Location Data
- ❌ Browsing History  
- ❌ Search History
- ❌ Usage Data for Analytics/Advertising
- ❌ Diagnostics
- ❌ Financial Info
- ❌ Health & Fitness
- ❌ Sensitive Info
- ❌ Contacts
- ❌ Photos/Videos (beyond temporary speech processing)

## Third-Party Data Processing

### Apple Speech Recognition
- **What:** Audio data sent to Apple servers for speech-to-text processing
- **Purpose:** Core app functionality (real-time Hungarian speech transcription)
- **Retention:** Governed by Apple's Privacy Policy
- **User Control:** Users can disable speech recognition (app becomes non-functional)

### Supabase
- **What:** Email, transcripts, user metadata
- **Purpose:** Data storage and user authentication
- **Location:** Hosted by Supabase
- **Retention:** User-controlled (export/delete functionality provided)

## User Rights Implementation

### Export Data (GDPR Article 20)
- ✅ Download all user data as JSON file
- ✅ Includes: profile info, all transcripts, metadata
- ✅ Available via Settings > Privacy > Export Data

### Delete Data (GDPR Article 17)
- ✅ Delete all transcripts while keeping account
- ✅ Delete entire account and all data
- ✅ Confirmation dialogs with Hungarian text
- ✅ Available via Settings > Privacy

### Transparency (GDPR Article 12)
- ✅ Hungarian privacy notice in-app
- ✅ Clear explanation of Apple Speech Recognition data flow
- ✅ No tracking disclaimer
- ✅ Data storage location transparency

## App Store Connect Settings

### Privacy Tab Configuration:
1. **Does this app collect data?** → YES
2. **Data Types:**
   - Contact Info > Email Address → App Functionality
   - User Content > Audio Data → App Functionality  
   - Identifiers > User ID → App Functionality
3. **Third-Party Partners:** Apple (Speech Recognition)
4. **Data Retention:** User-controlled deletion available

### Hungarian Localization:
- ✅ NSMicrophoneUsageDescription in Hungarian
- ✅ NSSpeechRecognitionUsageDescription in Hungarian
- ✅ App Store metadata in Hungarian
- ✅ In-app privacy screens in Hungarian

## PrivacyInfo.xcprivacy Validation

The included `ios/App/PrivacyInfo.xcprivacy` declares:
- ✅ NSPrivacyTracking: false
- ✅ User Content collection for app functionality
- ✅ Email Address collection for app functionality  
- ✅ User ID collection for app functionality
- ✅ Required Reason APIs: UserDefaults (CA92.1), File Timestamp (C617.1)

## Release Checklist

Before App Store submission:
- [ ] PrivacyInfo.xcprivacy included in iOS build
- [ ] App Store Connect privacy settings match this document
- [ ] Export/Delete functions tested with production Supabase
- [ ] Hungarian permission alerts verified on device
- [ ] No cleartext traffic in Release build
- [ ] Self-contained app assets (no remote server.url)

## Support Contact

For privacy-related questions: support@eyehear.app