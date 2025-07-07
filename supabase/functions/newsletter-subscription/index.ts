// @deno-types="https://esm.sh/v135/@supabase/supabase-js@2.39.7/dist/module/index.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";

console.log(`Function "newsletter-subscription" up and running!`);

// Define types for our subscription data
interface SubscriptionRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  interests?: string[];
  referralSource?: string;
  marketingConsent: boolean;
}

interface ErrorResponse {
  error: string;
  message?: string;
  details?: unknown;
}

type SupabaseClient = ReturnType<typeof createClient>;

// Helper function to create error response
function createErrorResponse(
  status: number, 
  error: string, 
  details?: unknown,
  headers: Record<string, string> = { ...corsHeaders, 'Content-Type': 'application/json' }
): Response {
  const response: ErrorResponse = { error };
  
  if (details) {
    response.details = details;
    console.error(`Error (${status}): ${error}`, details);
  } else {
    console.error(`Error (${status}): ${error}`);
  }
  
  return new Response(
    JSON.stringify(response),
    { status, headers }
  );
}

// Helper function to validate required environment variables
function validateEnv(): { supabaseUrl: string; supabaseKey: string } {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  
  return { supabaseUrl, supabaseKey };
}

// Create and configure Supabase client
function createSupabaseClient(supabaseUrl: string, supabaseKey: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'X-Client-Info': 'moneko-newsletter-subscription-function'
      }
    }
  });
}

// Helper function to validate request body
async function parseRequestBody<T>(req: Request): Promise<{ data: T | null; error: Response | null }> {
  try {
    const text = await req.text();
    if (!text || text.trim() === '') {
      return { data: null, error: createErrorResponse(400, 'Request body is required') };
    }
    return { data: JSON.parse(text) as T, error: null };
  } catch (error) {
    console.error('Error parsing request body:', error);
    return { 
      data: null, 
      error: createErrorResponse(400, 'Invalid JSON in request body')
    };
  }
}

// Email validation helper
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Handle POST /newsletter-subscription
async function handleCreateSubscription(
  supabase: SupabaseClient,
  req: Request,
  headers: Record<string, string>
): Promise<Response> {
  try {
    // Parse the request body
    const { data: requestData, error: parseError } = await parseRequestBody<SubscriptionRequest>(req);

    if (parseError || !requestData) {
      return parseError || createErrorResponse(400, 'Invalid request body');
    }

    // Validate email
    if (!requestData.email || !isValidEmail(requestData.email)) {
      return createErrorResponse(400, 'Valid email is required');
    }

    // Check if the email already exists
    const { data: existingSubscriber, error: checkError } = await supabase
      .from('newsletter_subscribers')
      .select('email')
      .eq('email', requestData.email.toLowerCase())
      .maybeSingle();

    if (checkError) {
      return createErrorResponse(500, 'Failed to check for existing subscriber', checkError);
    }

    // If the email already exists, update the subscriber
    if (existingSubscriber) {
      const { error: updateError } = await supabase
        .from('newsletter_subscribers')
        .update({
          first_name: requestData.firstName || null,
          last_name: requestData.lastName || null,
          interests: requestData.interests || null,
          referral_source: requestData.referralSource || null,
          marketing_consent: requestData.marketingConsent,
          updated_at: new Date().toISOString(),
        })
        .eq('email', requestData.email.toLowerCase());

      if (updateError) {
        return createErrorResponse(500, 'Failed to update subscriber', updateError);
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Subscription updated successfully',
          isNewSubscriber: false
        }),
        { status: 200, headers }
      );
    }

    // Otherwise, create a new subscriber
    const { error: insertError } = await supabase
      .from('newsletter_subscribers')
      .insert([{
        email: requestData.email.toLowerCase(),
        first_name: requestData.firstName || null,
        last_name: requestData.lastName || null,
        interests: requestData.interests || null,
        referral_source: requestData.referralSource || null,
        marketing_consent: requestData.marketingConsent,
        subscribed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]);

    if (insertError) {
      return createErrorResponse(500, 'Failed to create subscriber', insertError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Subscription created successfully',
        isNewSubscriber: true
      }),
      { status: 201, headers }
    );
  } catch (error) {
    console.error('Error in handleCreateSubscription:', error);
    return createErrorResponse(
      500, 
      'Failed to process subscription', 
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// Main function handler
Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate environment variables
    const { supabaseUrl, supabaseKey } = validateEnv();
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

    // Set common headers
    const headers = {
      ...corsHeaders,
      'Content-Type': 'application/json',
    };

    // We only support POST for creating subscriptions
    if (req.method === 'POST') {
      return handleCreateSubscription(supabase, req, headers);
    }

    return createErrorResponse(405, `Method ${req.method} not allowed`, null, {
      ...corsHeaders,
      'Allow': 'POST, OPTIONS'
    });
  } catch (error) {
    console.error('Unhandled error in newsletter-subscription function:', error);
    return createErrorResponse(
      500,
      'Internal server error',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});
