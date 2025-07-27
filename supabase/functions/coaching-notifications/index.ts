import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../shared/cors.ts';

// Type definitions based on database schema
interface UserCoachingProfile {
  user_id: string;
  coaching_enabled: boolean;
  preferred_coaching_personality: string;
  behavioral_preferences?: any;
  age?: number;
  income_range?: string;
  investment_experience?: string;
  risk_tolerance?: string;
}

interface FinancialGoal {
  id: string;
  user_id: string;
  goal_type: string;
  title: string;
  description?: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  monthly_contribution: number;
  status: string;
  priority: number;
}

interface CoachingSession {
  id: string;
  user_id: string;
  goal_id: string;
  session_type: string;
  ai_insights: any;
  coaching_personality: string;
  email_sent: boolean;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  full_name?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Starting coaching notifications job');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get users with coaching enabled who need weekly check-ins
    const { data: eligibleUsers, error: usersError } = await supabase
      .from('user_investment_profiles')
      .select(`
        user_id,
        coaching_enabled,
        preferred_coaching_personality,
        behavioral_preferences,
        age,
        income_range,
        investment_experience,
        risk_tolerance
      `)
      .eq('coaching_enabled', true);

    if (usersError) {
      console.error('Error fetching eligible users:', usersError);
      throw new Error(`Failed to fetch eligible users: ${usersError.message}`);
    }

    if (!eligibleUsers || eligibleUsers.length === 0) {
      console.log('No users with coaching enabled found');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No users with coaching enabled',
        count: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found ${eligibleUsers.length} users with coaching enabled`);

    const userIds = eligibleUsers.map(u => u.user_id);

    // Get user details for eligible users
    const { data: users, error: userDetailsError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .in('id', userIds);

    if (userDetailsError) {
      console.error('Error fetching user details:', userDetailsError);
      throw new Error(`Failed to fetch users: ${userDetailsError.message}`);
    }

    if (!users || users.length === 0) {
      console.log('No user details found');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No users found',
        count: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let processedCount = 0;
    let errorCount = 0;
    const results: any[] = [];

    for (const user of users) {
      try {
        console.log(`Processing coaching for user: ${user.id}`);

        // Get user's coaching profile
        const userProfile = eligibleUsers.find(p => p.user_id === user.id);
        if (!userProfile) {
          console.log(`No coaching profile found for user ${user.id}, skipping`);
          continue;
        }

        // Check if user needs weekly coaching (no coaching session in last 7 days)
        const needsWeeklyCoaching = await checkIfNeedsWeeklyCoaching(supabase, user.id);
        if (!needsWeeklyCoaching) {
          console.log(`User ${user.id} doesn't need coaching yet, skipping`);
          continue;
        }

        // Get user's active goals
        const { data: userGoals, error: goalsError } = await supabase
          .from('financial_goals')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('priority', { ascending: true })
          .order('created_at', { ascending: false });

        if (goalsError) {
          console.error(`Error fetching goals for user ${user.id}:`, goalsError);
          errorCount++;
          continue;
        }

        if (!userGoals || userGoals.length === 0) {
          console.log(`User ${user.id} has no active goals, skipping`);
          continue;
        }

        // Use the highest priority goal (first in the sorted list)
        const primaryGoal = userGoals[0];
        console.log(`Using primary goal: ${primaryGoal.id} for user ${user.id}`);

        // Generate weekly coaching insights
        const { data: coachingData, error: coachingError } = await supabase.functions.invoke('ai-coaching-engine', {
          body: {
            userId: user.id,
            goalId: primaryGoal.id,
            sessionType: 'weekly_checkin'
          }
        });

        if (coachingError) {
          console.error(`Failed to generate coaching for user ${user.id}:`, coachingError);
          errorCount++;
          continue;
        }

        if (!coachingData?.success) {
          console.error(`Coaching generation failed for user ${user.id}:`, coachingData?.error);
          errorCount++;
          continue;
        }

        // Validate coaching data structure
        if (!coachingData.session?.id) {
          console.error(`Invalid coaching session data for user ${user.id}:`, coachingData);
          errorCount++;
          continue;
        }

        console.log(`Generated coaching session ${coachingData.session.id} for user ${user.id}`);

        // Send coaching email
        const emailResult = await sendCoachingEmail(
          user,
          userProfile,
          primaryGoal,
          coachingData.insights || coachingData.session.ai_insights
        );

        if (emailResult.success) {
          // Update email sent flag
          const { error: updateError } = await supabase
            .from('ai_coaching_sessions')
            .update({ 
              email_sent: true,
              email_opened: false // Reset for tracking
            })
            .eq('id', coachingData.session.id);

          if (updateError) {
            console.error(`Error updating email status for session ${coachingData.session.id}:`, updateError);
          }

          processedCount++;
          results.push({
            userId: user.id,
            email: user.email,
            sessionId: coachingData.session.id,
            goalId: primaryGoal.id,
            status: 'sent'
          });
        } else {
          console.error(`Email sending failed for user ${user.id}:`, emailResult.error);
          errorCount++;
          results.push({
            userId: user.id,
            email: user.email,
            status: 'failed',
            error: emailResult.error
          });
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error processing user ${user.id}:`, error);
        errorCount++;
        results.push({
          userId: user.id,
          status: 'error',
          error: error.message
        });
      }
    }

    console.log(`Coaching notifications completed: ${processedCount} sent, ${errorCount} errors`);

    return new Response(JSON.stringify({ 
      success: true, 
      processed: processedCount,
      errors: errorCount,
      total: users.length,
      results: results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Coaching notifications error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function checkIfNeedsWeeklyCoaching(supabase: any, userId: string): Promise<boolean> {
  try {
    // Check if user has had a coaching session in the last 7 days
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const { data: recentSessions, error } = await supabase
      .from('ai_coaching_sessions')
      .select('created_at, session_type, email_sent')
      .eq('user_id', userId)
      .eq('session_type', 'weekly_checkin')
      .gte('created_at', lastWeek.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error(`Error checking recent sessions for user ${userId}:`, error);
      return false; // Conservative approach - don't send if we can't check
    }

    // User needs coaching if they haven't had a weekly check-in in the last 7 days
    const needsCoaching = !recentSessions || recentSessions.length === 0;
    
    if (needsCoaching) {
      console.log(`User ${userId} needs weekly coaching - no sessions in last 7 days`);
    } else {
      console.log(`User ${userId} already has recent coaching session from ${recentSessions[0].created_at}`);
    }

    return needsCoaching;
  } catch (error) {
    console.error(`Error in checkIfNeedsWeeklyCoaching for user ${userId}:`, error);
    return false; // Conservative approach
  }
}

async function sendCoachingEmail(
  user: User, 
  profile: UserCoachingProfile, 
  goal: FinancialGoal,
  insights: any
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate required data
    if (!user.email) {
      throw new Error('User email is required');
    }

    if (!goal) {
      throw new Error('Goal data is required');
    }

    if (!insights) {
      throw new Error('AI insights are required');
    }

    // Calculate progress metrics
    const progressPercentage = goal.current_amount && goal.target_amount 
      ? Math.round((goal.current_amount / goal.target_amount) * 100)
      : 0;
    
    const remainingAmount = goal.target_amount - (goal.current_amount || 0);
    const coachingPersonality = profile?.preferred_coaching_personality || 'friend';

    // Extract first name from full name
    const firstName = user.full_name 
      ? user.full_name.split(' ')[0] 
      : user.email.split('@')[0] || 'there';
    
    // Create personalized email content based on coaching personality and blueprint
    const personalizedSubject = getPersonalizedSubject(coachingPersonality, firstName, progressPercentage, goal);
    const emailTemplate = buildCoachingEmailTemplate(
      user, 
      profile,
      goal, 
      insights, 
      progressPercentage, 
      firstName,
      remainingAmount
    );
    
    try {
      // This would integrate with your email service (Resend, SendGrid, etc.)
      // For now, we'll simulate the email sending
      console.log(`Sending coaching email to: ${user.email}`);
      console.log(`Subject: ${personalizedSubject}`);
      console.log(`Content length: ${emailTemplate.length} characters`);
      
      // TODO: Replace with actual email service integration
      // await sendUserEmail(user.email, firstName, {
      //   subject: personalizedSubject,
      //   html: emailTemplate,
      //   text: `Hi ${firstName}, your weekly financial check-in is ready! View your progress at ${Deno.env.get('SITE_URL')}/portfolio`
      // });
      
      console.log(`Coaching email successfully processed for: ${user.email}`);
      
      return { success: true };
    } catch (emailError) {
      console.error(`Failed to send coaching email to ${user.email}:`, emailError);
      throw emailError;
    }
  } catch (error) {
    console.error(`Error in sendCoachingEmail:`, error);
    return { 
      success: false, 
      error: error.message || 'Unknown error occurred' 
    };
  }
}

function getPersonalizedSubject(
  personality: string, 
  firstName: string, 
  progress: number,
  goal: FinancialGoal
): string {
  const goalType = goal.goal_type;
  const subjects = {
    cheerleader: [
      `🎉 ${firstName}, you're CRUSHING your ${goalType} goal! (${progress}% complete)`,
      `🚀 Amazing progress, ${firstName}! Your portfolio update is here!`,
      `💪 ${firstName}, you're ${progress}% there! Keep going strong!`
    ],
    professor: [
      `📊 Weekly Portfolio Analysis - ${firstName} (Progress: ${progress}%)`,
      `${firstName}, Your Investment Performance Report is Ready`,
      `Market Analysis & Portfolio Update - Week of ${new Date().toLocaleDateString()}`
    ],
    friend: [
      `Hey ${firstName}! Your weekly financial check-in is here 😊`,
      `${firstName}, let's catch up on your ${goalType} progress!`,
      `Your AI coach has some insights for you, ${firstName}!`
    ],
    coach: [
      `${firstName}, time to review your financial game plan! 💪`,
      `Week ${getWeekNumber()}: Your Financial Performance Review`,
      `${firstName}, let's push towards that ${progress}% mark!`
    ]
  };

  const personalitySubjects = subjects[personality as keyof typeof subjects] || subjects.friend;
  return personalitySubjects[Math.floor(Math.random() * personalitySubjects.length)];
}

function buildCoachingEmailTemplate(
  user: User,
  profile: UserCoachingProfile,
  goal: FinancialGoal, 
  insights: any, 
  progressPercentage: number, 
  firstName: string,
  remainingAmount: number
): string {
  const goalTitle = goal.title || `${goal.goal_type} Goal`;
  const currentAmount = (goal.current_amount || 0).toLocaleString();
  const targetAmount = goal.target_amount.toLocaleString();
  const monthlyContribution = (goal.monthly_contribution || 0).toLocaleString();
  
  // Calculate days remaining
  const targetDate = new Date(goal.target_date);
  const today = new Date();
  const daysRemaining = Math.max(0, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  const yearsRemaining = (daysRemaining / 365).toFixed(1);
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Weekly Financial Check-in</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0;
            padding: 0;
            background-color: #f8f9fa;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 30px 20px; 
            text-align: center; 
            border-radius: 8px 8px 0 0; 
            margin: -20px -20px 30px -20px;
        }
        .content { 
            padding: 0 20px 30px 20px; 
        }
        .progress-bar { 
            background: #f0f0f0; 
            height: 12px; 
            border-radius: 6px; 
            overflow: hidden; 
            margin: 15px 0; 
        }
        .progress-fill { 
            background: linear-gradient(90deg, #4CAF50, #45a049); 
            height: 100%; 
            border-radius: 6px; 
            transition: width 0.3s ease; 
        }
        .insight { 
            background: #f8f9fa; 
            border-left: 4px solid #007bff; 
            padding: 15px; 
            margin: 15px 0; 
            border-radius: 4px; 
        }
        .cta-button { 
            display: inline-block; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            font-weight: bold; 
            margin: 15px 0; 
        }
        .footer { 
            background: #f8f9fa; 
            padding: 20px; 
            text-align: center; 
            font-size: 14px; 
            color: #666; 
            border-radius: 0 0 8px 8px; 
            margin: 30px -20px -20px -20px;
        }
        .stats { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
            gap: 15px; 
            margin: 20px 0; 
        }
        .stat { 
            background: #f8f9fa; 
            padding: 15px; 
            text-align: center; 
            border-radius: 6px; 
        }
        .stat-value { 
            font-size: 24px; 
            font-weight: bold; 
            color: #007bff; 
        }
        .stat-label { 
            font-size: 12px; 
            color: #666; 
            text-transform: uppercase; 
        }
        .recommendation {
            background: #e8f4fd;
            border: 1px solid #b3d9ff;
            border-radius: 6px;
            padding: 15px;
            margin: 10px 0;
        }
        .recommendation-title {
            font-weight: bold;
            color: #0066cc;
            margin-bottom: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 Your AI Financial Coach</h1>
            <p>${insights.greeting || `Hi ${firstName}! Here's your weekly financial check-in.`}</p>
        </div>
        
        <div class="content">
            <h2>${goalTitle} Progress Update</h2>
            
            <div class="stats">
                <div class="stat">
                    <div class="stat-value">${progressPercentage}%</div>
                    <div class="stat-label">Complete</div>
                </div>
                <div class="stat">
                    <div class="stat-value">$${currentAmount}</div>
                    <div class="stat-label">Current Amount</div>
                </div>
                <div class="stat">
                    <div class="stat-value">$${targetAmount}</div>
                    <div class="stat-label">Target Amount</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${yearsRemaining}</div>
                    <div class="stat-label">Years Remaining</div>
                </div>
            </div>
            
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${Math.min(progressPercentage, 100)}%"></div>
            </div>
            
            <h3>💡 AI Insights</h3>
            ${insights.observations?.map((obs: any) => `
                <div class="insight">
                    <strong>${obs.title || 'Key Insight'}</strong><br>
                    ${obs.message || obs.description || obs}
                </div>
            `).join('') || '<div class="insight">You\'re making great progress towards your goal!</div>'}
            
            ${insights.recommendations?.length > 0 ? `
                <h3>🎯 Recommended Actions</h3>
                ${insights.recommendations.map((rec: any) => `
                    <div class="recommendation">
                        <div class="recommendation-title">${rec.title || 'Action Item'}</div>
                        <div>${rec.description || rec.message || rec}</div>
                    </div>
                `).join('')}
            ` : ''}
            
            ${insights.marketCommentary ? `
                <h3>📈 Market Update</h3>
                <div class="insight">
                    <p>${insights.marketCommentary}</p>
                </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${Deno.env.get('SITE_URL') || 'https://moneko.ai'}/portfolio" class="cta-button">
                    View Full Portfolio Dashboard →
                </a>
            </div>
            
            <p><em>${insights.personalizedMessage || `Keep up the great work, ${firstName}! You're ${progressPercentage}% of the way to your ${goalTitle.toLowerCase()}.`}</em></p>
        </div>
        
        <div class="footer">
            <p>This email was generated by your AI financial coach at Moneko</p>
            <p>
                <a href="${Deno.env.get('SITE_URL') || 'https://moneko.ai'}/settings/notifications">Update preferences</a> | 
                <a href="${Deno.env.get('SITE_URL') || 'https://moneko.ai'}/unsubscribe">Unsubscribe</a>
            </p>
            <p style="font-size: 12px; color: #999;">
                Goal: ${goalTitle} | Monthly Contribution: $${monthlyContribution} | 
                Remaining: $${remainingAmount.toLocaleString()}
            </p>
        </div>
    </div>
</body>
</html>
  `.trim();
}

function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 7)) + 1;
}