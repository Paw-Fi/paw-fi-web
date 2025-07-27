import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface PortfolioGenerationRequest {
  goalId: string;
  userId: string;
}

export async function POST(request: Request) {
  try {
    const body: PortfolioGenerationRequest = await request.json();
    
    // Validate required fields
    if (!body.goalId || !body.userId) {
      return NextResponse.json(
        { error: 'Missing required fields', success: false },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch the goal and user profile for portfolio generation
    const { data: goal, error: goalError } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('id', body.goalId)
      .eq('user_id', body.userId)
      .single();

    if (goalError || !goal) {
      return NextResponse.json(
        { error: 'Goal not found or access denied', success: false },
        { status: 404 }
      );
    }

    // Fetch user investment profile (optional - will create default if missing)
    const { data: userProfile } = await supabase
      .from('user_investment_profiles')
      .select('*')
      .eq('user_id', body.userId)
      .single();

    // If no profile exists, the backend function will create a default one
    // This matches the backend function's behavior

    // Prepare data for AI portfolio generation
    const portfolioRequest = {
      goalId: body.goalId,
      userId: body.userId,
      goalType: goal.goal_type,
      targetAmount: goal.target_amount,
      timeline: calculateYearsBetween(new Date(), new Date(goal.target_date)),
      riskTolerance: goal.risk_tolerance,
      userProfile: {
        age: userProfile.age,
        income: userProfile.income_range,
        investmentExperience: userProfile.investment_experience,
        esgPreferences: userProfile.esg_preferences,
        taxSituation: userProfile.tax_situation
      },
      currentAmount: goal.current_amount,
      monthlyContribution: goal.monthly_contribution
    };

    // Call the AI portfolio generator Supabase function
    const { data, error } = await supabase.functions.invoke('ai-portfolio-generator', {
      body: portfolioRequest
    });

    if (error) {
      console.error('Portfolio generation error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to generate portfolio', success: false },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      portfolio: data.portfolio,
      aiInsights: data.aiInsights,
      allocation: data.allocation,
      holdings: data.holdings,
      scenarios: data.scenarios
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const goalId = searchParams.get('goalId');
    const userId = searchParams.get('userId');

    if (!goalId || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters', success: false },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch existing portfolio for the goal
    const { data: portfolio, error } = await supabase
      .from('ai_portfolios')
      .select('*')
      .eq('goal_id', goalId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Portfolio not found', success: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      portfolio
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}

function calculateYearsBetween(startDate: Date, endDate: Date): number {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffYears = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 365.25));
  return diffYears;
}