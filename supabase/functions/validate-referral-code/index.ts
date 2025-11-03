import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { getCorsHeaders } from '../shared/cors.ts'

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

    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { code } = await req.json()

    if (!code || typeof code !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid code parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Validating referral code:', code)

    // Look up the referral code
    const { data: referralCode, error: codeError } = await supabase
      .from('referral_codes')
      .select('id, user_id, is_active')
      .eq('code', code.toUpperCase())
      .maybeSingle()

    if (codeError) {
      console.error('Error looking up referral code:', codeError)
      return new Response(JSON.stringify({ error: 'Failed to validate code' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!referralCode) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Invalid referral code',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!referralCode.is_active) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'This referral code is no longer active',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get referrer user details
    const { data: referrer, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', referralCode.user_id)
      .single()

    if (userError || !referrer) {
      console.error('Error fetching referrer:', userError)
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Invalid referral code',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Mask email for privacy (e.g., j***e@example.com)
    const maskEmail = (email: string | null): string => {
      if (!email) return 'A Moneko user'
      const [local, domain] = email.split('@')
      if (!local || !domain) return email
      if (local.length <= 2) return `${local[0]}*@${domain}`
      const masked = `${local[0]}${'*'.repeat(Math.max(1, local.length - 2))}${local[local.length - 1]}`
      return `${masked}@${domain}`
    }

    return new Response(
      JSON.stringify({
        valid: true,
        referrer: {
          userId: referrer.id,
          email: maskEmail(referrer.email),
          fullName: referrer.full_name || 'A Moneko user',
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in validate-referral-code:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
