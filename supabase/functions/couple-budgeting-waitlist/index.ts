import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface CoupleBudgetingClaim {
  email: string;
  firstName?: string;
  lastName?: string;
  referralSource?: string;
  budgetingMethod?: string;
  mobileAppPriorities?: string[];
  interestedMobileFeatures?: string[];
  devicePreference?: string;
  userId?: string;
}

interface CoupleBudgetingResponse {
  success: boolean;
  message?: string;
  error?: string;
  waitlistCount?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const method = req.method;

    // Handle GET request to check if user has joined waitlist
    if (method === 'GET') {
      const userId = url.searchParams.get('userId');
      const email = url.searchParams.get('email');

      if (!userId && !email) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'User ID or email is required'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const { data, error } = await supabase.rpc('check_couple_budgeting_waitlist_claim', {
        p_user_id: userId || null,
        p_email: email || null
      });

      if (error) {
        console.error('Error checking waitlist claim:', error);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to check waitlist status'
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          hasClaimed: data,
          waitlistCount: await supabase.rpc('get_couple_budgeting_waitlist_count').then(({ data }) => data)
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Handle POST request to join waitlist
    if (method === 'POST') {
      const body: CoupleBudgetingClaim = await req.json();

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

      const { data, error } = await supabase.rpc('join_couple_budgeting_waitlist', {
        p_email: body.email,
        p_first_name: body.firstName || null,
        p_last_name: body.lastName || null,
        p_referral_source: body.referralSource || null,
        p_budgeting_method: body.budgetingMethod || null,
        p_mobile_app_priorities: body.mobileAppPriorities || null,
        p_interested_mobile_features: body.interestedMobileFeatures || null,
        p_device_preference: body.devicePreference || null,
        p_user_id: body.userId || null
      });

      if (error) {
        console.error('Error joining waitlist:', error);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to join waitlist. Please try again.'
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const response: CoupleBudgetingResponse = data as CoupleBudgetingResponse;

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
