# 🚨 CRITICAL DATABASE CONSTRAINT VIOLATION FIX

## The Problem

The `goal-assessment` Supabase function is failing with this error:
```
new row for relation "user_investment_profiles" violates check constraint "user_investment_profiles_income_range_check"
```

**Root Cause**: The AI is generating freeform text for `income_range` instead of using the required database enum values.

## Required Database Values

The `income_range` field MUST be one of these exact values:
- `'under_30k'`
- `'30k_50k'`
- `'50k_75k'`
- `'75k_100k'`
- `'100k_150k'`
- `'150k_250k'`
- `'over_250k'`

## Fix Required in `/supabase/functions/goal-assessment/index.ts`

### Issue 1: Lines 254-290 - Wrong Field Mapping

**Current broken prompt** (lines 254-260):
```typescript
2. USER PROFILE:
   - Extract age from responses.current_age field
   - Extract income from responses.annual_income field  
   - Extract investmentExperience from responses.investment_experience field
   - Extract riskTolerance from responses.risk_tolerance field
```

**Problem**: 
- Retirement goals don't have `annual_income` field
- AI generates freeform text instead of enum values

**Fix**: Replace lines 254-290 with:
```typescript
2. USER PROFILE:
   - Extract age from responses.current_age field (must be integer 18-100)
   - Map income_range to one of these EXACT values based on context or default to 'not_provided':
     * 'under_30k', '30k_50k', '50k_75k', '75k_100k', '100k_150k', '150k_250k', 'over_250k'
   - Map investment_experience to one of: 'beginner', 'intermediate', 'advanced'
   - Map risk_tolerance from responses to one of: 'conservative', 'moderate', 'aggressive'
   - Calculate timeline in years (integer only)
   - Set esg_preferences to false (default)
   - Build behavioral_profile object from available responses
```

### Issue 2: Lines 275-290 - Goal-Specific Logic Wrong

**Current broken logic**:
```typescript
} else if (goalType === 'home_purchase') {
    prompt += `\n\nHOME PURCHASE ANALYSIS:
- Extract age from current_age field in responses
- Map field names correctly: annual_income -> income, investment_experience -> investmentExperience, risk_tolerance -> riskTolerance`;
```

**Problem**: Different goal types have different field names, but AI is confused about mapping.

**Fix**: Replace with specific mapping for each goal type:
```typescript
} else if (goalType === 'retirement') {
    prompt += `\n\nRETIREMENT-SPECIFIC MAPPING:
- age: use responses.current_age (integer)
- income_range: estimate based on responses.monthly_contribution and responses.current_savings, map to enum values only
- investment_experience: infer from responses.risk_scenario - 'buy_more'=advanced, 'hold_steady'=intermediate, 'reduce_risk'=beginner  
- risk_tolerance: map responses.risk_scenario to 'conservative'|'moderate'|'aggressive'
- timeline: calculate from responses.target_retirement_age - responses.current_age (integer years)`;

} else if (goalType === 'home_purchase') {
    prompt += `\n\nHOME PURCHASE-SPECIFIC MAPPING:
- age: use responses.current_age (integer)
- income_range: use responses.annual_income, map to exact enum values
- investment_experience: use responses.investment_experience directly
- risk_tolerance: use responses.risk_tolerance directly
- timeline: calculate years from target_purchase_date to now (integer)`;
```

### Issue 3: Lines 342-364 - Missing Default Handling

**Add this validation** before upsertUserProfile call:
```typescript
// Validate and fix income_range if invalid
function validateIncomeRange(income: string): string {
  const validValues = ['under_30k', '30k_50k', '50k_75k', '75k_100k', '100k_150k', '150k_250k', 'over_250k'];
  
  if (validValues.includes(income)) {
    return income;
  }
  
  // Default to reasonable estimate based on common patterns
  if (income.includes('30') || income.includes('low')) return '30k_50k';
  if (income.includes('50')) return '50k_75k';
  if (income.includes('75') || income.includes('100')) return '75k_100k';
  if (income.includes('150')) return '100k_150k';
  if (income.includes('250') || income.includes('high')) return '150k_250k';
  
  // Conservative default
  return '50k_75k';
}

// Apply validation before upsert
analysis.userProfile.income = validateIncomeRange(analysis.userProfile.income);
```

## Test Case That Should Work

**Input payload**:
```json
{
  "userId": "77b1fd0b-f477-4a23-9d4e-aa632fd9efba",
  "goalType": "retirement", 
  "responses": {
    "current_age": 26,
    "target_retirement_age": 63,
    "current_savings": 30000,
    "monthly_contribution": 2000,
    "retirement_lifestyle": "travel frequently, buy supercar",
    "risk_scenario": "hold_steady",
    "income_replacement": 63
  }
}
```

**Expected userProfile output**:
```json
{
  "age": 26,
  "income": "100k_150k",
  "investmentExperience": "intermediate", 
  "riskTolerance": "moderate",
  "timeline": 37,
  "esgPreferences": false,
  "behavioralProfile": {
    "retirement_lifestyle": "travel frequently, buy supercar",
    "income_replacement": 63
  }
}
```

## Priority: CRITICAL

This breaks the entire goal creation flow. Users cannot create retirement goals until this is fixed.

## Verification

After fix, test with the exact payload that failed to ensure:
1. No database constraint violations
2. Valid enum values inserted
3. Goal creation completes successfully