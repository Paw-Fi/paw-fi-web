import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { getCorsHeaders } from '../shared/cors.ts'
import { authenticateUser } from '../shared/auth.ts'
// Trial eligibility is determined by presence of an existing subscription row

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

serve(async (req) => {
  const origin = req.headers.get('origin') || ''
  const corsHeaders = getCorsHeaders(origin)

  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders })
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Authenticate user
    const authResult = await authenticateUser(req, supabase)

    if (!authResult.success) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: authResult.statusCode || 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = authResult.userId!

    console.log('Getting referral code for user:', userId)

    // Get or create referral code using database function
    const { data: codeData, error: codeError } = await supabase
      .rpc('get_or_create_referral_code', { p_user_id: userId })
      .single()

    if (codeError) {
      console.error('Error getting referral code:', codeError)
      return new Response(JSON.stringify({ error: 'Failed to get referral code' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Trial info (Stripe-managed). Eligible if no subscription row exists.
    let trialStart: string | null = null
    let trialEnd: string | null = null
    let isTrialing = false
    let trialEligible = false

    const { data: existingSub, error: subError } = await supabase
      .from('subscriptions')
      .select('id, plan, status, trial_start, trial_end, current_period_end')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subError) {
      console.error('Error reading subscriptions:', subError)
    }

    // Do not create or modify subscriptions here. Stripe will manage trials.
    if (!existingSub) {
      trialEligible = true
    } else {
      const plan = (existingSub as any).plan
      const status = (existingSub as any).status
      trialStart = (existingSub as any).trial_start || null
      trialEnd = (existingSub as any).trial_end || null
      isTrialing = status === 'trialing'
      // Eligible if the only record is a free placeholder (no prior paid/trial)
      trialEligible = plan === 'free'
    }

    // Get detailed list of acceptances
    const { data: acceptances, error: acceptancesError } = await supabase
      .from('referral_acceptances')
      .select(`
        id,
        referee_user_id,
        status,
        completed_at,
        referral_acceptances.created_at
      `)
      .eq('referrer_user_id', userId)
      .order('created_at', { ascending: false })

    if (acceptancesError) {
      console.error('Error getting acceptances:', acceptancesError)
      // Don't fail the request, just return empty acceptances
    }

    // Get user details for each acceptance
    const acceptedBy = []
    if (acceptances && acceptances.length > 0) {
      const userIds = acceptances.map(a => a.referee_user_id)

      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .in('id', userIds)

      if (!usersError && users) {
        for (const acceptance of acceptances) {
          const user = users.find(u => u.id === acceptance.referee_user_id)
          if (user) {
            acceptedBy.push({
              userId: user.id,
              email: user.email,
              fullName: user.full_name || 'Anonymous User',
              status: acceptance.status,
              acceptedAt: acceptance.created_at,
              completedAt: acceptance.completed_at,
            })
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        code: codeData.code,
        createdAt: codeData.created_at,
        // Total invitations = all acceptance rows (pending + completed)
        acceptanceCount: Array.isArray(acceptances) ? acceptances.length : acceptedBy.length,
        // Completed = those finalized by webhook after checkout success
        completedCount: acceptedBy.filter(a => a.status === 'completed').length,
        acceptedBy,
        trialStart,
        trialEnd,
        isTrialing,
        trialEligible,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in get-referral-code:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
