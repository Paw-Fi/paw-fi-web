# Financial Health Profile Edge Function

This Supabase edge function processes financial health quiz answers and generates comprehensive user profiles using Google Gemini AI.

## Purpose

The function takes JSON quiz answers from the financial health assessment and:
1. Processes the raw quiz answers and structures them for AI analysis
2. Generates a professional financial profile description using Google Gemini AI
3. Stores the profile in the database for future access by mentors
4. Returns the AI-generated profile and storage confirmation

## Usage

### Request Format

```typescript
POST /supabase/functions/financial-health-profile
Content-Type: application/json

{
  "quizAnswers": {
    // All quiz answers from FinancialHealthQuiz component
    "current-age": 28,
    "gross-monthly-income": 5500,
    "net-monthly-income": 4200,
    // ... all other quiz fields
  },
  "userId": "user-123" // Optional for tracking
}
```

### Response Format

```typescript
{
  "success": true,
  "profileDescription": "AI-generated profile text...",
  "profileData": {
    // Structured data sent to AI
    "demographics": { ... },
    "financial_situation": { ... },
    "goals_and_timeline": { ... },
    "risk_profile": { ... },
    "calculated_metrics": { ... }
  },
  "profileId": "uuid-of-stored-profile",
  "debug": {
    "message": "Profile generated and stored successfully",
    "timestamp": "2024-01-15T10:30:00Z",
    "stored_in_db": true
  }
}
```

## Integration with Quiz Component

To integrate this with the existing quiz component, replace the `setTimeout` in the `handleSubmitQuiz` function:

```typescript
// In FinancialHealthQuiz.tsx
const handleSubmitQuiz = useCallback(async () => {
  if (!isQuizComplete()) {
    setError("Please complete all questions before submitting.");
    return;
  }

  setState(prev => ({ ...prev, isProcessing: true }));
  
  try {
    // Call the edge function
    const response = await fetch('/api/supabase/functions/financial-health-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quizAnswers: state.answers,
        userId: 'current-user-id', // Get from auth context
      }),
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('AI-generated profile:', result.profileDescription);
      // Store profile in database for mentor access
      // Continue with existing quiz completion logic
      handleCompleteQuiz(result.calculationResults);
    } else {
      throw new Error(result.error || 'Failed to generate profile');
    }
  } catch (error) {
    console.error('Error generating profile:', error);
    // Fall back to existing flow
    setTimeout(() => {
      handleCompleteQuiz();
    }, 8000);
  }
}, [isQuizComplete, state.answers]);
```

## Database Schema

The function stores profiles in the `financial_health_profiles` table:

```sql
create table public.financial_health_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  profile_description text not null,
  quiz_answers jsonb not null,
  profile_data jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

## Retrieving Stored Profiles

Use the `get-financial-health-profile` function to retrieve stored profiles:

```typescript
// Get latest profile for a user
const { data, error } = await supabase.functions.invoke('get-financial-health-profile', {
  body: { userId: 'user-uuid' }
});

// Get specific profile by ID
const { data, error } = await supabase.functions.invoke('get-financial-health-profile', {
  body: { userId: 'user-uuid', profileId: 'profile-uuid' }
});
```

## Files

- `index.ts` - Main edge function handler
- `prompt.ts` - AI prompt for profile generation
- `test.ts` - Test data and example usage
- `README.md` - This documentation
- `../get-financial-health-profile/` - Companion function for retrieving stored profiles

## Environment Variables

Ensure these are set in your Supabase Edge Function secrets:
- `GEMINI_API_KEY` - Google Gemini AI API key
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access

## AI Profile Output

The AI generates a structured profile with:
- **Financial Profile Summary**: Overview of current situation
- **Current Financial Situation**: Income, expenses, assets, debts
- **Financial Goals & Timeline**: Retirement and investment objectives
- **Risk Profile & Investment Approach**: Risk tolerance and preferences
- **Key Strengths**: Positive financial behaviors
- **Areas for Improvement**: Priority areas needing attention
- **Recommended Focus Areas**: Specific actionable recommendations
- **Mentorship Considerations**: Communication and motivation insights

This profile serves as a "case file" for financial mentors to quickly understand the user's situation and provide targeted advice.

## Testing

Run the test file to see sample data and expected output:

```bash
deno run test.ts
```

## Deployment

Deploy using Supabase CLI:

```bash
supabase functions deploy financial-health-profile
```