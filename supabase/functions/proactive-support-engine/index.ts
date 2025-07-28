import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../shared/cors.ts'

interface RequestBody {
  userId?: string; // If provided, monitor specific user; otherwise monitor all users
  monitoringType?: 'scheduled' | 'triggered' | 'manual';
  triggerEvent?: string; // What triggered this monitoring session
}

interface MonitoringResult {
  userId: string;
  interventions: ProactiveIntervention[];
  accountHealth: AccountHealthCheck;
  risks: RiskAlert[];
  opportunities: OpportunityAlert[];
}

interface ProactiveIntervention {
  type: 'educational' | 'risk_alert' | 'opportunity' | 'behavioral_coaching' | 'crisis_support' | 'maintenance' | 'celebration';
  priority: 'low' | 'medium' | 'high' | 'urgent' | 'critical';
  title: string;
  content: string;
  recommendedActions: string[];
  triggerConditions: Record<string, any>;
  urgencyScore: number;
}

interface AccountHealthCheck {
  overallHealth: number; // 1-10 scale
  portfolioHealth: number;
  goalProgress: number;
  riskAlignment: number;
  engagementLevel: number;
  concerns: string[];
  strengths: string[];
}

interface RiskAlert {
  type: string;
  severity: number;
  description: string;
  recommendation: string;
}

interface OpportunityAlert {
  type: string;
  potential: number;
  description: string;
  actionRequired: string;
}

// Helper function to check account health
async function checkAccountHealth(
  supabaseClient: any,
  userId: string
): Promise<AccountHealthCheck> {
  const health: AccountHealthCheck = {
    overallHealth: 5,
    portfolioHealth: 5,
    goalProgress: 5,
    riskAlignment: 5,
    engagementLevel: 5,
    concerns: [],
    strengths: []
  };

  try {
    // Get user's financial goals
    const { data: goals } = await supabaseClient
      .from('financial_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (!goals || goals.length === 0) {
      health.concerns.push('No active financial goals set');
      health.goalProgress = 2;
    } else {
      // Check goal progress
      let totalProgress = 0;
      let onTrackGoals = 0;
      
      for (const goal of goals) {
        const progress = (goal.current_amount / goal.target_amount) * 100;
        totalProgress += progress;
        
        const timeRemaining = Math.max(0, Math.ceil(
          (new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        ));
        const yearsRemaining = timeRemaining / 365;
        
        if (yearsRemaining > 0 && progress / yearsRemaining >= 15) { // On track if 15%+ progress per year
          onTrackGoals++;
        }
      }
      
      health.goalProgress = Math.min(10, (totalProgress / goals.length) / 10);
      
      if (onTrackGoals === goals.length) {
        health.strengths.push('All goals are on track');
      } else if (onTrackGoals < goals.length / 2) {
        health.concerns.push('Some goals may be behind schedule');
      }
    }

    // Get current portfolios
    const { data: portfolios } = await supabaseClient
      .from('ai_portfolios')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (!portfolios || portfolios.length === 0) {
      health.concerns.push('No active investment portfolios');
      health.portfolioHealth = 2;
    } else {
      // Check portfolio health
      let avgConfidence = 0;
      let avgRisk = 0;
      
      for (const portfolio of portfolios) {
        avgConfidence += portfolio.confidence_score || 0.5;
        avgRisk += assessPortfolioRisk(portfolio.allocation);
      }
      
      avgConfidence /= portfolios.length;
      avgRisk /= portfolios.length;
      
      health.portfolioHealth = Math.min(10, avgConfidence * 10);
      
      if (avgConfidence > 0.8) {
        health.strengths.push('High-confidence portfolio recommendations');
      } else if (avgConfidence < 0.6) {
        health.concerns.push('Portfolio recommendations need review');
      }
    }

    // Get user investment profile for risk alignment
    const { data: userProfile } = await supabaseClient
      .from('user_investment_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (userProfile && portfolios?.length > 0) {
      const targetRisk = getRiskToleranceScore(userProfile.risk_tolerance);
      const actualRisk = portfolios.reduce((sum, p) => sum + assessPortfolioRisk(p.allocation), 0) / portfolios.length;
      const riskDifference = Math.abs(targetRisk - actualRisk);
      
      health.riskAlignment = Math.max(1, 10 - (riskDifference * 20));
      
      if (riskDifference < 0.1) {
        health.strengths.push('Portfolio risk perfectly aligned with preferences');
      } else if (riskDifference > 0.3) {
        health.concerns.push('Portfolio risk misaligned with stated preferences');
      }
    }

    // Check engagement level
    const { data: recentSessions } = await supabaseClient
      .from('ai_coaching_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    const { data: recentLogins } = await supabaseClient
      .from('user_investment_profiles')
      .select('updated_at')
      .eq('user_id', userId)
      .single();

    const daysSinceLastActivity = recentLogins ? 
      Math.floor((Date.now() - new Date(recentLogins.updated_at).getTime()) / (1000 * 60 * 60 * 24)) : 30;

    health.engagementLevel = Math.max(1, 10 - (daysSinceLastActivity / 3));

    if (daysSinceLastActivity > 14) {
      health.concerns.push('Low recent engagement - user may need support');
    } else if (recentSessions && recentSessions.length > 3) {
      health.strengths.push('High engagement with AI coaching');
    }

    // Calculate overall health
    health.overallHealth = Math.round(
      (health.portfolioHealth + health.goalProgress + health.riskAlignment + health.engagementLevel) / 4
    );

    return health;

  } catch (error) {
    console.error('Error checking account health:', error);
    health.concerns.push('Unable to complete full health check');
    return health;
  }
}

// Helper function to detect risks
async function detectRisks(
  supabaseClient: any,
  userId: string,
  accountHealth: AccountHealthCheck
): Promise<RiskAlert[]> {
  const risks: RiskAlert[] = [];

  try {
    // Portfolio performance risks
    const { data: performance } = await supabaseClient
      .from('portfolio_performance')
      .select('*')
      .eq('user_id', userId)
      .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(30);

    if (performance && performance.length > 7) {
      const recentReturns = performance.slice(0, 7).map(p => p.daily_return || 0);
      const avgReturn = recentReturns.reduce((sum, ret) => sum + ret, 0) / recentReturns.length;
      const annualizedReturn = avgReturn * 252;

      if (annualizedReturn < -0.15) { // More than 15% annualized loss
        risks.push({
          type: 'performance_decline',
          severity: 8,
          description: `Portfolio showing significant decline with ${(annualizedReturn * 100).toFixed(1)}% annualized loss over past week`,
          recommendation: 'Consider risk assessment review and potential portfolio adjustment'
        });
      } else if (annualizedReturn < -0.05) {
        risks.push({
          type: 'underperformance',
          severity: 5,
          description: `Portfolio underperforming with ${(annualizedReturn * 100).toFixed(1)}% annualized return`,
          recommendation: 'Monitor performance and consider rebalancing if trend continues'
        });
      }
    }

    // Goal timeline risks
    const { data: goals } = await supabaseClient
      .from('financial_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (goals) {
      for (const goal of goals) {
        const timeRemaining = Math.max(0, Math.ceil(
          (new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        ));
        const yearsRemaining = timeRemaining / 365;
        const progressPercentage = (goal.current_amount / goal.target_amount) * 100;

        if (yearsRemaining < 2 && progressPercentage < 70) {
          risks.push({
            type: 'goal_timeline_risk',
            severity: 9,
            description: `Goal "${goal.title}" is ${progressPercentage.toFixed(1)}% complete with only ${yearsRemaining.toFixed(1)} years remaining`,
            recommendation: 'Increase contributions or adjust goal timeline to stay on track'
          });
        } else if (yearsRemaining < 5 && progressPercentage < 50) {
          risks.push({
            type: 'goal_progress_warning',
            severity: 6,
            description: `Goal "${goal.title}" may need attention - ${progressPercentage.toFixed(1)}% complete with ${yearsRemaining.toFixed(1)} years left`,
            recommendation: 'Review contribution strategy and consider increasing monthly contributions'
          });
        }
      }
    }

    // Market volatility risks
    const { data: marketData } = await supabaseClient
      .from('market_data_cache')
      .select('*')
      .eq('date', new Date().toISOString().split('T')[0])
      .limit(5);

    if (marketData && marketData.length > 0) {
      // Simplified market volatility check
      const volatilityIndicators = marketData.filter(m => 
        m.data_type === 'market_index' && 
        m.data?.volatility && 
        m.data.volatility > 0.3
      );

      if (volatilityIndicators.length > 2) {
        risks.push({
          type: 'market_volatility',
          severity: 4,
          description: 'Elevated market volatility detected across multiple indicators',
          recommendation: 'Consider defensive positioning or increased cash allocation temporarily'
        });
      }
    }

    // Behavioral risks based on engagement
    if (accountHealth.engagementLevel < 4) {
      risks.push({
        type: 'disengagement_risk',
        severity: 6,
        description: 'Low user engagement may lead to missed opportunities and poor financial decisions',
        recommendation: 'Schedule check-in to understand concerns and re-engage with financial planning'
      });
    }

  } catch (error) {
    console.error('Error detecting risks:', error);
  }

  return risks;
}

// Helper function to identify opportunities
async function identifyOpportunities(
  supabaseClient: any,
  userId: string,
  accountHealth: AccountHealthCheck
): Promise<OpportunityAlert[]> {
  const opportunities: OpportunityAlert[] = [];

  try {
    // Tax loss harvesting opportunities
    const { data: performance } = await supabaseClient
      .from('portfolio_performance')
      .select('*')
      .eq('user_id', userId)
      .gte('date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (performance && performance.some(p => (p.daily_return || 0) < -0.03)) {
      opportunities.push({
        type: 'tax_loss_harvesting',
        potential: 7,
        description: 'Recent portfolio losses may provide tax loss harvesting opportunities',
        actionRequired: 'Review holdings for tax-efficient rebalancing before year-end'
      });
    }

    // Rebalancing opportunities
    const { data: portfolios } = await supabaseClient
      .from('ai_portfolios')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (portfolios && portfolios.length > 0) {
      for (const portfolio of portfolios) {
        // Simulate allocation drift (in real implementation, compare with actual holdings)
        const simulatedDrift = Math.random() * 10;
        if (simulatedDrift > 5) {
          opportunities.push({
            type: 'rebalancing_opportunity',
            potential: 6,
            description: `Portfolio allocation has drifted ${simulatedDrift.toFixed(1)}% from target`,
            actionRequired: 'Consider rebalancing to maintain optimal risk-return profile'
          });
        }
      }
    }

    // Goal acceleration opportunities
    const { data: goals } = await supabaseClient
      .from('financial_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (goals) {
      for (const goal of goals) {
        const progressPercentage = (goal.current_amount / goal.target_amount) * 100;
        const timeRemaining = Math.max(0, Math.ceil(
          (new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        ));
        const yearsRemaining = timeRemaining / 365;

        if (progressPercentage > 80 && yearsRemaining > 2) {
          opportunities.push({
            type: 'goal_acceleration',
            potential: 8,
            description: `Goal "${goal.title}" is ${progressPercentage.toFixed(1)}% complete with ${yearsRemaining.toFixed(1)} years remaining`,
            actionRequired: 'Consider accelerating timeline or setting more ambitious target'
          });
        }
      }
    }

    // Learning opportunities based on recent decisions
    const { data: recentDecisions } = await supabaseClient
      .from('ai_decision_reasoning')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentDecisions && recentDecisions.length > 0) {
      const hasLowConfidence = recentDecisions.some(d => d.confidence_score < 0.7);
      if (hasLowConfidence) {
        opportunities.push({
          type: 'education_opportunity',
          potential: 5,
          description: 'Recent investment decisions show opportunities for learning',
          actionRequired: 'Engage with educational content to improve investment understanding'
        });
      }
    }

  } catch (error) {
    console.error('Error identifying opportunities:', error);
  }

  return opportunities;
}

// Helper function to create interventions
async function createInterventions(
  supabaseClient: any,
  userId: string,
  accountHealth: AccountHealthCheck,
  risks: RiskAlert[],
  opportunities: OpportunityAlert[]
): Promise<ProactiveIntervention[]> {
  const interventions: ProactiveIntervention[] = [];

  // Create interventions based on risks
  for (const risk of risks) {
    if (risk.severity >= 7) {
      interventions.push({
        type: 'risk_alert',
        priority: risk.severity >= 9 ? 'critical' : 'high',
        title: `${risk.type.replace('_', ' ').toUpperCase()} Alert`,
        content: risk.description,
        recommendedActions: [risk.recommendation],
        triggerConditions: { risk_type: risk.type, severity: risk.severity },
        urgencyScore: risk.severity
      });
    }
  }

  // Create interventions based on opportunities
  for (const opportunity of opportunities) {
    if (opportunity.potential >= 6) {
      interventions.push({
        type: 'opportunity',
        priority: opportunity.potential >= 8 ? 'high' : 'medium',
        title: `${opportunity.type.replace('_', ' ').toUpperCase()} Opportunity`,
        content: opportunity.description,
        recommendedActions: [opportunity.actionRequired],
        triggerConditions: { opportunity_type: opportunity.type, potential: opportunity.potential },
        urgencyScore: opportunity.potential
      });
    }
  }

  // Create interventions based on account health
  if (accountHealth.overallHealth <= 4) {
    interventions.push({
      type: 'maintenance',
      priority: accountHealth.overallHealth <= 2 ? 'urgent' : 'high',
      title: 'Account Health Check Needed',
      content: `Your account health score is ${accountHealth.overallHealth}/10. ${accountHealth.concerns.join(', ')}.`,
      recommendedActions: [
        'Review your financial goals',
        'Check portfolio performance',
        'Update investment preferences if needed'
      ],
      triggerConditions: { health_score: accountHealth.overallHealth, concerns: accountHealth.concerns },
      urgencyScore: 10 - accountHealth.overallHealth
    });
  }

  if (accountHealth.engagementLevel <= 3) {
    interventions.push({
      type: 'behavioral_coaching',
      priority: 'medium',
      title: 'Stay Connected with Your Financial Journey',
      content: 'We noticed you haven\'t been as active lately. Regular check-ins help ensure you stay on track with your financial goals.',
      recommendedActions: [
        'Review your recent portfolio performance',
        'Check progress on your financial goals',
        'Explore new educational resources'
      ],
      triggerConditions: { engagement_level: accountHealth.engagementLevel },
      urgencyScore: 5
    });
  }

  // Celebrate positive outcomes
  if (accountHealth.strengths.length > 0 && accountHealth.overallHealth >= 8) {
    interventions.push({
      type: 'celebration',
      priority: 'low',
      title: 'Great Job on Your Financial Progress!',
      content: `You're doing excellent! ${accountHealth.strengths.join('. ')}.`,
      recommendedActions: [
        'Keep up the great work',
        'Consider sharing your success with others',
        'Explore advanced strategies for further optimization'
      ],
      triggerConditions: { health_score: accountHealth.overallHealth, strengths: accountHealth.strengths },
      urgencyScore: 2
    });
  }

  // Store interventions in database
  for (const intervention of interventions) {
    try {
      await supabaseClient
        .from('proactive_interventions')
        .insert({
          user_id: userId,
          intervention_type: intervention.type,
          priority_level: intervention.priority,
          urgency_score: intervention.urgencyScore,
          trigger_conditions: intervention.triggerConditions,
          intervention_content: {
            title: intervention.title,
            content: intervention.content,
            recommended_actions: intervention.recommendedActions
          },
          recommended_actions: intervention.recommendedActions,
          detection_method: 'automated_monitoring',
          ai_confidence_score: 0.85
        });
    } catch (error) {
      console.error('Error storing intervention:', error);
    }
  }

  return interventions;
}

// Utility functions
function assessPortfolioRisk(allocation: Record<string, number>): number {
  const stocks = allocation.stocks || 0;
  const bonds = allocation.bonds || 0;
  const alternatives = allocation.alternatives || 0;
  const cash = allocation.cash || 0;
  
  return (stocks * 0.8 + alternatives * 1.0 + bonds * 0.3 + cash * 0.1) / 100;
}

function getRiskToleranceScore(riskTolerance: string): number {
  switch (riskTolerance) {
    case 'conservative': return 0.3;
    case 'moderate': return 0.6;
    case 'aggressive': return 0.9;
    default: return 0.6;
  }
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

    const { userId, monitoringType = 'scheduled', triggerEvent }: RequestBody = await req.json()

    console.log(`Running proactive support engine - Type: ${monitoringType}, User: ${userId || 'all'}`)

    const results: MonitoringResult[] = [];

    // Determine which users to monitor
    let usersToMonitor: string[] = [];
    if (userId) {
      usersToMonitor = [userId];
    } else {
      // Get all active users (in production, you'd want to limit this and process in batches)
      const { data: users } = await supabaseClient
        .from('user_investment_profiles')
        .select('user_id')
        .limit(100); // Process in batches

      usersToMonitor = users?.map(u => u.user_id) || [];
    }

    // Monitor each user
    for (const currentUserId of usersToMonitor) {
      try {
        console.log(`Monitoring user: ${currentUserId}`);

        // Check account health
        const accountHealth = await checkAccountHealth(supabaseClient, currentUserId);

        // Detect risks
        const risks = await detectRisks(supabaseClient, currentUserId, accountHealth);

        // Identify opportunities
        const opportunities = await identifyOpportunities(supabaseClient, currentUserId, accountHealth);

        // Create interventions
        const interventions = await createInterventions(
          supabaseClient,
          currentUserId,
          accountHealth,
          risks,
          opportunities
        );

        results.push({
          userId: currentUserId,
          interventions,
          accountHealth,
          risks,
          opportunities
        });

        console.log(`Created ${interventions.length} interventions for user ${currentUserId}`);

      } catch (error) {
        console.error(`Error monitoring user ${currentUserId}:`, error);
      }
    }

    const totalInterventions = results.reduce((sum, r) => sum + r.interventions.length, 0);

    console.log(`Proactive support monitoring complete - ${totalInterventions} total interventions created`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        summary: {
          users_monitored: usersToMonitor.length,
          total_interventions: totalInterventions,
          monitoring_type: monitoringType,
          trigger_event: triggerEvent
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Proactive Support Engine error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error occurred during proactive monitoring',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})