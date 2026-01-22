import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import { getCorsHeaders } from '../shared/cors.ts'
import { authenticateUser } from '../shared/auth.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing required SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

type Platform = 'ios' | 'android'

function isPlatform(value: unknown): value is Platform {
  return value === 'ios' || value === 'android'
}

serve(async (req: Request) => {
  const origin = req.headers.get('origin') || ''
  const corsHeaders = getCorsHeaders(origin)

  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders })
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Authenticate: catalog is only available to signed-in users
    const authResult = await authenticateUser(req, supabase)
    if (!authResult.success) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: authResult.statusCode || 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let platform: string | null = null
    if (req.method === 'GET') {
      const url = new URL(req.url)
      platform = url.searchParams.get('platform')
    } else {
      try {
        const body = (await req.json()) as { platform?: unknown } | null
        platform = (body?.platform as string | undefined) ?? null
      } catch (_) {
        platform = null
      }
    }
    if (!isPlatform(platform)) {
      return new Response(JSON.stringify({ error: 'Invalid platform' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data, error } = await supabase
      .from('subscription_products')
      .select(
        [
          'id',
          'platform',
          'plan',
          'billing_interval',
          'store_product_id',
          'display_name',
          'tagline',
          'badge_text',
          'is_popular',
          'display_price_usd',
          'original_price_usd',
          'sort_order',
          'is_active',
        ].join(',')
      )
      .eq('platform', platform)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Failed to fetch subscription products:', error)
      return new Response(JSON.stringify({ error: 'Failed to fetch products' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ products: data ?? [] }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('get-subscription-products error:', e)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
