import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface GoalAssessmentRequest {
  userId: string;
  goalType: string;
  responses: Record<string, any>;
  timestamp: string;
}

export async function POST(request: Request) {
  try {
    const body: GoalAssessmentRequest = await request.json();
    
    // Validate required fields
    if (!body.userId || !body.goalType || !body.responses) {
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

    // Verify user exists in auth.users (Supabase auth table)
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(body.userId);

    if (authError || !authUser.user) {
      return NextResponse.json(
        { error: 'User not found', success: false },
        { status: 404 }
      );
    }

    // Call the goal assessment Supabase function
    const { data, error } = await supabase.functions.invoke('goal-assessment', {
      body: {
        userId: body.userId,
        goalType: body.goalType,
        responses: body.responses,
        timestamp: body.timestamp
      }
    });

    if (error) {
      console.error('Goal assessment error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to assess goal', success: false },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      goalId: data.goalId,
      goal: data.goal,
      analysis: data.analysis,
      nextStep: 'portfolio_generation'
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}