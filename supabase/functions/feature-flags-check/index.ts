import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface CheckFeatureRequest {
  feature_key: string;
  user_id?: string;  // Optional: defaults to authenticated user
  environment?: 'development' | 'staging' | 'production';
}

interface CheckFeatureResponse {
  enabled: boolean;
  feature_key: string;
  metadata?: any;
  error?: string;
}

serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the user from the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    const body: CheckFeatureRequest = await req.json();
    const {
      feature_key,
      user_id = user.id,
      environment = 'production'
    } = body;

    if (!feature_key) {
      return new Response(
        JSON.stringify({ error: 'feature_key is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Call the is_feature_enabled database function
    const { data, error } = await supabase.rpc('is_feature_enabled', {
      feature_key,
      user_id,
      check_environment: environment
    });

    if (error) {
      console.error('Error checking feature flag:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to check feature flag' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get additional metadata about the feature flag
    const { data: flagData } = await supabase
      .from('feature_flags')
      .select('metadata')
      .eq('key', feature_key)
      .single();

    const response: CheckFeatureResponse = {
      enabled: data as boolean,
      feature_key,
      metadata: flagData?.metadata || null
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
