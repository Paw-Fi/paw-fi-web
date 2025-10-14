# Set Budget API

Simple API endpoint to set/update daily budgets without AI processing.

## Endpoint

```
POST /functions/v1/set-budget
```

## Request Body

```typescript
{
  phone?: string;      // E.164 format (optional if userId provided)
  userId?: string;     // User ID (optional if phone provided)
  amount: number;      // Budget amount in currency units (e.g., 100.50 for $100.50)
  date?: string;       // ISO date (YYYY-MM-DD), defaults to today
  currency?: string;   // ISO currency code (USD, EUR, etc.), defaults to USD
}
```

## Response

```typescript
{
  ok: true,
  results: {
    date: string;
    currency: string;
    budget_set: {
      amount_cents: number;
      date: string;
      currency: string;
    },
    totals: {
      budget_cents: number;
      spent_cents: number;
      remaining_cents: number;
      currency: string;
    }
  },
  reply: string;  // Human-readable summary
}
```

## Examples

### Set budget by userId (web app)

```bash
curl -X POST https://your-project.supabase.co/functions/v1/set-budget \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "userId": "abc-123-def",
    "amount": 100.00,
    "currency": "USD"
  }'
```

### Set budget by phone (WhatsApp)

```bash
curl -X POST https://your-project.supabase.co/functions/v1/set-budget \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "phone": "+1234567890",
    "amount": 50.00,
    "date": "2025-01-15"
  }'
```

## Key Features

- ✅ No AI processing required
- ✅ Direct database operations
- ✅ Fast response time
- ✅ Supports both phone and userId
- ✅ Automatic contact creation if not exists
- ✅ Returns current spending totals

## Comparison with finance-update

| Feature | set-budget | finance-update |
|---------|-----------|----------------|
| Budget Setting | ✅ Direct | ✅ Via AI parsing |
| Expense Logging | ❌ | ✅ Via AI parsing |
| Free-form text | ❌ | ✅ |
| AI Processing | ❌ | ✅ |
| Response Time | Fast | Slower |
| Use Case | Structured budget updates | Natural language updates |
