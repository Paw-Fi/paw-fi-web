# AI-Powered Goal-Based Portfolio Tracker: Implementation Plan

## Executive Overview
Transform Moneko into a comprehensive AI financial coach that guides users toward specific life goals through intelligent portfolio management, continuous engagement, and personalized coaching.

## Technical Foundation
- **Frontend**: React 19 + TanStack Start (SSR)
- **Backend**: Supabase Edge Functions + PostgreSQL
- **AI Integration**: Google Gemini for analysis and coaching
- **Real-time**: Supabase subscriptions for live updates
- **Payment**: Existing Stripe integration for premium tiers

## Phase 1: Database Schema & Core Infrastructure

### 1.1 Database Tables (Migration: 20250125_portfolio_tracker_schema.sql)

```sql
-- Financial Goals Table
CREATE TABLE financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('retirement', 'home_purchase', 'education', 'wealth_building', 'emergency_fund', 'custom')),
  title TEXT NOT NULL,
  target_amount DECIMAL(15,2) NOT NULL,
  target_date DATE NOT NULL,
  current_amount DECIMAL(15,2) DEFAULT 0,
  monthly_contribution DECIMAL(10,2) DEFAULT 0,
  risk_tolerance TEXT CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
  priority INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  ai_assessment JSONB, -- Store AI analysis results
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Portfolio Recommendations
CREATE TABLE ai_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES financial_goals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  allocation JSONB NOT NULL, -- {"stocks": 65, "bonds": 25, "alternatives": 10}
  recommended_holdings JSONB NOT NULL, -- Detailed investment recommendations
  risk_score DECIMAL(3,2), -- 0.00 to 1.00
  expected_return DECIMAL(5,2), -- Expected annual return percentage
  confidence_score DECIMAL(3,2), -- AI confidence in recommendations
  scenario_analysis JSONB, -- Best/expected/worst case projections
  rebalancing_triggers JSONB, -- When to suggest rebalancing
  version INTEGER DEFAULT 1, -- Track portfolio versions
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Coaching Sessions & Insights
CREATE TABLE ai_coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES financial_goals(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('weekly_checkin', 'goal_assessment', 'market_update', 'behavioral_insight', 'crisis_support')),
  ai_insights JSONB NOT NULL, -- AI-generated insights and recommendations
  user_responses JSONB, -- User feedback and actions taken
  engagement_score INTEGER CHECK (engagement_score BETWEEN 1 AND 10),
  recommended_actions JSONB, -- Specific actions suggested by AI
  completed_actions JSONB, -- Actions user completed
  scheduled_for TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Investment Preferences & Behavior
CREATE TABLE user_investment_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  age INTEGER,
  income_range TEXT,
  investment_experience TEXT CHECK (investment_experience IN ('beginner', 'intermediate', 'advanced')),
  risk_tolerance TEXT CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
  investment_timeline INTEGER, -- Years
  esg_preferences BOOLEAN DEFAULT false,
  tax_situation JSONB, -- Tax bracket, account types, etc.
  behavioral_preferences JSONB, -- Communication style, frequency, etc.
  onboarding_completed BOOLEAN DEFAULT false,
  profile_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio Performance Tracking
CREATE TABLE portfolio_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES financial_goals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  portfolio_value DECIMAL(15,2) NOT NULL,
  daily_return DECIMAL(8,4), -- Daily return percentage
  contributions DECIMAL(10,2) DEFAULT 0,
  withdrawals DECIMAL(10,2) DEFAULT 0,
  rebalancing_actions JSONB, -- Any rebalancing performed
  market_conditions JSONB, -- Market context for the day
  ai_commentary TEXT, -- AI analysis of performance
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(goal_id, date)
);

-- Goal Progress Milestones
CREATE TABLE goal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES financial_goals(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL CHECK (milestone_type IN ('percentage', 'amount', 'time_based')),
  target_value DECIMAL(15,2) NOT NULL,
  achieved BOOLEAN DEFAULT false,
  achieved_at TIMESTAMPTZ,
  celebration_sent BOOLEAN DEFAULT false,
  ai_message TEXT, -- Personalized celebration message
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.2 Row Level Security Policies

```sql
-- Enable RLS on all tables
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_investment_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;

-- Policies for user data access
CREATE POLICY "Users can manage their own goals" ON financial_goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view their portfolios" ON ai_portfolios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can access their coaching sessions" ON ai_coaching_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their investment profile" ON user_investment_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view their performance data" ON portfolio_performance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their milestones" ON goal_milestones FOR SELECT USING (
  EXISTS (SELECT 1 FROM financial_goals WHERE id = goal_milestones.goal_id AND user_id = auth.uid())
);
```

## Phase 2: AI Engine & Edge Functions

### 2.1 Core AI Portfolio Generator (supabase/functions/ai-portfolio-generator/index.ts)

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface PortfolioRequest {
  goalId: string;
  goalType: string;
  targetAmount: number;
  timeline: number; // years
  riskTolerance: string;
  userProfile: {
    age: number;
    income: number;
    investmentExperience: string;
    existingInvestments?: any[];
  };
}

serve(async (req) => {
  try {
    const { goalId, goalType, targetAmount, timeline, riskTolerance, userProfile }: PortfolioRequest = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // AI Portfolio Generation Logic
    const portfolioAnalysis = await generateAIPortfolio({
      goalType,
      targetAmount,
      timeline,
      riskTolerance,
      userProfile
    });

    // Store AI-generated portfolio
    const { data: portfolio, error } = await supabase
      .from('ai_portfolios')
      .insert({
        goal_id: goalId,
        user_id: userProfile.userId,
        allocation: portfolioAnalysis.allocation,
        recommended_holdings: portfolioAnalysis.holdings,
        risk_score: portfolioAnalysis.riskScore,
        expected_return: portfolioAnalysis.expectedReturn,
        confidence_score: portfolioAnalysis.confidenceScore,
        scenario_analysis: portfolioAnalysis.scenarios,
        rebalancing_triggers: portfolioAnalysis.rebalancingTriggers
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ 
      success: true, 
      portfolio: portfolio,
      aiInsights: portfolioAnalysis.insights 
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

async function generateAIPortfolio(params: any) {
  const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert financial advisor AI. Generate personalized investment portfolios based on user goals and risk profiles. Return structured JSON with allocation percentages, specific investment recommendations, risk analysis, and scenario projections.`
        },
        {
          role: 'user',
          content: `Generate a portfolio for: Goal: ${params.goalType}, Target: $${params.targetAmount}, Timeline: ${params.timeline} years, Risk: ${params.riskTolerance}, Age: ${params.userProfile.age}, Experience: ${params.userProfile.investmentExperience}`
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    })
  });

  const aiResponse = await openAIResponse.json();
  return JSON.parse(aiResponse.choices[0].message.content);
}
```

### 2.2 AI Coaching Engine (supabase/functions/ai-coaching-engine/index.ts)

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const { userId, sessionType = 'weekly_checkin', goalId } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch user context
    const { data: userContext } = await supabase
      .rpc('get_user_coaching_context', { user_id: userId, goal_id: goalId });

    // Generate AI coaching insights
    const coachingInsights = await generateCoachingInsights(userContext, sessionType);

    // Store coaching session
    const { data: session, error } = await supabase
      .from('ai_coaching_sessions')
      .insert({
        user_id: userId,
        goal_id: goalId,
        session_type: sessionType,
        ai_insights: coachingInsights,
        recommended_actions: coachingInsights.actions,
        scheduled_for: new Date()
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ 
      success: true, 
      session: session,
      insights: coachingInsights 
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

async function generateCoachingInsights(userContext: any, sessionType: string) {
  const prompt = buildCoachingPrompt(userContext, sessionType);
  
  const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a personalized AI financial coach. Provide encouraging, actionable insights based on user's progress, market conditions, and behavioral patterns. Be supportive but honest about challenges.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    })
  });

  const aiResponse = await openAIResponse.json();
  return JSON.parse(aiResponse.choices[0].message.content);
}
```

## Phase 3: Frontend Components Architecture

### 3.1 Goal Selection Interface (src/components/portfolio/GoalSelector.tsx)

```typescript
interface GoalType {
  id: string;
  icon: string;
  title: string;
  description: string;
  assessmentQuestions: AssessmentQuestion[];
}

export function GoalSelector() {
  const [selectedGoal, setSelectedGoal] = useState<GoalType | null>(null);
  const [assessmentStep, setAssessmentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});

  const goalTypes: GoalType[] = [
    {
      id: 'retirement',
      icon: '<�',
      title: 'Retirement Planning',
      description: 'Build wealth for your golden years',
      assessmentQuestions: [
        {
          id: 'current_age',
          type: 'slider',
          question: 'What is your current age?',
          range: [18, 70],
          required: true
        },
        {
          id: 'target_retirement_age',
          type: 'slider', 
          question: 'When do you plan to retire?',
          range: [50, 75],
          required: true
        },
        {
          id: 'retirement_lifestyle',
          type: 'textarea',
          question: 'Describe your ideal retirement lifestyle',
          placeholder: 'Travel frequently, maintain current home, hobbies...',
          required: true
        },
        {
          id: 'risk_scenario',
          type: 'single_choice',
          question: 'Your portfolio drops 20% in the first month. You:',
          options: [
            { id: 'buy_more', label: 'Buy more while prices are low', riskLevel: 'aggressive' },
            { id: 'hold_steady', label: 'Hold steady and wait it out', riskLevel: 'moderate' },
            { id: 'reduce_risk', label: 'Move to safer investments', riskLevel: 'conservative' }
          ],
          required: true
        }
      ]
    },
    // Additional goal types...
  ];

  const handleGoalSelection = (goal: GoalType) => {
    setSelectedGoal(goal);
    setAssessmentStep(1);
  };

  const handleAssessmentComplete = async () => {
    const goalAssessment = {
      goalType: selectedGoal!.id,
      responses,
      timestamp: new Date().toISOString()
    };

    // Submit to AI assessment API
    const { data } = await supabase.functions.invoke('goal-assessment', {
      body: JSON.stringify(goalAssessment)
    }).then(res => res.json());

    // Navigate to portfolio generation
    router.navigate(`/portfolio/generate/${data.goalId}`);
  };

  if (!selectedGoal) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-center mb-8">
          What's your primary financial goal?
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goalTypes.map((goal) => (
            <GoalTypeCard
              key={goal.id}
              goal={goal}
              onSelect={() => handleGoalSelection(goal)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <GoalAssessmentWizard
      goal={selectedGoal}
      currentStep={assessmentStep}
      responses={responses}
      onUpdateResponse={(questionId, value) => 
        setResponses(prev => ({ ...prev, [questionId]: value }))
      }
      onComplete={handleAssessmentComplete}
    />
  );
}
```

### 3.2 AI Portfolio Display (src/components/portfolio/AIPortfolioDisplay.tsx)

```typescript
interface AIPortfolioDisplayProps {
  goalId: string;
  userTier: 'free' | 'premium' | 'plus';
}

export function AIPortfolioDisplay({ goalId, userTier }: AIPortfolioDisplayProps) {
  const { data: portfolio, isLoading } = useQuery({
    queryKey: ['ai-portfolio', goalId],
    queryFn: () => fetchAIPortfolio(goalId)
  });

  const { data: scenarios } = useQuery({
    queryKey: ['portfolio-scenarios', goalId],
    queryFn: () => fetchPortfolioScenarios(goalId),
    enabled: userTier !== 'free'
  });

  if (isLoading) return <PortfolioLoadingState />;

  const freeHoldings = portfolio?.recommended_holdings?.slice(0, 1) || [];
  const premiumHoldings = portfolio?.recommended_holdings || [];
  const displayHoldings = userTier === 'free' ? freeHoldings : premiumHoldings;

  return (
    <div className="space-y-8">
      {/* AI Analysis Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-8 h-8" />
          <h2 className="text-2xl font-bold">Your AI-Optimized Portfolio</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-blue-100">AI Confidence</p>
            <p className="text-3xl font-bold">{Math.round(portfolio.confidence_score * 100)}%</p>
          </div>
          <div>
            <p className="text-blue-100">Expected Return</p>
            <p className="text-3xl font-bold">{portfolio.expected_return}% / year</p>
          </div>
          <div>
            <p className="text-blue-100">Risk Level</p>
            <p className="text-3xl font-bold capitalize">{portfolio.risk_level}</p>
          </div>
        </div>
      </div>

      {/* Portfolio Allocation */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4">Asset Allocation</h3>
        <div className="space-y-4">
          {Object.entries(portfolio.allocation).map(([asset, percentage]) => (
            <div key={asset} className="flex items-center justify-between">
              <span className="capitalize font-medium">{asset}</span>
              <div className="flex items-center gap-3">
                <div className="w-32 bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-500 h-3 rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="font-semibold">{percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Investment Holdings */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">Recommended Holdings</h3>
          {userTier === 'free' && (
            <div className="bg-yellow-100 px-3 py-1 rounded-full">
              <span className="text-sm text-yellow-800">
                Showing 1 of {portfolio.recommended_holdings.length} holdings
              </span>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          {displayHoldings.map((holding: any, index: number) => (
            <HoldingCard key={holding.symbol} holding={holding} />
          ))}
          
          {userTier === 'free' && portfolio.recommended_holdings.length > 1 && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Lock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-gray-600 mb-4">
                {portfolio.recommended_holdings.length - 1} more holdings available
              </p>
              <Button 
                onClick={() => upgradeModal.open()}
                className="bg-gradient-to-r from-blue-500 to-purple-600"
              >
                Unlock Full Portfolio Details �
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Scenario Analysis - Premium Only */}
      {userTier !== 'free' && scenarios && (
        <ScenarioAnalysisDisplay scenarios={scenarios} />
      )}
    </div>
  );
}
```

### 3.3 AI Coaching Interface (src/components/portfolio/AICoachingInterface.tsx)

```typescript
export function AICoachingInterface({ userId, goalId }: { userId: string; goalId: string }) {
  const { data: latestSession } = useQuery({
    queryKey: ['coaching-session', userId, goalId],
    queryFn: () => fetchLatestCoachingSession(userId, goalId),
    refetchInterval: 1000 * 60 * 60 // Refetch every hour
  });

  const { data: weeklyProgress } = useQuery({
    queryKey: ['weekly-progress', goalId],
    queryFn: () => fetchWeeklyProgress(goalId)
  });

  const [showFullInsights, setShowFullInsights] = useState(false);

  if (!latestSession) return <CoachingSessionSkeleton />;

  const insights = latestSession.ai_insights;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* AI Coach Header */}
      <div className="bg-gradient-to-r from-green-400 to-blue-500 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Bot className="w-6 h-6" />
          <span className="text-sm opacity-90">Your AI Financial Coach</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">
          {insights.greeting || "Great to see you back!"}
        </h1>
        <p className="text-green-100">
          {insights.summary || "Here's your weekly financial check-in"}
        </p>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ProgressCard
          title="Goal Progress"
          value={`${weeklyProgress?.goalProgress || 0}%`}
          change={weeklyProgress?.progressChange}
          positive={weeklyProgress?.progressChange > 0}
          icon={Target}
        />
        <ProgressCard
          title="Portfolio Value"
          value={formatCurrency(weeklyProgress?.portfolioValue || 0)}
          change={weeklyProgress?.valueChange}
          positive={weeklyProgress?.valueChange > 0}
          icon={TrendingUp}
        />
        <ProgressCard
          title="This Week's Return"
          value={`${weeklyProgress?.weeklyReturn || 0}%`}
          change={null}
          positive={weeklyProgress?.weeklyReturn > 0}
          icon={BarChart3}
        />
      </div>

      {/* AI Insights & Recommendations */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          AI Insights & Recommendations
        </h2>
        
        <div className="space-y-4">
          {insights.observations?.map((observation: any, index: number) => (
            <AIInsightCard key={index} insight={observation} />
          ))}
        </div>

        {insights.recommendations && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Recommended Actions</h3>
            <div className="space-y-2">
              {insights.recommendations.map((rec: any, index: number) => (
                <RecommendationItem 
                  key={index} 
                  recommendation={rec}
                  onTakeAction={(action) => handleRecommendationAction(action)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Market Commentary */}
      {insights.marketCommentary && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-500" />
            Market Intelligence
          </h2>
          <p className="text-gray-700 leading-relaxed">
            {insights.marketCommentary}
          </p>
        </div>
      )}

      {/* Conversation Mode - Premium */}
      <AIConversationMode 
        userId={userId}
        goalId={goalId}
        context={latestSession}
      />
    </div>
  );
}
```

## Phase 4: Integration & Routing

### 4.1 API Routes (src/routes/api/portfolio/)

```typescript
// src/routes/api/portfolio/assess-goal.ts
export async function POST({ request }: APIRouteContext) {
  const session = await getServerSession(request);
  if (!session) return json({ error: 'Unauthorized' }, { status: 401 });

  const assessment = await request.json();
  
  // Process goal assessment and create goal record
  const goal = await processGoalAssessment(session.user.id, assessment);
  
  return json({ goalId: goal.id, assessment });
}

// src/routes/api/portfolio/generate.ts
export async function POST({ request }: APIRouteContext) {
  const session = await getServerSession(request);
  if (!session) return json({ error: 'Unauthorized' }, { status: 401 });

  const { goalId } = await request.json();
  
  // Call Supabase function to generate AI portfolio
  const { data, error } = await supabase.functions.invoke('ai-portfolio-generator', {
    body: { goalId, userId: session.user.id }
  });

  if (error) return json({ error: error.message }, { status: 400 });
  
  return json(data);
}
```

### 4.2 Main Portfolio Routes (src/routes/portfolio/)

```typescript
// src/routes/portfolio/index.tsx - Portfolio Dashboard
export default function PortfolioDashboard() {
  const { user } = useAuth();
  const { data: goals } = useQuery({
    queryKey: ['user-goals', user?.id],
    queryFn: () => fetchUserGoals(user!.id),
    enabled: !!user
  });

  if (!goals?.length) {
    return <GoalSelector />;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Your Financial Goals</h1>
        <Button onClick={() => router.navigate('/portfolio/new-goal')}>
          Add New Goal
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {goals.map(goal => (
          <GoalOverviewCard key={goal.id} goal={goal} />
        ))}
      </div>
      
      <AICoachingInterface userId={user!.id} goalId={goals[0]?.id} />
    </div>
  );
}

// src/routes/portfolio/goal/$goalId.tsx - Individual Goal Detail
export default function GoalDetail() {
  const { goalId } = useParams();
  const { user } = useAuth();
  const { data: subscription } = useSubscription();
  
  const userTier = subscription?.tier || 'free';

  return (
    <div className="space-y-8">
      <GoalHeader goalId={goalId} />
      <AIPortfolioDisplay goalId={goalId} userTier={userTier} />
      <PerformanceChart goalId={goalId} />
      <GoalMilestones goalId={goalId} />
    </div>
  );
}
```

## Phase 5: Premium Features & Monetization

### 5.1 Subscription Tier Integration

```typescript
// src/hooks/useSubscriptionAccess.ts
export function useSubscriptionAccess() {
  const { data: subscription } = useQuery({
    queryKey: ['user-subscription'],
    queryFn: fetchUserSubscription
  });

  const tier = subscription?.tier || 'free';

  const access = {
    maxGoals: tier === 'free' ? 1 : tier === 'premium' ? 3 : Infinity,
    fullPortfolioDetails: tier !== 'free',
    aiConversationMode: tier === 'plus',
    scenarioAnalysis: tier !== 'free',
    taxOptimization: tier !== 'free',
    multiGoalOrchestration: tier === 'plus',
    predictiveLifePlanning: tier === 'plus',
    weeklyCoaching: tier !== 'free',
    rebalancingAlerts: tier !== 'free'
  };

  return { tier, access, subscription };
}

// Upgrade prompts throughout the UI
export function UpgradePrompt({ feature, children }: { feature: string; children: React.ReactNode }) {
  const { access } = useSubscriptionAccess();
  const upgradeModal = useUpgradeModal();

  if (access[feature as keyof typeof access]) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 rounded-lg" />
      <div className="relative opacity-60 pointer-events-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Button 
          onClick={() => upgradeModal.open({ feature })}
          className="bg-gradient-to-r from-yellow-500 to-orange-500"
        >
          Upgrade to Access
        </Button>
      </div>
    </div>
  );
}
```

## Phase 6: Engagement & Notification System

### 6.1 Email & Push Notifications (supabase/functions/coaching-notifications/index.ts)

```typescript
// Weekly coaching email sender
import { EmailService } from '../shared/email-service.ts';

serve(async (req) => {
  const supabase = createClient(/*...*/);
  
  // Get users due for weekly check-in
  const { data: users } = await supabase
    .from('users')
    .select(`
      *,
      financial_goals(*),
      ai_coaching_sessions(*),
      user_investment_profiles(*)
    `)
    .eq('coaching_notifications_enabled', true);

  for (const user of users) {
    // Generate weekly coaching insights
    const insights = await generateWeeklyInsights(user);
    
    // Send personalized email
    await EmailService.sendWeeklyCoaching({
      to: user.email,
      insights,
      goals: user.financial_goals,
      personalizations: {
        name: user.first_name,
        tier: user.subscription_tier
      }
    });
    
    // Record coaching session
    await supabase
      .from('ai_coaching_sessions')
      .insert({
        user_id: user.id,
        session_type: 'weekly_checkin',
        ai_insights: insights,
        scheduled_for: new Date()
      });
  }

  return new Response('Notifications sent', { status: 200 });
});
```

## Phase 7: Testing & Quality Assurance

### 7.1 Component Testing Strategy
- Unit tests for all AI response processing
- Integration tests for portfolio generation flow
- E2E tests for complete user journey
- Performance testing for AI response times
- Security testing for financial data handling

### 7.2 AI Model Validation
- A/B testing for different coaching personalities
- Portfolio recommendation accuracy tracking
- User engagement metrics by AI approach
- Conversion rate optimization for upgrade prompts

## Implementation Timeline

### Week 1-2: Foundation
- Database schema implementation
- Core AI edge functions
- Basic goal selection interface

### Week 3-4: Portfolio Engine
- AI portfolio generation
- Portfolio display components
- Integration with existing user system

### Week 5-6: Coaching System
- AI coaching insights generation
- Weekly check-in automation
- Engagement tracking

### Week 7-8: Premium Features
- Subscription tier restrictions
- Advanced AI conversation mode
- Multi-goal orchestration

### Week 9-10: Polish & Launch
- Performance optimization
- Security audit
- User acceptance testing
- Production deployment

## Success Metrics
- **User Activation**: 70%+ complete goal setup within 48 hours  
- **Engagement**: 80%+ weekly check-in interaction rate
- **Conversion**: 15%+ free to premium conversion
- **Retention**: 85%+ 6-month retention rate
- **Financial Impact**: Average 12% improvement in savings rate

This implementation plan transforms Moneko into a comprehensive AI-powered financial coach that guides users through their entire financial journey while creating significant recurring revenue opportunities.