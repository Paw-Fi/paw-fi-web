# Portfolio AI Integration - Implementation Guide

## Overview
This guide shows how to replace the non-functional AI coaching interface with a fully integrated version that connects to existing Moneko features.

## Step-by-Step Implementation

### Step 1: Run Database Migration
```bash
# Add the new tracking tables
supabase db push
# Or manually run the migration file
psql -h <your-host> -d <your-db> -f supabase/migrations/20250126_ai_interaction_tracking.sql
```

### Step 2: Replace the AI Coaching Interface

**Current File**: `src/components/portfolio/AICoachingInterface.tsx`
**Enhanced File**: `src/components/portfolio/AICoachingInterface.enhanced.tsx`

```bash
# Backup the current file
mv src/components/portfolio/AICoachingInterface.tsx src/components/portfolio/AICoachingInterface.old.tsx

# Replace with enhanced version
mv src/components/portfolio/AICoachingInterface.enhanced.tsx src/components/portfolio/AICoachingInterface.tsx
```

### Step 3: Add New Route Handlers

Update your router configuration to handle the new navigation patterns:

**File**: `src/routes/calculators/savings-goal.tsx` (if not exists)
```typescript
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/calculators/savings-goal')({
  component: SavingsGoalCalculator,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      goalId: (search.goalId as string) || '',
      source: (search.source as string) || ''
    };
  }
});

function SavingsGoalCalculator() {
  const { goalId, source } = Route.useSearch();
  
  // Pre-fill calculator with goal data if goalId provided
  // Track source for analytics
  
  return (
    <div>
      {/* Your savings calculator implementation */}
      {source === 'ai_recommendation' && (
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <p className="text-blue-800 text-sm">
            💡 Your AI coach recommended this calculator to help with your goal
          </p>
        </div>
      )}
    </div>
  );
}
```

### Step 4: Update Learning Dashboard Integration

**File**: `src/routes/dashboard/learning/index.tsx`

Add search parameter handling for AI recommendations:

```typescript
// Add to your existing component
export const Route = createFileRoute("/dashboard/learning/")({
  component: UnifiedLearningPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      topic: (search.topic as string) || '',
      source: (search.source as string) || '',
      action: (search.action as string) || '',
      question: (search.question as string) || ''
    };
  }
});

// In your component
function UnifiedLearningPage() {
  const { topic, source, action, question } = Route.useSearch();
  
  // Handle AI recommendations
  useEffect(() => {
    if (source === 'ai_recommendation') {
      if (action === 'create_course' && topic) {
        // Auto-trigger AI course creation with topic
        setSelectedPrompt(`Create a course about ${topic}`);
        setShowAICoach(true);
      } else if (question) {
        // Auto-fill AI chat with question
        setSelectedPrompt(`Help me understand: ${question}`);
        setShowAICoach(true);
      }
    }
  }, [source, action, topic, question]);

  // Show AI recommendation context
  if (source === 'ai_recommendation') {
    return (
      <div className="min-h-screen">
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <FontAwesomeIcon icon={faRobot} className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">
                Your AI coach recommended learning about <strong>{topic}</strong> to help with your financial goals.
              </p>
            </div>
          </div>
        </div>
        {/* Rest of your learning component */}
      </div>
    );
  }

  // Rest of existing component
}
```

### Step 5: Update Portfolio Goal Detail Page

**File**: `src/routes/portfolio/goal/$goalId.tsx`

Add section-specific navigation:

```typescript
export const Route = createFileRoute('/portfolio/goal/$goalId')({
  component: GoalDetailPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      section: (search.section as string) || '',
      source: (search.source as string) || ''
    };
  }
});

function GoalDetailPage() {
  const { section, source } = Route.useSearch();
  const { goalId } = useParams({ from: '/portfolio/goal/$goalId' });
  
  // Handle AI coaching redirects
  useEffect(() => {
    if (source === 'ai_coaching') {
      if (section === 'progress') {
        // Scroll to progress section or highlight it
        const progressSection = document.getElementById('progress-section');
        progressSection?.scrollIntoView({ behavior: 'smooth' });
      } else if (section === 'risk_analysis') {
        // Show risk analysis modal or section
        setShowRiskAnalysis(true);
      }
    }
  }, [section, source]);

  return (
    <div className="container mx-auto py-8 space-y-8">
      {source === 'ai_coaching' && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <FontAwesomeIcon icon={faRobot} className="h-5 w-5 text-blue-400 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Your AI coach recommended reviewing this section of your goal.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Add id to progress section for scrolling */}
      <div id="progress-section">
        <GoalOverviewSection {...props} />
      </div>
      
      {/* Rest of existing component */}
    </div>
  );
}
```

### Step 6: Add Analytics Dashboard (Optional)

Create a new analytics page for tracking AI recommendation effectiveness:

**File**: `src/routes/portfolio/analytics.tsx`
```typescript
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export const Route = createFileRoute('/portfolio/analytics')({
  component: PortfolioAnalytics
});

function PortfolioAnalytics() {
  const { user } = useAuth();
  
  const { data: analytics } = useQuery({
    queryKey: ['ai-analytics', user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_ai_recommendation_analytics', {
        target_user_id: user?.id
      });
      return data;
    },
    enabled: !!user?.id
  });

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">AI Coaching Analytics</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recommendations Received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {analytics?.total_recommendations_received || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Actions Taken</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {analytics?.total_actions_taken || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {analytics?.completion_rate || 0}%
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Add charts and detailed analytics */}
    </div>
  );
}
```

## Testing Checklist

### Manual Testing
- [ ] Click "Take Action" on AI recommendations → Routes to correct page
- [ ] Click "Yes/No/Tell me more" on check-ins → Records response in database
- [ ] Click "View Full Progress" → Navigates to goal detail page
- [ ] AI recommendations pre-fill calculators with goal data
- [ ] Learning recommendations show AI context
- [ ] Portfolio navigation highlights correct sections

### Database Testing
```sql
-- Test recommendation tracking
SELECT * FROM ai_recommendation_actions WHERE user_id = 'your-user-id';

-- Test check-in responses
SELECT * FROM coaching_check_in_responses WHERE user_id = 'your-user-id';

-- Test analytics function
SELECT get_ai_recommendation_analytics('your-user-id');

-- Test engagement score
SELECT calculate_coaching_engagement_score('your-user-id');
```

### Integration Testing
- [ ] Calculator opens with goal data when coming from AI recommendation
- [ ] Learning dashboard creates courses for AI-recommended topics
- [ ] Goal progress page highlights correct sections from AI navigation
- [ ] User actions are recorded and tracked properly
- [ ] Analytics show correct data

## Monitoring & Analytics

### Key Metrics to Track
1. **Click-through rate** on AI recommendations (target: >40%)
2. **Completion rate** of recommended actions (target: >60%) 
3. **User engagement score** (calculated automatically)
4. **Feature discovery** through AI recommendations
5. **Goal progress improvement** for users following AI advice

### Dashboard Queries
```sql
-- Daily AI recommendation performance
SELECT 
  DATE(created_at) as date,
  COUNT(*) as recommendations_clicked,
  COUNT(*) FILTER (WHERE action_type = 'completed') as completed_actions,
  ROUND(
    COUNT(*) FILTER (WHERE action_type = 'completed')::decimal / 
    COUNT(*) * 100, 2
  ) as completion_rate
FROM ai_recommendation_actions 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Top performing recommendation categories
SELECT 
  action_data->>'category' as category,
  COUNT(*) as clicks,
  COUNT(*) FILTER (WHERE action_type = 'completed') as completions,
  ROUND(
    COUNT(*) FILTER (WHERE action_type = 'completed')::decimal / 
    COUNT(*) * 100, 2
  ) as completion_rate
FROM ai_recommendation_actions
WHERE action_data->>'category' IS NOT NULL
GROUP BY action_data->>'category'
ORDER BY clicks DESC;
```

## Rollback Plan

If issues arise, you can quickly rollback:

```bash
# Restore original non-functional component
mv src/components/portfolio/AICoachingInterface.old.tsx src/components/portfolio/AICoachingInterface.tsx

# The database tables are safe to keep for future use
# They don't affect existing functionality
```

## Success Criteria

✅ **All AI coaching buttons are functional**
✅ **User actions are tracked in database**  
✅ **Integration with existing features works**
✅ **No broken user journeys**
✅ **Analytics show user engagement**
✅ **Performance maintains sub-2s page loads**

This implementation transforms the portfolio AI coaching from a demo interface into a fully functional system that drives real user engagement and goal progress.