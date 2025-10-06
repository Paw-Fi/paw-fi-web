// @deno-types="https://esm.sh/v135/@supabase/supabase-js@2.39.7/dist/module/index.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";

console.log(`Function "newsletter-unsubscribe" up and running!`);

interface UnsubscribeRequest {
  email: string;
}

interface ErrorResponse {
  error: string;
  message?: string;
  details?: unknown;
}

type SupabaseClient = ReturnType<typeof createClient>;

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
  return new Response(JSON.stringify(response), { status, headers });
}

function validateEnv(): { supabaseUrl: string; supabaseKey: string } {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  return { supabaseUrl, supabaseKey };
}

function createSupabaseClient(supabaseUrl: string, supabaseKey: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'moneko-newsletter-unsubscribe-function'
      }
    }
  });
}

async function parseRequestBody<T>(req: Request): Promise<{ data: T | null; error: Response | null }> {
  try {
    const text = await req.text();
    if (!text || text.trim() === '') {
      return { data: null, error: createErrorResponse(400, 'Request body is required') };
    }
    return { data: JSON.parse(text) as T, error: null };
  } catch (error) {
    console.error('Error parsing request body:', error);
    return { data: null, error: createErrorResponse(400, 'Invalid JSON in request body') };
  }
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function handleUnsubscribe(
  supabase: SupabaseClient,
  req: Request,
  headers: Record<string, string>
): Promise<Response> {
  try {
    const { data: requestData, error: parseError } = await parseRequestBody<UnsubscribeRequest>(req);
    if (parseError || !requestData) {
      return parseError || createErrorResponse(400, 'Invalid request body');
    }

    const email = requestData.email?.toLowerCase();
    if (!email || !isValidEmail(email)) {
      return createErrorResponse(400, 'Valid email is required');
    }

    // Check if subscriber exists
    const { data: existingSubscriber, error: checkError } = await supabase
      .from('newsletter_subscribers')
      .select('email, marketing_consent')
      .eq('email', email)
      .maybeSingle();

    if (checkError) {
      return createErrorResponse(500, 'Failed to check subscriber', checkError);
    }

    // If subscriber exists and is already unsubscribed, return success
    if (existingSubscriber && (existingSubscriber as any).marketing_consent === false) {
      return new Response(
        JSON.stringify({ success: true, message: 'Already unsubscribed' }),
        { status: 200, headers }
      );
    }

    if (existingSubscriber) {
      const { error: updateError } = await supabase
        .from('newsletter_subscribers')
        .update({ marketing_consent: false, updated_at: new Date().toISOString() })
        .eq('email', email);

      if (updateError) {
        return createErrorResponse(500, 'Failed to unsubscribe', updateError);
      }
    } else {
      // If no subscriber record exists, we treat as success to be idempotent
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Unsubscribed successfully' }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Error in handleUnsubscribe:', error);
    return createErrorResponse(500, 'Failed to process unsubscribe', error instanceof Error ? error.message : 'Unknown error');
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { supabaseUrl, supabaseKey } = validateEnv();
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

    const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

    if (req.method === 'POST') {
      return handleUnsubscribe(supabase, req, headers);
    }

    return createErrorResponse(405, `Method ${req.method} not allowed", null, {
      ...corsHeaders,
      'Allow': 'POST, OPTIONS'
    });
  } catch (error) {
    console.error('Unhandled error in newsletter-unsubscribe function:', error);
    return createErrorResponse(500, 'Internal server error', error instanceof Error ? error.message : 'Unknown error');
  }
});
