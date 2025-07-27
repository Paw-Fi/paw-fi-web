import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface CoachingRequest {
  userId: string;
  goalId?: string;
  sessionType?: 'weekly_checkin' | 'goal_assessment' | 'market_update' | 'behavioral_insight' | 'crisis_support' | 'milestone_celebration';
  userMessage?: string;
}

export async function POST(request: Request) {
  try {
    const body: CoachingRequest = await request.json();
    
    // Validate required fields
    if (!body.userId) {
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

    // Call the AI coaching engine Supabase function
    const { data, error } = await supabase.functions.invoke('ai-coaching-engine', {
      body: {
        userId: body.userId,
        goalId: body.goalId,
        sessionType: body.sessionType || 'weekly_checkin',
        userMessage: body.userMessage
      }
    });

    if (error) {
      console.error('Coaching generation error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to generate coaching insights', success: false },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      session: data.session,
      insights: data.insights,
      contextUsed: data.contextUsed
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
    const userId = searchParams.get('userId');
    const goalId = searchParams.get('goalId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter', success: false },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch recent coaching sessions
    let query = supabase
      .from('ai_coaching_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (goalId) {
      query = query.eq('goal_id', goalId);
    }

    const { data: sessions, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch coaching sessions', success: false },
        { status: 400 }
      );
    }

    // Get the latest session for the response
    const latestSession = sessions && sessions.length > 0 ? sessions[0] : null;

    return NextResponse.json({
      success: true,
      latestSession,
      sessions,
      count: sessions?.length || 0
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}