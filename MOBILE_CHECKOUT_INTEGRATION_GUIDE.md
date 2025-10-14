# Mobile App - Web Checkout Integration Guide

## Quick Start

The mobile app can now navigate users to the web checkout page to purchase subscriptions without requiring web login. The web will handle validation and redirect back to the app after payment.

## Integration URL Format

### Base URL
```
https://moneko.com/checkout
```

### Required Parameters

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| `userId` | Yes | The user's unique ID from your mobile app | `123e4567-e89b-12d3-a456-426614174000` |
| `plan` | No | Subscription plan (default: "plus") | `plus`, `premium`, `lifetime` |
| `billing` | No | Billing interval (default: "monthly") | `monthly`, `yearly` |
| `source` | Yes | Platform identifier | `mobile` |
| `redirectUrl` | Yes | Deep link to return to app | `moneko://checkout/result` |
| `promo` | No | Promotional code if available | `SUMMER2024` |

### Example Full URL
```
https://moneko.com/checkout?userId=123e4567-e89b-12d3-a456-426614174000&plan=plus&billing=monthly&source=mobile&redirectUrl=moneko%3A%2F%2Fcheckout%2Fresult
```

### URL Encoding
Make sure to URL encode the `redirectUrl` parameter:
```javascript
const redirectUrl = encodeURIComponent('moneko://checkout/result');
```

## Response Handling

### Return URL Format
After payment completion (success, failure, or cancellation), the web will redirect to your `redirectUrl` with query parameters:

#### Success
```
moneko://checkout/result?status=success&session_id=cs_test_xxxxx&plan=plus
```

#### Failed
```
moneko://checkout/result?status=failed&error=Payment%20failed
```

#### Canceled
```
moneko://checkout/result?status=canceled
```

#### Error (Validation Failed)
```
moneko://checkout/result?status=error&message=Invalid%20user%20ID
```

### Status Codes

| Status | Description | Action Required |
|--------|-------------|-----------------|
| `success` | Payment completed successfully | Update user's subscription status in app |
| `failed` | Payment failed at Stripe | Show error message, allow retry |
| `canceled` | User cancelled payment | Return to previous screen |
| `error` | Validation error (invalid userId, duplicate subscription, etc.) | Show error message from `message` parameter |

## Implementation Examples

### React Native with Expo

```javascript
import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

// Function to initiate checkout
const initiateCheckout = async (userId, plan, billing) => {
  const redirectUrl = 'moneko://checkout/result';
  const encodedRedirectUrl = encodeURIComponent(redirectUrl);
  
  const checkoutUrl = `https://moneko.com/checkout?userId=${userId}&plan=${plan}&billing=${billing}&source=mobile&redirectUrl=${encodedRedirectUrl}`;
  
  // Open in-app browser
  const result = await WebBrowser.openBrowserAsync(checkoutUrl);
  
  // Handle result when browser closes
  if (result.type === 'cancel') {
    console.log('User closed browser');
  }
};

// Set up deep link listener
useEffect(() => {
  const handleDeepLink = ({ url }) => {
    const { path, queryParams } = Linking.parse(url);
    
    if (path === 'checkout/result') {
      const { status, session_id, error, message } = queryParams;
      
      switch (status) {
        case 'success':
          // Update subscription status
          updateSubscription(session_id);
          navigation.navigate('SubscriptionSuccess');
          break;
          
        case 'failed':
          Alert.alert('Payment Failed', error || 'Please try again');
          break;
          
        case 'canceled':
          // User cancelled, return to previous screen
          navigation.goBack();
          break;
          
        case 'error':
          Alert.alert('Error', message || 'An error occurred');
          break;
      }
    }
  };
  
  // Add event listener
  const subscription = Linking.addEventListener('url', handleDeepLink);
  
  return () => subscription.remove();
}, []);
```

### iOS (Swift)

```swift
import UIKit

// Function to initiate checkout
func initiateCheckout(userId: String, plan: String, billing: String) {
    let redirectUrl = "moneko://checkout/result"
    let encodedRedirectUrl = redirectUrl.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed) ?? ""
    
    let checkoutUrlString = "https://moneko.com/checkout?userId=\(userId)&plan=\(plan)&billing=\(billing)&source=mobile&redirectUrl=\(encodedRedirectUrl)"
    
    if let checkoutUrl = URL(string: checkoutUrlString) {
        UIApplication.shared.open(checkoutUrl)
    }
}

// Handle deep link in AppDelegate or SceneDelegate
func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
    guard url.scheme == "moneko" else { return false }
    guard url.host == "checkout" else { return false }
    
    let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
    let queryItems = components?.queryItems
    
    let status = queryItems?.first(where: { $0.name == "status" })?.value
    let sessionId = queryItems?.first(where: { $0.name == "session_id" })?.value
    let error = queryItems?.first(where: { $0.name == "error" })?.value
    let message = queryItems?.first(where: { $0.name == "message" })?.value
    
    switch status {
    case "success":
        // Update subscription status
        updateSubscription(sessionId: sessionId)
        // Navigate to success screen
        
    case "failed":
        // Show error alert
        showAlert(title: "Payment Failed", message: error ?? "Please try again")
        
    case "canceled":
        // User cancelled, dismiss current screen
        
    case "error":
        // Show validation error
        showAlert(title: "Error", message: message ?? "An error occurred")
        
    default:
        break
    }
    
    return true
}
```

### Android (Kotlin)

```kotlin
import android.content.Intent
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent

// Function to initiate checkout
fun initiateCheckout(userId: String, plan: String, billing: String) {
    val redirectUrl = "moneko://checkout/result"
    val encodedRedirectUrl = Uri.encode(redirectUrl)
    
    val checkoutUrl = "https://moneko.com/checkout?" +
        "userId=$userId&" +
        "plan=$plan&" +
        "billing=$billing&" +
        "source=mobile&" +
        "redirectUrl=$encodedRedirectUrl"
    
    // Open in Chrome Custom Tab
    val builder = CustomTabsIntent.Builder()
    val customTabsIntent = builder.build()
    customTabsIntent.launchUrl(context, Uri.parse(checkoutUrl))
}

// Handle deep link in Activity
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    handleIntent(intent)
}

override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    intent?.let { handleIntent(it) }
}

private fun handleIntent(intent: Intent) {
    val data: Uri? = intent.data
    
    if (data?.scheme == "moneko" && data.host == "checkout") {
        val status = data.getQueryParameter("status")
        val sessionId = data.getQueryParameter("session_id")
        val error = data.getQueryParameter("error")
        val message = data.getQueryParameter("message")
        
        when (status) {
            "success" -> {
                // Update subscription status
                updateSubscription(sessionId)
                // Navigate to success screen
            }
            
            "failed" -> {
                // Show error
                showDialog("Payment Failed", error ?: "Please try again")
            }
            
            "canceled" -> {
                // User cancelled, finish activity
                finish()
            }
            
            "error" -> {
                // Show validation error
                showDialog("Error", message ?: "An error occurred")
            }
        }
    }
}
```

## Validation Rules

The web checkout will validate:

1. **User ID exists** - Must be a valid user in the database
2. **No active subscription** - User must not already have an active or trialing subscription
3. **Valid parameters** - All required parameters must be present

If validation fails, the user will see an error message and will be redirected back to the app with `status=error`.

## Testing

### Test URLs

#### Valid User Test (replace with actual test userId)
```
https://moneko.com/checkout?userId=YOUR_TEST_USER_ID&plan=plus&billing=monthly&source=mobile&redirectUrl=moneko%3A%2F%2Fcheckout%2Fresult
```

#### Invalid User Test
```
https://moneko.com/checkout?userId=invalid-user-id&plan=plus&billing=monthly&source=mobile&redirectUrl=moneko%3A%2F%2Fcheckout%2Fresult
```

### Test Scenarios

1. **Valid checkout** - Should proceed to Stripe payment
2. **Invalid userId** - Should show error immediately
3. **User with existing subscription** - Should show error
4. **Cancel payment** - Should redirect back with `status=canceled`
5. **Successful payment** - Should redirect back with `status=success` and `session_id`

## Troubleshooting

### Common Issues

**Issue: Deep link not working**
- Solution: Make sure deep link scheme is registered in your app's config (Info.plist for iOS, AndroidManifest.xml for Android)

**Issue: "Invalid user ID" error**
- Solution: Verify the userId exists in the Moneko database and matches the format

**Issue: "User already has subscription" error**
- Solution: Check if user already has an active subscription before initiating checkout

**Issue: Redirect URL not encoded properly**
- Solution: Make sure to URL encode the redirectUrl parameter

**Issue: Browser not closing after payment**
- Solution: This is expected behavior. User needs to manually close browser or click "Return to App" button

## Security Notes

- Never expose sensitive user data in the URL parameters
- The userId should be the Moneko database user ID, not any internal app ID
- Always validate the response in your backend before updating subscription status
- Use HTTPS for all web checkout URLs
- Validate the `session_id` returned on success with your backend

## Support

For issues or questions:
- Check the audit document: `MOBILE_CHECKOUT_AUDIT.md`
- Contact the backend team to verify userId format and validation
- Test in development environment before production deployment

---
**Version**: 1.0
**Last Updated**: 2025
**Status**: Production Ready
