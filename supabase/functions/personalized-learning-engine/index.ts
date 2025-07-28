import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../shared/cors.ts'

interface RequestBody {
  userId: string;
  goalId?: string;
  currentRecommendations?: any[];
  userContext?: {
    literacy_level: number;
    preferences: any;
    portfolio_context: string[];
  };
  contentTypes?: string[];
  maxResults?: number;
}

interface LearningContent {
  id: string;
  title: string;
  description: string;
  content_type: 'article' | 'video' | 'interactive' | 'quiz' | 'simulation';
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration: number;
  key_concepts: string[];
  learning_objectives: string[];
  prerequisite_concepts?: string[];
  related_portfolio_context?: string;
  completion_status: 'not_started' | 'in_progress' | 'completed';
  ai_personalization: {
    relevance_score: number;
    recommended_reason: string;
    optimal_timing: string;
    learning_path_position: number;
  };
}

// Helper function to generate personalized learning content
function generatePersonalizedContent(
  userId: string,
  userContext: any,
  recommendations: any[]
): LearningContent[] {
  const content: LearningContent[] = [];
  const literacyLevel = userContext?.literacy_level || 3;
  const portfolioContext = userContext?.portfolio_context || [];

  // Content based on current recommendations
  if (recommendations.some(r => r.type === 'rebalance')) {
    content.push({
      id: 'rebalancing_masterclass',
      title: 'Portfolio Rebalancing Masterclass',
      description: 'Learn the art and science of portfolio rebalancing with real-world examples',
      content_type: 'interactive',
      difficulty_level: literacyLevel >= 6 ? 'advanced' : literacyLevel >= 4 ? 'intermediate' : 'beginner',
      estimated_duration: literacyLevel >= 6 ? 25 : literacyLevel >= 4 ? 15 : 10,
      key_concepts: ['Asset Allocation', 'Portfolio Drift', 'Rebalancing Frequency', 'Transaction Costs'],
      learning_objectives: [
        'Understand when and why to rebalance',
        'Learn different rebalancing strategies',
        'Master cost-effective rebalancing techniques'
      ],
      related_portfolio_context: 'Your portfolio currently shows signs of drift from target allocation',
      completion_status: 'not_started',
      ai_personalization: {
        relevance_score: 0.95,
        recommended_reason: 'Directly addresses your current portfolio rebalancing needs',
        optimal_timing: 'now',
        learning_path_position: 1
      }
    });
  }

  if (recommendations.some(r => r.type === 'risk_alert')) {
    content.push({
      id: 'risk_management_fundamentals',
      title: 'Investment Risk Management',
      description: 'Master the fundamentals of investment risk and how to manage it effectively',
      content_type: 'article',
      difficulty_level: 'intermediate',
      estimated_duration: 12,
      key_concepts: ['Risk Types', 'Risk Tolerance', 'Risk-Return Tradeoff', 'Diversification'],
      learning_objectives: [
        'Identify different types of investment risk',
        'Assess your personal risk tolerance',
        'Learn risk mitigation strategies'
      ],
      related_portfolio_context: 'Your portfolio risk level needs attention',
      completion_status: 'not_started',
      ai_personalization: {
        relevance_score: 0.88,
        recommended_reason: 'Helps you understand and manage portfolio risk effectively',
        optimal_timing: 'this_week',
        learning_path_position: 2
      }
    });
  }

  // Content based on literacy level
  if (literacyLevel < 4) {
    content.push(
      {
        id: 'investing_101',
        title: 'Investing 101: Your First Steps',
        description: 'A beginner-friendly introduction to the world of investing',
        content_type: 'interactive',
        difficulty_level: 'beginner',
        estimated_duration: 15,
        key_concepts: ['Stocks', 'Bonds', 'ETFs', 'Compound Interest', 'Diversification'],
        learning_objectives: [
          'Understand basic investment vehicles',
          'Learn the power of compound interest',
          'Grasp the importance of diversification'
        ],
        completion_status: 'not_started',
        ai_personalization: {
          relevance_score: 0.92,
          recommended_reason: 'Perfect foundation for your investment journey',
          optimal_timing: 'this_week',
          learning_path_position: 1
        }
      },
      {
        id: 'risk_vs_return_basics',
        title: 'Risk vs Return: The Golden Rule',
        description: 'Understand the fundamental relationship between risk and potential returns',
        content_type: 'quiz',
        difficulty_level: 'beginner',
        estimated_duration: 8,
        key_concepts: ['Risk-Return Tradeoff', 'Conservative vs Aggressive', 'Time Horizon'],
        learning_objectives: [
          'Understand risk-return relationship',
          'Learn to match investments to goals',
          'Assess your risk comfort level'
        ],
        completion_status: 'not_started',
        ai_personalization: {
          relevance_score: 0.85,
          recommended_reason: 'Essential knowledge for making informed investment decisions',
          optimal_timing: 'this_week',
          learning_path_position: 2
        }
      }
    );
  } else if (literacyLevel >= 7) {
    content.push(
      {
        id: 'advanced_portfolio_optimization',
        title: 'Advanced Portfolio Optimization Techniques',
        description: 'Explore sophisticated strategies for optimizing portfolio performance',
        content_type: 'simulation',
        difficulty_level: 'advanced',
        estimated_duration: 30,
        key_concepts: ['Modern Portfolio Theory', 'Factor Investing', 'Alpha Generation', 'Risk Parity'],
        learning_objectives: [
          'Master advanced optimization techniques',
          'Understand factor-based investing',
          'Learn to generate alpha systematically'
        ],
        prerequisite_concepts: ['Portfolio Theory', 'Statistical Analysis', 'Market Efficiency'],
        completion_status: 'not_started',
        ai_personalization: {
          relevance_score: 0.90,
          recommended_reason: 'Matches your advanced knowledge level and investment sophistication',
          optimal_timing: 'this_month',
          learning_path_position: 1
        }
      },
      {
        id: 'tax_optimization_strategies',
        title: 'Tax-Efficient Investment Strategies',
        description: 'Master advanced tax optimization techniques for maximum after-tax returns',
        content_type: 'interactive',
        difficulty_level: 'advanced',
        estimated_duration: 25,
        key_concepts: ['Tax-Loss Harvesting', 'Asset Location', 'Tax-Deferred Growth', 'Municipal Bonds'],
        learning_objectives: [
          'Implement tax-loss harvesting strategies',
          'Optimize asset location across accounts',
          'Maximize after-tax returns'
        ],
        completion_status: 'not_started',
        ai_personalization: {
          relevance_score: 0.87,
          recommended_reason: 'Advanced tax strategies can significantly boost your returns',
          optimal_timing: 'this_month',
          learning_path_position: 2
        }
      }
    );
  } else {
    // Intermediate level content
    content.push(
      {
        id: 'etf_selection_mastery',
        title: 'ETF Selection and Analysis',
        description: 'Learn to evaluate and select the best ETFs for your portfolio',
        content_type: 'interactive',
        difficulty_level: 'intermediate',
        estimated_duration: 18,
        key_concepts: ['Expense Ratios', 'Tracking Error', 'Liquidity', 'Tax Efficiency'],
        learning_objectives: [
          'Evaluate ETF quality and costs',
          'Understand tracking error and liquidity',
          'Select optimal ETFs for your goals'
        ],
        completion_status: 'not_started',
        ai_personalization: {
          relevance_score: 0.83,
          recommended_reason: 'Helps you make better ETF selection decisions',
          optimal_timing: 'this_week',
          learning_path_position: 1
        }
      },
      {
        id: 'market_volatility_navigation',
        title: 'Navigating Market Volatility',
        description: 'Learn strategies for staying calm and making smart decisions during market turbulence',
        content_type: 'article',
        difficulty_level: 'intermediate',
        estimated_duration: 14,
        key_concepts: ['Market Cycles', 'Behavioral Biases', 'Dollar-Cost Averaging', 'Rebalancing'],
        learning_objectives: [
          'Understand market cycle patterns',
          'Recognize and avoid behavioral biases',
          'Implement volatility management strategies'
        ],
        completion_status: 'not_started',
        ai_personalization: {
          relevance_score: 0.80,
          recommended_reason: 'Essential skills for long-term investment success',
          optimal_timing: 'this_week',
          learning_path_position: 2
        }
      }
    );
  }

  // Always include some general valuable content
  content.push(
    {
      id: 'behavioral_finance_insights',
      title: 'Psychology of Investing',
      description: 'Understand how emotions and biases affect investment decisions',
      content_type: 'video',
      difficulty_level: 'intermediate',
      estimated_duration: 16,
      key_concepts: ['Behavioral Biases', 'Loss Aversion', 'Overconfidence', 'Herd Mentality'],
      learning_objectives: [
        'Recognize common investment biases',
        'Learn to make rational decisions',
        'Develop emotional discipline'
      ],
      completion_status: 'not_started',
      ai_personalization: {
        relevance_score: 0.75,
        recommended_reason: 'Understanding psychology improves investment outcomes for everyone',
        optimal_timing: 'this_month',
        learning_path_position: 3
      }
    },
    {
      id: 'retirement_planning_essentials',
      title: 'Retirement Planning Strategies',
      description: 'Build a comprehensive retirement plan that ensures financial security',
      content_type: 'interactive',
      difficulty_level: literacyLevel >= 6 ? 'advanced' : 'intermediate',
      estimated_duration: 22,
      key_concepts: ['401(k) Optimization', 'IRA Strategies', 'Social Security', 'Withdrawal Strategies'],
      learning_objectives: [
        'Optimize retirement account contributions',
        'Plan withdrawal strategies',
        'Maximize Social Security benefits'
      ],
      completion_status: 'not_started',
      ai_personalization: {
        relevance_score: 0.78,
        recommended_reason: 'Retirement planning is crucial for long-term financial success',
        optimal_timing: 'this_month',
        learning_path_position: 4
      }
    }
  );

  return content;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { 
      userId, 
      goalId, 
      currentRecommendations = [], 
      userContext = {},
      contentTypes = ['article', 'interactive', 'quiz'],
      maxResults = 12 
    }: RequestBody = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameter: userId' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 400 
        }
      )
    }

    console.log(`Generating personalized learning content for user ${userId}`)

    // Get user's learning progress and preferences
    const { data: learningProgress } = await supabaseClient
      .from('user_learning_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    const { data: userProfile } = await supabaseClient
      .from('user_investment_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Get completed content to avoid duplicates
    const { data: completedContent } = await supabaseClient
      .from('user_learning_activities')
      .select('content_id, completion_status')
      .eq('user_id', userId)
      .in('completion_status', ['completed', 'in_progress']);

    const completedIds = new Set(completedContent?.map(c => c.content_id) || []);

    // Generate personalized content
    const enhancedUserContext = {
      ...userContext,
      literacy_level: learningProgress?.overall_financial_literacy_level || userContext.literacy_level || 3,
      preferences: userProfile || userContext.preferences,
      learning_history: learningProgress,
      completed_content: completedIds
    };

    let personalizedContent = generatePersonalizedContent(
      userId,
      enhancedUserContext,
      currentRecommendations
    );

    // Filter by content types if specified
    if (contentTypes.length > 0) {
      personalizedContent = personalizedContent.filter(content => 
        contentTypes.includes(content.content_type)
      );
    }

    // Remove already completed content
    personalizedContent = personalizedContent.filter(content => 
      !completedIds.has(content.id)
    );

    // Sort by relevance score and learning path position
    personalizedContent.sort((a, b) => {
      if (a.ai_personalization.learning_path_position !== b.ai_personalization.learning_path_position) {
        return a.ai_personalization.learning_path_position - b.ai_personalization.learning_path_position;
      }
      return b.ai_personalization.relevance_score - a.ai_personalization.relevance_score;
    });

    // Limit results
    personalizedContent = personalizedContent.slice(0, maxResults);

    // Update user progress with content recommendations
    if (learningProgress) {
      await supabaseClient
        .from('user_learning_progress')
        .update({
          last_content_recommendation: new Date().toISOString(),
          recommended_content_count: personalizedContent.length
        })
        .eq('user_id', userId);
    }

    console.log(`Generated ${personalizedContent.length} personalized learning items for user ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        content: personalizedContent,
        metadata: {
          user_literacy_level: enhancedUserContext.literacy_level,
          total_recommendations: personalizedContent.length,
          high_relevance_count: personalizedContent.filter(c => c.ai_personalization.relevance_score > 0.8).length,
          content_types_included: [...new Set(personalizedContent.map(c => c.content_type))],
          average_duration: Math.round(personalizedContent.reduce((sum, c) => sum + c.estimated_duration, 0) / personalizedContent.length)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Personalized Learning Engine error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error occurred while generating learning content',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})
