# Domain Verification Files for Deep Linking

This directory contains domain verification files required for iOS Universal Links and Android App Links.

## iOS Universal Links

**File**: `apple-app-site-association`

### Setup Instructions:

1. **Get your Team ID** from Apple Developer Portal:
   - Go to https://developer.apple.com/account
   - Your Team ID is shown in the top right corner

2. **Update the file**:
   - Replace `TEAM_ID` with your actual Apple Developer Team ID
   - Example: `9JA89QQLNQ.io.moneko.app`

3. **Deploy to your web server**:
   - This file MUST be served from `https://moneko.app/.well-known/apple-app-site-association`
   - Content-Type: `application/json`
   - No file extension (must be exactly `apple-app-site-association`)
   - Must be accessible over HTTPS
   - No redirects allowed

4. **Verify deployment**:
```bash
curl -I https://moneko.app/.well-known/apple-app-site-association
# Should return 200 OK with Content-Type: application/json
```

5. **Test Universal Links**:
   - Apple CDN caches this file, so changes may take hours to propagate
   - Use Apple's App Search Validation Tool: https://search.developer.apple.com/appsearch-validation-tool
   - Test on real device (Simulator doesn't support Universal Links)

---

## Android App Links

**File**: `assetlinks.json`

### Setup Instructions:

1. **Get your SHA-256 fingerprints**:

```bash
# Debug keystore (for development testing)
keytool -list -v -keystore ~/.android/debug.keystore \
  -alias androiddebugkey \
  -storepass android \
  -keypass android

# Release keystore (for production)
keytool -list -v -keystore /path/to/your/release.keystore \
  -alias your_alias_name

# Look for SHA256: XX:XX:XX:XX:... in the output
# Remove colons and convert to lowercase for the JSON file
```

2. **Update the file**:
   - Replace `PUT_YOUR_DEBUG_SHA256_FINGERPRINT_HERE` with your debug SHA-256 (all lowercase, no colons)
   - Replace `PUT_YOUR_RELEASE_SHA256_FINGERPRINT_HERE` with your release SHA-256 (all lowercase, no colons)
   - You can have multiple fingerprints in the array (debug, release, etc.)

3. **Deploy to your web server**:
   - This file MUST be served from `https://moneko.app/.well-known/assetlinks.json`
   - Content-Type: `application/json`
   - Must be accessible over HTTPS
   - No redirects allowed

4. **Verify deployment**:
```bash
curl -I https://moneko.app/.well-known/assetlinks.json
# Should return 200 OK with Content-Type: application/json
```

5. **Test App Links**:
```bash
# Test using ADB (Android Debug Bridge)
adb shell am start -a android.intent.action.VIEW \
  -d "https://moneko.app/invites/test-token"

# Check if your app opens (not the browser)
```

6. **Google verification**:
   - Google Play Console → App Links verification
   - Add your domain and verify ownership
   - Upload SHA-256 fingerprints

---

## Deployment Checklist

### Before Deployment:
- [ ] Replace `TEAM_ID` in `apple-app-site-association` with your Apple Team ID
- [ ] Replace SHA-256 placeholders in `assetlinks.json` with actual fingerprints
- [ ] Ensure both files are valid JSON (use `jq` or online validator)

### After Deployment:
- [ ] Verify HTTPS accessibility for both files
- [ ] Check correct Content-Type headers (application/json)
- [ ] Test on real iOS device (Universal Links)
- [ ] Test on real Android device (App Links)
- [ ] Monitor Apple CDN propagation (can take 24-48 hours)
- [ ] Verify in Google Play Console

---

## Troubleshooting

### iOS Universal Links not working:

1. **Check file accessibility**:
```bash
curl https://moneko.app/.well-known/apple-app-site-association
```

2. **Common issues**:
   - Wrong Content-Type (must be `application/json`)
   - File has `.json` extension (must be no extension)
   - Redirects (must be direct 200 response)
   - Wrong Team ID or Bundle ID
   - Not testing on real device (Simulator doesn't support Universal Links)

3. **Force refresh on device**:
   - Uninstall and reinstall the app
   - Wait 24-48 hours for Apple CDN to update
   - Check Settings → Developer → Universal Links (iOS 15+)

### Android App Links not working:

1. **Check file accessibility**:
```bash
curl https://moneko.app/.well-known/assetlinks.json
```

2. **Common issues**:
   - Wrong SHA-256 fingerprint
   - SHA-256 has colons or uppercase letters (must be lowercase, no separators)
   - Wrong package name
   - `autoVerify="true"` missing from intent-filter in AndroidManifest.xml
   - Not testing on real device

3. **Verify intent filter**:
```bash
adb shell dumpsys package d
# Look for your package and verify intent filters
```

4. **Reset verified links**:
   - Settings → Apps → Your App → Open by default → Clear defaults
   - Reinstall the app

---

## Security Notes

- These files are publicly accessible (they must be for verification)
- They only contain app identifiers and cryptographic fingerprints (public information)
- No sensitive data should be in these files
- Regularly update fingerprints when you renew certificates

---

## More Information

- **iOS**: https://developer.apple.com/documentation/xcode/supporting-associated-domains
- **Android**: https://developer.android.com/training/app-links/verify-android-applinks
