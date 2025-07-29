# AI-Driven Goal Tracker Implementation Guide

## Overview

This document provides a comprehensive implementation guide for the AI-driven financial goal tracking system in the Moneko application. The system enables users to create, track, and manage financial goals with intelligent AI assistance for strategy generation, milestone creation, and ongoing insights.

## Architecture Summary

### System Components
1. **Database Layer**: PostgreSQL tables for goals, milestones, progress tracking, and insights
2. **API Layer**: Supabase Edge Functions for AI processing and data management
3. **Frontend Layer**: React components with TypeScript for user interface
4. **AI Integration**: Google Gemini-2.5-flash AI for intelligent goal and milestone generation

### Key Features
- AI-driven questionnaire system for goal creation
- Intelligent milestone generation and tracking
- Real-time progress updates and analytics
- Personalized insights and recommendations
- Dashboard widget integration
- Mobile-responsive design

## Implementation Roadmap

### Phase 1: Database Foundation (Week 1)

#### 1.1 Create Database Tables
```bash
# Create migration file
supabase migration new create_goal_tracker_tables

# Add the SQL schema from the design document
# File: supabase/migrations/YYYYMMDD_create_goal_tracker_tables.sql
```

**Required Tables:**
- `financial_goals` - Core goal information
- `goal_milestones` - Individual milestones within goals
- `goal_progress_updates` - Progress tracking history
- `goal_questionnaire_templates` - AI questionnaire configurations
- `goal_insights` - AI-generated insights and recommendations

#### 1.2 Set Up Row Level Security
```sql
-- Enable RLS on all tables
-- Create policies for user data isolation
-- Ensure proper authentication and authorization
```

#### 1.3 Create Database Functions
```sql
-- Goal progress calculation function
-- Milestone completion trigger
-- Insight generation trigger
-- Data aggregation functions for dashboard widgets
```

### Phase 2: Backend API Development (Week 2)

#### 2.1 Core Supabase Functions

**Create the following Edge Functions:**

1. **`ai-goal-generator`** (`/supabase/functions/ai-goal-generator/`)
   - Processes questionnaire responses
   - Generates goals using AI
   - Creates initial milestones
   - Returns structured goal data

2. **`goal-insights-generator`** (`/supabase/functions/goal-insights-generator/`)
   - Analyzes goal progress
   - Generates personalized insights
   - Provides recommendations
   - Handles insight prioritization

3. **`goal-progress-tracker`** (`/supabase/functions/goal-progress-tracker/`)
   - Updates goal progress
   - Handles milestone completion
   - Calculates progress metrics
   - Triggers insight generation

#### 2.2 AI Prompt Engineering

**Create AI prompt templates for:**
- Retirement goal generation
- Home buying goal generation  
- Wealth building goal generation
- Investment goal generation
- Custom goal generation

**Key considerations:**
- Personalization based on user data
- Financial calculation accuracy
- Milestone generation logic
- Risk assessment integration

#### 2.3 API Integration Testing
```bash
# Test AI goal generation
curl -X POST "${SUPABASE_URL}/functions/v1/ai-goal-generator" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"goalType": "retirement", "questionnaireAnswers": {...}}'

# Test progress tracking
curl -X POST "${SUPABASE_URL}/functions/v1/goal-progress-tracker" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"goalId": "...", "updateType": "amount_added", "amountChange": 1000}'
```

### Phase 3: Frontend Component Development (Week 3-4)

#### 3.1 Route Structure Setup

**Create routes following TanStack Router pattern:**
```
/src/routes/dashboard/tracker/
├── index.tsx                    # Goals overview
├── $goalId/
│   ├── index.tsx                # Goal detail view
│   └── edit.tsx                 # Goal editing
├── create/
│   ├── index.tsx                # Goal type selection
│   └── questionnaire.tsx        # AI questionnaire
└── insights.tsx                 # Insights dashboard
```

#### 3.2 Core Components Development

**Priority order for component development:**

1. **Goal Type Selection** (`GoalTypeSelector.tsx`)
   - Visual goal type cards
   - Goal type descriptions
   - Navigation to questionnaire

2. **AI Questionnaire Flow** (`QuestionnaireFlow.tsx`)
   - Dynamic question rendering
   - Progress indication
   - Answer validation
   - AI generation loading states

3. **Goals Overview** (`GoalsGrid.tsx`)
   - Goal cards with progress indicators
   - Summary statistics
   - Quick actions (add goal, view insights)
   - Responsive grid layout

4. **Goal Detail View** (`GoalDetail.tsx`)
   - Goal progress visualization
   - Milestone management
   - Progress update interface
   - AI insights display

5. **Milestone Management** (`MilestonesList.tsx`)
   - Milestone creation/editing
   - Progress tracking
   - Milestone completion
   - Reordering and prioritization

 6. **`questionnaire-template-manager`** (`questionnaire-template-manager.ts`)
   - Manages questionnaire templates
   - Handles template versioning
   - Provides template validation

#### 3.3 TypeScript Interface Implementation

**Create comprehensive type definitions:**
```typescript
// /src/components/goal-tracker/types/
├── goal-types.ts                # Core goal interfaces
├── milestone-types.ts           # Milestone interfaces
├── questionnaire-types.ts       # Questionnaire interfaces
├── insight-types.ts             # AI insight interfaces
└── api-types.ts                 # API request/response types
```

#### 3.4 Custom Hooks Development

**Create hooks for data management:**
```typescript
// /src/hooks/goal-tracker/
├── use-goals.ts                 # Goals data fetching and management
├── use-goal.ts                  # Individual goal operations
├── use-milestones.ts            # Milestone operations
├── use-create-goal.ts           # AI-powered goal creation
├── use-progress-tracker.ts      # Progress update operations
└── use-insights.ts              # Insights data management
```

### Phase 4: AI Integration & Testing (Week 5)

#### 4.1 Questionnaire Template Configuration

**Set up questionnaire templates in database:**
```sql
-- Insert retirement goal template
INSERT INTO goal_questionnaire_templates (
  goal_type, template_name, questions, ai_prompt_template
) VALUES (
  'retirement',
  'Retirement Planning Assessment',
  '[questionnaire JSON]',
  '[AI prompt template]'
);
```

#### 4.2 AI Model Configuration

**Configure Google Gemini AI:**
- Set up API keys in Supabase secrets
- Configure model parameters (temperature, max tokens)
- Implement response parsing and validation
- Add error handling and fallback strategies

#### 4.3 End-to-End Testing

**Test complete user flows:**
1. Goal creation via AI questionnaire
2. Milestone tracking and completion
3. Progress updates and calculations
4. AI insight generation
5. Goal completion workflow

### Phase 5: Dashboard Integration (Week 6)

#### 5.1 Widget System Integration

**Create goal tracker widgets:**
```typescript
// Extend existing widget system
export interface IGoalTrackerWidget extends IBaseWidget {
  type: 'goalTracker';
  data: IGoalTrackerData;
}

// Add to dashboard widget factory
// Enable drag-and-drop functionality
// Implement widget configuration options
```

#### 5.2 Dashboard Analytics

**Add goal tracking analytics:**
- Overall progress metrics
- Goal completion rates
- Milestone achievement tracking
- Progress trend analysis
- Performance insights

### Phase 6: Polish & Optimization (Week 7)

#### 6.1 Performance Optimization

**Database optimization:**
- Query performance analysis
- Index optimization
- Connection pooling
- Cache strategy implementation

**Frontend optimization:**
- Component lazy loading
- Image optimization
- Bundle size analysis
- Performance monitoring

#### 6.2 User Experience Enhancement

**UX improvements:**
- Loading state animations
- Error handling improvements
- Accessibility compliance
- Mobile responsiveness testing
- User feedback integration

#### 6.3 AI Model Fine-tuning

**AI optimization:**
- Prompt engineering refinement
- Response quality analysis
- User feedback incorporation
- Model parameter tuning

## Technical Implementation Details

### Database Schema

#### Core Tables Structure

```sql
-- Financial Goals (Main goal entities)
CREATE TABLE financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  goal_type VARCHAR(50) NOT NULL,
  target_amount DECIMAL(15,2) NOT NULL,
  current_amount DECIMAL(15,2) DEFAULT 0,
  target_date DATE NOT NULL,
  ai_questionnaire_data JSONB,
  ai_generated_strategy TEXT,
  status VARCHAR(50) DEFAULT 'active',
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  is_on_track BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goal Milestones (Sub-goals and checkpoints)
CREATE TABLE goal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES financial_goals(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  milestone_type VARCHAR(50) NOT NULL,
  target_amount DECIMAL(15,2),
  current_amount DECIMAL(15,2) DEFAULT 0,
  due_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  is_ai_generated BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progress Updates (Tracking history)
CREATE TABLE goal_progress_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES financial_goals(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES goal_milestones(id) ON DELETE CASCADE,
  update_type VARCHAR(50) NOT NULL,
  amount_change DECIMAL(15,2),
  user_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Endpoints

#### Supabase Edge Functions

**1. AI Goal Generator** (`/functions/v1/ai-goal-generator`)
```typescript
// Input: goalType, questionnaireAnswers, userId
// Process: AI analysis and goal generation
// Output: generated goal, milestones, strategy
```

**2. Progress Tracker** (`/functions/v1/goal-progress-tracker`)
```typescript
// Input: goalId, updateType, amountChange, milestoneId
// Process: Progress calculation and database updates
// Output: updated progress metrics, insights trigger
```

**3. Insights Generator** (`/functions/v1/goal-insights-generator`)
```typescript
// Input: goalId, userId
// Process: Progress analysis and AI insight generation
// Output: personalized insights and recommendations
```

### Frontend Architecture

#### Component Hierarchy

```
GoalTracker
├── GoalsOverview
│   ├── GoalsSummaryStats
│   ├── GoalsGrid
│   │   └── GoalCard[]
│   ├── QuickActions
│   └── RecentActivity
├── GoalDetail
│   ├── GoalHeader
│   ├── ProgressUpdater
│   ├── MilestonesList
│   │   └── MilestoneItem[]
│   ├── GoalMetrics
│   └── GoalInsights
└── GoalCreation
    ├── GoalTypeSelector
    └── QuestionnaireFlow
        ├── ProgressStepper
        ├── QuestionRenderer
        └── AILoadingState
```

#### State Management

**React Query for server state:**
```typescript
// Goals data fetching and caching
const { data: goals } = useQuery({
  queryKey: ['goals', userId],
  queryFn: () => fetchUserGoals(userId),
});

// Optimistic updates for progress tracking
const updateProgressMutation = useMutation({
  mutationFn: updateGoalProgress,
  onMutate: async (newProgress) => {
    // Optimistic update
    await queryClient.cancelQueries(['goals']);
    const previousGoals = queryClient.getQueryData(['goals']);
    queryClient.setQueryData(['goals'], (old) => 
      updateGoalInList(old, newProgress)
    );
    return { previousGoals };
  },
  onError: (err, newProgress, context) => {
    // Rollback on error
    queryClient.setQueryData(['goals'], context.previousGoals);
  },
});
```

**Local state for UI interactions:**
```typescript
// Form state management
const [questionnaireAnswers, setQuestionnaireAnswers] = useState({});
const [currentStep, setCurrentStep] = useState(0);
const [isGenerating, setIsGenerating] = useState(false);
```

### AI Integration

#### Prompt Engineering

**Goal Generation Prompts:**
```typescript
const RETIREMENT_PROMPT = `
You are a financial advisor creating a retirement savings plan.

User Data: {{QUESTIONNAIRE_DATA}}

Generate a JSON response with:
- Personalized goal (title, description, target amount, target date)
- 3-5 meaningful milestones with specific dates and amounts
- Investment strategy explanation
- Risk assessment and recommendations

Calculations should use:
- 4% withdrawal rule for retirement income
- Age-appropriate asset allocation
- Realistic return assumptions based on risk tolerance
- Inflation adjustment (3% annually)
`;
```

**Insight Generation Prompts:**
```typescript
const INSIGHTS_PROMPT = `
Analyze this goal's progress and provide actionable insights.

Goal Data: {{GOAL_DATA}}
Progress Analysis: {{PROGRESS_ANALYSIS}}

Generate insights for:
- Progress assessment (on-track, behind, ahead)
- Strategy adjustments if needed
- Milestone recommendations
- Motivational encouragement
- Risk warnings if applicable
`;
```

#### Response Processing

**AI Response Validation:**
```typescript
interface AIGoalResponse {
  goal: {
    title: string;
    description: string;
    targetAmount: number;
    targetDate: string;
    rationale: string;
  };
  milestones: Milestone[];
  strategy: string;
  projections: {
    monthlyRequired: number;
    projectedFinalAmount: number;
    confidenceLevel: number;
  };
}

// Validate AI response structure
function validateAIResponse(response: any): AIGoalResponse {
  // Schema validation
  // Data type checking
  // Business rule validation
  // Return structured response or throw error
}
```

## Security Considerations

### Data Privacy
- All user financial data encrypted at rest
- Row Level Security (RLS) policies enforce user data isolation
- AI processing logs exclude sensitive financial information
- GDPR compliance for EU users

### Authentication & Authorization
- Supabase Auth integration for user management
- JWT token validation on all API endpoints
- Role-based access control for admin functions
- Rate limiting on AI generation endpoints

### API Security
- CORS configuration for client-server communication
- Input validation and sanitization
- SQL injection prevention through parameterized queries
- AI prompt injection protection

## Performance Considerations

### Database Optimization
- Composite indexes on frequently queried columns
- Partitioning for large progress update tables
- Connection pooling for high concurrent usage
- Query optimization and execution plan analysis

### Frontend Performance
- Component lazy loading for large goal lists
- Infinite scrolling for milestone history
- Image optimization and lazy loading
- Bundle code splitting by feature

### AI Processing
- Response caching for similar questionnaire patterns
- Async processing for complex calculations
- Timeout handling for AI API calls
- Fallback strategies for AI service unavailability

## Monitoring & Analytics

### Application Metrics
- Goal creation and completion rates
- User engagement with AI features
- Progress update frequency
- Milestone achievement statistics

### Performance Monitoring
- API response times
- Database query performance
- AI processing duration
- Frontend rendering performance

### Error Tracking
- AI generation failures
- Database connection issues
- Frontend JavaScript errors
- User experience issues

## Deployment Strategy

### Environment Configuration
```bash
# Development
SUPABASE_URL=your-dev-project-url
SUPABASE_ANON_KEY=your-dev-anon-key
GEMINI_API_KEY=your-gemini-api-key

# Production
SUPABASE_URL=your-prod-project-url
SUPABASE_ANON_KEY=your-prod-anon-key
GEMINI_API_KEY=your-prod-gemini-api-key
```

### Database Migration
```bash
# Apply migrations
supabase db push

# Seed initial data
supabase db seed

# Set up RLS policies
supabase db functions deploy
```

### Function Deployment
```bash
# Deploy all Edge Functions
supabase functions deploy ai-goal-generator
supabase functions deploy goal-insights-generator
supabase functions deploy goal-progress-tracker
```

### Frontend Deployment
```bash
# Build optimized production bundle
npm run build

# Deploy to hosting platform
npm run deploy
```

## Testing Strategy

### Unit Testing
- Component rendering tests
- Hook functionality tests
- Utility function tests
- AI response parsing tests

### Integration Testing
- API endpoint testing
- Database operation testing
- AI generation workflow testing
- User authentication flow testing

### End-to-End Testing
- Complete goal creation workflow
- Progress tracking scenarios
- Milestone management operations
- Multi-device responsiveness

### Load Testing
- Concurrent user simulation
- AI generation performance under load
- Database query performance testing
- API rate limiting validation

## Maintenance & Updates

### Regular Maintenance Tasks
- Database performance monitoring
- AI model performance analysis
- Security patch updates
- User feedback review and implementation

### Feature Enhancement Pipeline
- User feature requests evaluation
- A/B testing for UI improvements
- AI prompt optimization based on usage data
- Performance optimization opportunities

### Backup & Recovery
- Daily database backups
- AI training data preservation
- User data export capabilities
- Disaster recovery procedures

---

## Quick Start Implementation Checklist

### Phase 1: Foundation ✓
- [ ] Create database tables and indexes
- [ ] Set up Row Level Security policies
- [ ] Create initial questionnaire templates
- [ ] Configure Supabase project settings

### Phase 2: Backend Development ✓
- [ ] Implement AI goal generator function
- [ ] Create progress tracker function
- [ ] Build insights generator function
- [ ] Set up function deployment pipeline

### Phase 3: Frontend Development ✓
- [ ] Create route structure
- [ ] Build core components
- [ ] Implement custom hooks
- [ ] Add TypeScript interfaces

### Phase 4: Integration ✓
- [ ] Connect frontend to backend APIs
- [ ] Test AI generation workflows
- [ ] Implement error handling
- [ ] Add loading states and UX polish

### Phase 5: Testing & Deployment ✓
- [ ] Write comprehensive tests
- [ ] Perform load testing
- [ ] Deploy to production environment
- [ ] Set up monitoring and analytics

This implementation guide provides a complete roadmap for building the AI-driven goal tracking system. Follow the phases sequentially, testing thoroughly at each stage, and refer to the technical details for specific implementation guidance.