import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../shared/cors.ts'
import { logUserActivity } from '../shared/activity-logger.ts'

interface PerformanceData {
  id: string;
  date: string;
  portfolio_value: number;
  daily_return: number;
  contributions: number;
  withdrawals: number;
  rebalancing_actions?: any;
  market_conditions?: any;
  ai_commentary?: string;
}

interface RequestBody {
  userId: string;
  goalId: string;
  action: 'fetch' | 'track' | 'simulate';
  // For fetch action
  dateRange?: 'week' | 'month' | '3months' | '6months' | 'year' | 'all';
  // For track action
  performanceData?: {
    portfolio_value: number;
    contributions?: number;
    withdrawals?: number;
    rebalancing_actions?: any;
    market_conditions?: any;
  };
  // For simulate action
  simulationParams?: {
    startValue: number;
    contributions: number;
    expectedReturn: number;
    volatility: number;
    days: number;
  };
}

// Helper function to generate realistic performance data
function generatePerformanceData(
  startValue: number,
  contributions: number,
  expectedReturn: number,
  volatility: number,
  days: number
): PerformanceData[] {
  const data: PerformanceData[] = [];
  let currentValue = startValue;
  const dailyReturn = expectedReturn / 365; // Annualized to daily
  const dailyVolatility = volatility / Math.sqrt(365);
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i - 1));
    
    // Generate random return with normal distribution approximation
    const randomReturn = (Math.random() + Math.random() + Math.random() + Math.random() + Math.random() + Math.random() - 3) / 3;
    const dailyReturnPercent = dailyReturn + (randomReturn * dailyVolatility);
    
    // Apply return to current value
    currentValue = currentValue * (1 + dailyReturnPercent);
    
    // Add contributions (weekly on random days, but averaged)
    const contributionToday = Math.random() < 0.14 ? contributions / 4.33 : 0; // ~weekly
    currentValue += contributionToday;
    
    data.push({
      id: `sim_${i}`,
      date: date.toISOString().split('T')[0],
      portfolio_value: Math.round(currentValue * 100) / 100,
      daily_return: Math.round(dailyReturnPercent * 10000) / 100, // Percentage with 2 decimals
      contributions: contributionToday,
      withdrawals: 0,
      ai_commentary: i % 7 === 0 ? generateAICommentary(dailyReturnPercent, currentValue) : undefined
    });
  }
  
  return data;
}

// Helper function to generate AI commentary
function generateAICommentary(dailyReturn: number, portfolioValue: number): string {
  const absReturn = Math.abs(dailyReturn);
  
  if (dailyReturn > 0.02) {
    return `Excellent performance today! Your portfolio gained ${(dailyReturn * 100).toFixed(2)}%. This strong growth brings you closer to your goal.`;
  } else if (dailyReturn > 0.01) {
    return `Solid gains today with a ${(dailyReturn * 100).toFixed(2)}% increase. Consistent growth like this compounds beautifully over time.`;
  } else if (dailyReturn > 0) {
    return `Modest positive movement today at +${(dailyReturn * 100).toFixed(2)}%. Every step forward counts toward your financial goals.`;
  } else if (dailyReturn > -0.01) {
    return `Minor fluctuation today at ${(dailyReturn * 100).toFixed(2)}%. This is normal market behavior - stay focused on your long-term strategy.`;
  } else if (dailyReturn > -0.02) {
    return `Portfolio dipped ${(Math.abs(dailyReturn) * 100).toFixed(2)}% today. Remember, temporary volatility is part of long-term investing.`;
  } else {
    return `Challenging day with a ${(Math.abs(dailyReturn) * 100).toFixed(2)}% decline. These periods test our resolve but historically, markets recover and grow.`;
  }
}

// Helper function to calculate performance metrics
function calculatePerformanceMetrics(data: PerformanceData[]) {
  if (data.length === 0) return null;
  
  const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const firstValue = sortedData[0].portfolio_value;
  const lastValue = sortedData[sortedData.length - 1].portfolio_value;
  
  // Calculate total contributions
  const totalContributions = sortedData.reduce((sum, day) => sum + (day.contributions || 0), 0);
  const totalWithdrawals = sortedData.reduce((sum, day) => sum + (day.withdrawals || 0), 0);
  
  // Calculate returns excluding contributions
  const investmentGain = lastValue - firstValue - totalContributions + totalWithdrawals;
  const totalReturn = (investmentGain / (firstValue + totalContributions)) * 100;
  
  // Calculate annualized return
  const days = (new Date(sortedData[sortedData.length - 1].date).getTime() - new Date(sortedData[0].date).getTime()) / (1000 * 60 * 60 * 24);
  const annualizedReturn = Math.pow(lastValue / firstValue, 365 / days) - 1;
  
  // Calculate volatility (standard deviation of daily returns)
  const returns = sortedData.filter(d => d.daily_return !== null).map(d => d.daily_return);
  const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance) * Math.sqrt(365); // Annualized
  
  // Find best and worst days
  const bestDay = sortedData.reduce((best, current) => 
    current.daily_return > best.daily_return ? current : best
  );
  const worstDay = sortedData.reduce((worst, current) => 
    current.daily_return < worst.daily_return ? current : worst
  );
  
  return {
    startValue: firstValue,
    endValue: lastValue,
    totalReturn: Math.round(totalReturn * 100) / 100,
    annualizedReturn: Math.round(annualizedReturn * 10000) / 100,
    volatility: Math.round(volatility * 10000) / 100,
    totalContributions,
    totalWithdrawals,
    investmentGain: Math.round(investmentGain * 100) / 100,
    bestDay: {
      date: bestDay.date,
      return: Math.round(bestDay.daily_return * 100) / 100,
      value: bestDay.portfolio_value
    },
    worstDay: {
      date: worstDay.date,
      return: Math.round(worstDay.daily_return * 100) / 100,
      value: worstDay.portfolio_value
    },
    dataPoints: sortedData.length,
    period: `${Math.round(days)} days`
  };
}

serve(async (req) => {
  const startTime = Date.now();
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Parse request body
    const { userId, goalId, action, dateRange, performanceData, simulationParams }: RequestBody = await req.json()

    if (!userId || !goalId || !action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters: userId, goalId, and action' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 400 
        }
      )
    }

    console.log(`Portfolio performance tracker - Action: ${action}, User: ${userId}, Goal: ${goalId}`)

    let result: any = { success: true };

    // Handle different actions
    switch (action) {
      case 'fetch':
        {
          // Calculate date range
          const endDate = new Date();
          const startDate = new Date();
          
          switch (dateRange) {
            case 'week':
              startDate.setDate(endDate.getDate() - 7);
              break;
            case 'month':
              startDate.setMonth(endDate.getMonth() - 1);
              break;
            case '3months':
              startDate.setMonth(endDate.getMonth() - 3);
              break;
            case '6months':
              startDate.setMonth(endDate.getMonth() - 6);
              break;
            case 'year':
              startDate.setFullYear(endDate.getFullYear() - 1);
              break;
            case 'all':
            default:
              startDate.setFullYear(2020); // Far back date to get all data
              break;
          }

          // Fetch performance data from database
          const { data: performanceRecords, error: fetchError } = await supabaseClient
            .from('portfolio_performance')
            .select('*')
            .eq('goal_id', goalId)
            .eq('user_id', userId)
            .gte('date', startDate.toISOString().split('T')[0])
            .lte('date', endDate.toISOString().split('T')[0])
            .order('date', { ascending: true });

          if (fetchError) {
            console.error('Error fetching performance data:', fetchError);
            return new Response(
              JSON.stringify({ success: false, error: 'Failed to fetch performance data' }),
              { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
                status: 500 
              }
            )
          }

          // If no real data exists, generate simulated data for demo purposes
          let finalData = performanceRecords || [];
          
          if (finalData.length === 0) {
            // Get goal details for simulation
            const { data: goal, error: goalError } = await supabaseClient
              .from('financial_goals')
              .select('current_amount, monthly_contribution, target_amount, risk_tolerance')
              .eq('id', goalId)
              .eq('user_id', userId)
              .single();

            if (!goalError && goal && goal.current_amount > 0) {
              // Generate simulated performance data
              const days = dateRange === 'week' ? 7 : 
                          dateRange === 'month' ? 30 :
                          dateRange === '3months' ? 90 :
                          dateRange === '6months' ? 180 :
                          dateRange === 'year' ? 365 : 90;

              const expectedReturn = goal.risk_tolerance === 'aggressive' ? 0.12 : 
                                   goal.risk_tolerance === 'moderate' ? 0.08 : 0.05;
              const volatility = goal.risk_tolerance === 'aggressive' ? 0.20 : 
                                goal.risk_tolerance === 'moderate' ? 0.15 : 0.10;

              finalData = generatePerformanceData(
                goal.current_amount,
                goal.monthly_contribution,
                expectedReturn,
                volatility,
                days
              );
            }
          }

          // Calculate performance metrics
          const metrics = calculatePerformanceMetrics(finalData);

          result = {
            success: true,
            data: finalData,
            metrics,
            dateRange,
            isSimulated: performanceRecords?.length === 0
          };
        }
        break;

      case 'track':
        {
          if (!performanceData) {
            return new Response(
              JSON.stringify({ success: false, error: 'Performance data required for tracking action' }),
              { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
                status: 400 
              }
            )
          }

          const today = new Date().toISOString().split('T')[0];
          
          // Check if entry already exists for today
          const { data: existingEntry } = await supabaseClient
            .from('portfolio_performance')
            .select('id')
            .eq('goal_id', goalId)
            .eq('user_id', userId)
            .eq('date', today)
            .single();

          if (existingEntry) {
            // Update existing entry
            const { data: updatedEntry, error: updateError } = await supabaseClient
              .from('portfolio_performance')
              .update({
                portfolio_value: performanceData.portfolio_value,
                contributions: performanceData.contributions || 0,
                withdrawals: performanceData.withdrawals || 0,
                rebalancing_actions: performanceData.rebalancing_actions,
                market_conditions: performanceData.market_conditions,
              })
              .eq('id', existingEntry.id)
              .select()
              .single();

            if (updateError) {
              console.error('Error updating performance data:', updateError);
              return new Response(
                JSON.stringify({ success: false, error: 'Failed to update performance data' }),
                { 
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
                  status: 500 
                }
              )
            }

            result = { success: true, data: updatedEntry, updated: true };
          } else {
            // Create new entry
            const { data: newEntry, error: insertError } = await supabaseClient
              .from('portfolio_performance')
              .insert([{
                goal_id: goalId,
                user_id: userId,
                date: today,
                portfolio_value: performanceData.portfolio_value,
                daily_return: 0, // Will be calculated later
                contributions: performanceData.contributions || 0,
                withdrawals: performanceData.withdrawals || 0,
                rebalancing_actions: performanceData.rebalancing_actions,
                market_conditions: performanceData.market_conditions,
              }])
              .select()
              .single();

            if (insertError) {
              console.error('Error inserting performance data:', insertError);
              return new Response(
                JSON.stringify({ success: false, error: 'Failed to track performance data' }),
                { 
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
                  status: 500 
                }
              )
            }

            result = { success: true, data: newEntry, created: true };
          }

          // Update goal current amount
          const { error: goalUpdateError } = await supabaseClient
            .from('financial_goals')
            .update({ 
              current_amount: performanceData.portfolio_value,
              updated_at: new Date().toISOString()
            })
            .eq('id', goalId)
            .eq('user_id', userId);

          if (goalUpdateError) {
            console.warn('Failed to update goal amount:', goalUpdateError);
          }
        }
        break;

      case 'simulate':
        {
          if (!simulationParams) {
            return new Response(
              JSON.stringify({ success: false, error: 'Simulation parameters required for simulate action' }),
              { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
                status: 400 
              }
            )
          }

          const simulatedData = generatePerformanceData(
            simulationParams.startValue,
            simulationParams.contributions,
            simulationParams.expectedReturn,
            simulationParams.volatility,
            simulationParams.days
          );

          const metrics = calculatePerformanceMetrics(simulatedData);

          result = {
            success: true,
            data: simulatedData,
            metrics,
            isSimulated: true,
            simulationParams
          };
        }
        break;

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 400 
          }
        )
    }

    // Log user activity
    await logUserActivity(
      supabaseClient,
      userId,
      'portfolio_performance',
      action,
      {
        goal_id: goalId,
        action,
        date_range: dateRange,
        data_points: result.data?.length || 0,
        processing_time_ms: Date.now() - startTime,
        is_simulated: result.isSimulated || false
      },
      'portfolio-performance-tracker'
    );

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Portfolio performance tracker error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error occurred while processing performance data',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})