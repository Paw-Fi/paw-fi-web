import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface EarlyAccessClaim {
  email: string;
  firstName?: string;
  lastName?: string;
  referralSource?: string;
  experienceLevel?: string;
  financialGoals?: string[];
  interestedFeatures?: string[];
  interests?: string[]; // Legacy field for backward compatibility
  userId?: string; // User ID for authenticated users
}

interface EarlyAccessResponse {
  success: boolean;
  message?: string;
  error?: string;
  remainingSpots?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { method } = req;

    if (method === 'POST') {
      // Claim early access spot
      const body: EarlyAccessClaim = await req.json();

      // Validate required fields
      if (!body.email) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Email is required' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Please enter a valid email address' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const { data, error } = await supabase.rpc('claim_early_access_spot', {
        p_email: body.email,
        p_first_name: body.firstName || null,
        p_last_name: body.lastName || null,
        p_referral_source: body.referralSource || null,
        p_experience_level: body.experienceLevel || null,
        p_financial_goals: body.financialGoals || null,
        p_interested_features: body.interestedFeatures || null,
        p_interests: body.interests || null,
        p_user_id: body.userId || null
      });

      if (error) {
        console.error('Error claiming spot:', error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to claim spot. Please try again.' 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const response: EarlyAccessResponse = data as EarlyAccessResponse;

      return new Response(
        JSON.stringify(response),
        { 
          status: response.success ? 200 : 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Method not allowed
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'An unexpected error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});