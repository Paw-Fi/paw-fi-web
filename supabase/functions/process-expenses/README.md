# Process Expenses Edge Function

Universal expense processor that accepts either text or image input and returns structured expense data.

## Endpoint

```
POST /process-expenses
```

## Authentication

Uses Supabase service role key (internal configuration).

## Request Body

### Text Input
```json
{
  "phone": "+1234567890",
  "text": "2 on coke, 3 on sandwich",
  "date": "2025-01-15",
  "currency": "USD"
}
```

### Image Input
```json
{
  "phone": "+1234567890",
  "image": {
    "data": "base64_encoded_image_data",
    "contentType": "image/jpeg"
  },
  "date": "2025-01-15",
  "currency": "USD"
}
```

### Parameters

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `phone` | string | Yes | - | User's phone number in E.164 format |
| `text` | string | Conditional* | - | Free-form text describing expenses |
| `image` | object | Conditional* | - | Receipt image data |
| `image.data` | string | If image | - | Base64-encoded image (with or without data URL prefix) |
| `image.contentType` | string | If image | - | MIME type (e.g., `image/jpeg`, `image/png`) |
| `date` | string | No | Today | ISO date string (YYYY-MM-DD) |
| `currency` | string | No | `USD` | ISO currency code (USD, EUR, GBP, etc.) |

**Note**: Must provide either `text` OR `image`, but not both.

## Response

### Success Response (Budget)
```json
{
  "success": true,
  "data": {
    "type": "budget",
    "amount": 100,
    "currency": "USD",
    "date": "2025-01-15",
    "reply": "Budget set to $100 for Jan 15"
  }
}
```

### Success Response (Expense)
```json
{
  "success": true,
  "data": {
    "type": "expense",
    "items": [
      {
        "amount": 2,
        "category": "food",
        "currency": "USD",
        "date": "2025-01-15",
        "note": "coke"
      },
      {
        "amount": 3,
        "category": "food",
        "currency": "USD",
        "date": "2025-01-15",
        "note": "sandwich"
      }
    ],
    "reply": "Total: $5.00 spent. Remaining budget: $95.00"
  }
}
```

### Error Response
```json
{
  "success": false,
  "data": {
    "type": "expense",
    "items": [],
    "error": "Failed to add expenses"
  }
}
```

## Response Types

The `data` object will be one of three types:

### BudgetResult
```typescript
{
  type: 'budget',
  amount: number,
  currency?: string,
  date?: string,
  reply?: string,
  error?: string
}
```

### ExpenseResult
```typescript
{
  type: 'expense',
  items: Array<{
    amount: number,
    category?: string,
    currency?: string,
    date?: string,
    note?: string
  }>,
  reply?: string,
  error?: string
}
```

### FallbackResult
```typescript
{
  type: 'fallback',
  reply?: string,
  error?: string
}
```

## Error Codes

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Missing required field: phone | Phone number not provided |
| 400 | Must provide either text or image | Neither text nor image provided |
| 400 | Cannot process both text and image | Both text and image provided |
| 400 | Invalid image content type | Image MIME type is not valid |
| 400 | Invalid base64 image data | Image data could not be decoded |
| 400 | Processing error | Gemini AI or finance-update failed |
| 405 | Method not allowed | Used non-POST method |
| 500 | Server configuration error | Missing environment variables |
| 500 | Internal server error | Unexpected error occurred |

## Examples

### cURL - Text Input
```bash
curl -X POST https://your-project.supabase.co/functions/v1/process-expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "phone": "+1234567890",
    "text": "5 on coffee, 10 on lunch",
    "currency": "USD"
  }'
```

### cURL - Image Input
```bash
curl -X POST https://your-project.supabase.co/functions/v1/process-expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "phone": "+1234567890",
    "image": {
      "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "contentType": "image/png"
    }
  }'
```

### JavaScript/TypeScript
```typescript
const response = await fetch('https://your-project.supabase.co/functions/v1/process-expenses', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  },
  body: JSON.stringify({
    phone: '+1234567890',
    text: '2 on coke, 3 on sandwich',
    currency: 'USD'
  })
});

const result = await response.json();
console.log(result);
```

### React Native - Image from Camera
```typescript
import * as ImagePicker from 'expo-image-picker';

// Take photo
const result = await ImagePicker.launchCameraAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  quality: 0.8,
  base64: true,
});

if (!result.canceled && result.assets[0].base64) {
  const response = await fetch('https://your-project.supabase.co/functions/v1/process-expenses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      phone: user.phone,
      image: {
        data: result.assets[0].base64,
        contentType: 'image/jpeg'
      }
    })
  });

  const data = await response.json();
  if (data.success && data.data.type === 'expense') {
    console.log('Logged expenses:', data.data.items);
  }
}
```

## Notes

- The function uses Google Gemini AI to parse natural language and images
- Expenses are automatically categorized (food, transport, groceries, etc.)
- Receipt images should show the final total clearly
- Supports multiple currencies (USD, EUR, GBP, etc.)
- All data is processed through the `finance-update` function for consistency
- Returns raw structured data - client is responsible for formatting/presentation
