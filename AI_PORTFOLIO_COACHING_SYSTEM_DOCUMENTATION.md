# AI-Powered Portfolio Coaching System - Technical Documentation

## 🎯 Executive Summary

This system implements an AI-powered portfolio coaching platform that provides personalized financial guidance through automated weekly check-ins, goal-based portfolio recommendations, and intelligent coaching insights. The system combines React frontend components with Supabase Edge Functions and PostgreSQL to deliver a comprehensive financial coaching experience.

## 📋 System Architecture Overview

### Core Objectives
1. **Goal-Based Portfolio Management**: Users set financial goals and receive AI-generated portfolio recommendations
2. **Automated Coaching**: Weekly AI coaching sessions with personalized insights and recommendations
3. **Behavioral Tracking**: Monitor user engagement and adaptation to AI recommendations
4. **Multi-Personality Coaching**: Customizable AI coaching personalities (Cheerleader, Professor, Friend, Coach)
5. **Notification System**: Automated email notifications with coaching insights

## 🗂️ File Structure & Components

### Frontend Components (`/src/components/portfolio/`)

#### 1. **GoalSelector.tsx**
**Purpose**: Initial goal selection interface for new users
**Key Features**:
- Goal category selection (Retirement, Home Purchase, Education, etc.)
- Integration with AI chat system
- **Fixed Route**: `/chat` → `/dashboard/chat`

#### 2. **GoalAssessmentWizard.tsx** 
**Purpose**: Comprehensive goal assessment questionnaire
**Key Features**:
- Dynamic question rendering (sliders, text areas, single/multi-choice)
- Risk tolerance assessment
- AI goal analysis generation
- **Critical Fixes Applied**:
  - Null safety for question ranges and options
  - Route validation: `/auth` → `/login`
  - goalId validation before navigation
  - Timeout race condition handling

```typescript
// Example of critical fix
if (!question.range || question.range.length < 2) {
  return <div className="text-red-500">Invalid range configuration</div>;
}
```

#### 3. **AICoachingInterface.tsx**
**Purpose**: Main coaching dashboard displaying AI insights and recommendations
**Key Features**:
- Real-time coaching session display
- Progress tracking with real goal data
- Recommendation action handling
- **Critical Fixes Applied**:
  - Null safety for insights object
  - Database validation before operations
  - Route error handling with fallbacks
  - Real goal data integration (no more hardcoded values)

```typescript
// Null safety implementation
const insights = sessionData.insights || latestSession?.ai_insights || {
  greeting: "Great to see you back!",
  summary: "Here's your weekly financial check-in",
  observations: [],
  recommendations: [],
  // ... other fallback properties
};
```

#### 4. **AICoachingInterface.enhanced.tsx**
**Purpose**: Enhanced coaching interface with premium features
**Key Features**:
- Advanced recommendation routing
- **Fixed Routes**: 
  - `/calculators/savings-goal` → `/calculators/saving-goals-calculator`
  - `/calculators/tax-calculator` → `/calculators` (fallback)

#### 5. **AIPortfolioDisplay.tsx**
**Purpose**: Display AI-generated portfolio recommendations
**Key Features**:
- Portfolio acceptance workflow
- **Fixed Route**: `/portfolio/invest` → `/dashboard/portfolio`

#### 6. **SubscriptionGate.tsx**
**Purpose**: Premium feature access control
**Key Features**:
- Tier-based feature gating
- Upgrade prompts for premium features

### Backend Functions (`/supabase/functions/`)

#### 1. **ai-coaching-engine/index.ts**
**Purpose**: Core AI coaching logic and session generation
**Key Components**:

```typescript
interface CoachingInsights {
  greeting: string;
  summary: string;
  observations: Array<{
    type: 'progress' | 'behavior' | 'market' | 'milestone' | 'concern';
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'success' | 'error';
    actionable: boolean;
  }>;
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    effort: 'high' | 'medium' | 'low';
    category: 'savings' | 'investment' | 'risk' | 'tax' | 'behavioral';
    action_url?: string;
  }>;
  // ... additional properties
}
```

**Response Structure**:
```typescript
{
  success: true,
  session: session,
  latestSession: session,
  insights: coachingInsights,
  contextUsed: boolean,
  sessions: existingSessions
}
```

#### 2. **coaching-notifications/index.ts**
**Purpose**: Automated weekly coaching email system
**Key Features**:
- User eligibility checking (coaching enabled)
- Weekly coaching frequency control
- Personalized email generation based on coaching personality
- **Critical Fixes Applied**:
  - Array bounds validation for userGoals
  - Null safety for coaching data
  - Blueprint-aligned email templates
  - Error handling for edge cases

**Email Template Structure**:
- Responsive HTML design
- Coaching personality-based subject lines
- Progress visualization
- AI insights and recommendations
- Call-to-action buttons

### Database Schema (`/supabase/migrations/`)

#### 1. **20250125_portfolio_tracker_schema.sql**
**Core Tables**:

```sql
-- Financial Goals
CREATE TABLE financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('retirement', 'home_purchase', 'education', 'wealth_building', 'emergency_fund', 'custom')),
  title TEXT NOT NULL,
  target_amount DECIMAL(15,2) NOT NULL,
  current_amount DECIMAL(15,2) DEFAULT 0,
  monthly_contribution DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  -- ... additional fields
);

-- AI Coaching Sessions
CREATE TABLE ai_coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES financial_goals(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('weekly_checkin', 'goal_assessment', 'market_update', 'behavioral_insight', 'crisis_support', 'milestone_celebration')),
  ai_insights JSONB NOT NULL,
  coaching_personality TEXT DEFAULT 'friend' CHECK (coaching_personality IN ('cheerleader', 'professor', 'friend', 'coach')),
  email_sent BOOLEAN DEFAULT false,
  -- ... additional fields
);

-- User Investment Profiles
CREATE TABLE user_investment_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  coaching_enabled BOOLEAN DEFAULT true,
  preferred_coaching_personality TEXT DEFAULT 'friend',
  -- ... additional fields
);
```

#### 2. **20250126_ai_interaction_tracking.sql**
**Engagement Tracking**:

```sql
-- Track user actions on AI recommendations
CREATE TABLE ai_recommendation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  coaching_session_id UUID REFERENCES ai_coaching_sessions(id) ON DELETE CASCADE,
  recommendation_id TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('clicked', 'completed', 'dismissed')),
  action_data JSONB,
  -- ... additional fields
);

-- Track check-in responses
CREATE TABLE coaching_check_in_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  coaching_session_id UUID REFERENCES ai_coaching_sessions(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  response_type TEXT NOT NULL CHECK (response_type IN ('yes', 'no', 'tell_me_more')),
  -- ... additional fields
);
```

**Analytics Functions**:
```sql
-- Calculate user engagement scores
CREATE OR REPLACE FUNCTION calculate_coaching_engagement_score(target_user_id UUID)
RETURNS DECIMAL(3,2);

-- Get comprehensive analytics
CREATE OR REPLACE FUNCTION get_ai_recommendation_analytics(target_user_id UUID)
RETURNS JSONB;
```

## 🔄 System Data Flow

### 1. **User Onboarding Flow**
```
GoalSelector → GoalAssessmentWizard → AI Goal Analysis → Portfolio Generation
```

### 2. **Weekly Coaching Flow**
```
coaching-notifications cron job → 
Check eligible users → 
Generate AI insights → 
Send personalized emails → 
Track engagement
```

### 3. **User Interaction Flow**
```
AICoachingInterface loads → 
Display latest session → 
User clicks recommendation → 
Track action → 
Navigate to relevant page
```

## 🔧 Configuration & API Integration

### Environment Variables
```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Integration
GEMINI_API_KEY=your-gemini-api-key

# Site Configuration
SITE_URL=https://moneko.ai
```

### Email Service Integration
The coaching notifications system includes placeholders for email service integration:

```typescript
// TODO: Replace with actual email service
// await sendUserEmail(user.email, firstName, {
//   subject: personalizedSubject,
//   html: emailTemplate,
//   text: fallbackText
// });
```

## 📊 Coaching Personality System

Based on `blueprint.json` specifications:

### 1. **The Cheerleader**
- **Tone**: Celebration focus, heavy emoji use
- **Example**: "You're CRUSHING your retirement goal! 🎉"

### 2. **The Professor** 
- **Tone**: Data-rich, educational
- **Example**: "Your Sharpe ratio improved to 1.2 this week"

### 3. **The Friend**
- **Tone**: Conversational, empathetic  
- **Example**: "Hey! Tough market week but we're still on track"

### 4. **The Coach**
- **Tone**: Motivational, action-oriented
- **Example**: "Time to push harder. Increase by 5%?"

## 🚨 Critical Fixes Applied

### 1. **Route Navigation Issues**
- Fixed 5 non-existent route references
- Added fallback routes for failed navigation
- Implemented route validation before navigation

### 2. **Data Structure Safety**
- Added comprehensive null safety checks
- Implemented fallback data objects
- Enhanced error handling for missing properties

### 3. **Database Validation**
- Added constraint checking before database operations
- Implemented proper error handling for failed queries
- Enhanced data validation for edge cases

### 4. **Goal Data Integration**
- Replaced hardcoded demo data with real goal queries
- Implemented real-time progress calculations
- Added proper data loading states

## 🎯 Success Metrics & KPIs

### Primary Metrics
- **Goal Achievement Rate**: % of users on track
- **Weekly Active Engagement**: % opening AI updates  
- **Contribution Consistency**: % maintaining savings rate
- **Premium Conversion Rate**: Free → Paid (target: 12%)
- **Retention Rate**: 12-month retention (target: 88%)

### Behavioral Metrics
- **Time to first contribution**: Target <48 hours
- **Goals abandoned rate**: Target <10%
- **AI recommendation adoption**: Target >60%
- **Portfolio drift correction**: Target >80%

## 🔄 Automated Workflows

### 1. **Weekly Coaching Automation**
- Cron job triggers `coaching-notifications` function
- Checks users with `coaching_enabled = true`
- Validates weekly coaching frequency
- Generates personalized insights via AI
- Sends coaching emails with progress updates

### 2. **Milestone Detection**
- Automatic milestone achievement detection
- Celebration notifications for goal progress
- Badge system for user achievements

### 3. **Engagement Tracking**
- Real-time action tracking for recommendations
- Engagement score calculation and updates
- Behavioral pattern recognition and insights

## 🔧 Technical Implementation Details

### Frontend Architecture
- **Framework**: React 19 with TanStack Start
- **Routing**: TanStack Router (file-based routing)
- **State Management**: Redux Toolkit + React Query
- **Styling**: Tailwind CSS with custom components
- **Type Safety**: TypeScript with comprehensive interfaces

### Backend Architecture
- **Runtime**: Deno with Supabase Edge Functions
- **Database**: PostgreSQL with Row Level Security (RLS)
- **AI Integration**: Google Gemini for coaching insights
- **Real-time**: Supabase real-time subscriptions
- **Authentication**: Supabase Auth with JWT

### Data Flow Patterns
1. **Optimistic Updates**: UI updates immediately, rollback on error
2. **Error Boundaries**: Graceful degradation for failed operations
3. **Caching Strategy**: React Query for intelligent data caching
4. **Validation Layers**: Frontend validation + backend constraint checking

## 📝 Development Guidelines

### Code Quality Standards
- Comprehensive TypeScript interfaces for all data structures
- Null safety checks for all external data
- Error handling with user-friendly fallbacks
- Route validation before navigation attempts
- Database constraint compliance verification

### Testing Strategy
- Unit tests for utility functions
- Integration tests for data flow
- E2E tests for critical user paths
- Error scenario testing for edge cases

### Security Considerations
- Row Level Security (RLS) policies on all tables
- Input validation and sanitization
- Rate limiting on API endpoints
- Secure environment variable management

## 🚀 Deployment & Monitoring

### Deployment Pipeline
1. **Development**: Local development with Supabase CLI
2. **Testing**: Automated testing in CI/CD pipeline
3. **Staging**: Deploy to staging environment for QA
4. **Production**: Blue-green deployment with rollback capability

### Monitoring & Analytics
- **Performance**: Core Web Vitals monitoring
- **Errors**: Real-time error tracking and alerting
- **Usage**: User engagement and feature adoption metrics
- **Business**: Goal achievement and conversion tracking

This comprehensive system provides users with personalized financial coaching while maintaining robust data integrity, error handling, and scalable architecture for growth.