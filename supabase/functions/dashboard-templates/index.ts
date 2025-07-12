// Supabase Edge Function for dashboard templates management
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";
import { corsHeaders } from "../shared/cors.ts";
import { getAllTemplates, getTemplateById } from "../shared/template-loader.ts";

console.log(`Function "dashboard-templates" up and running!`);

// Helper function to create error response
function createErrorResponse(
  status: number, 
  error: string, 
  details?: unknown,
  headers: Record<string, string> = { ...corsHeaders, 'Content-Type': 'application/json' }
): Response {
  const response: { error: string; details?: unknown } = { error };
  
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
function createSupabaseClient(supabaseUrl: string, supabaseKey: string) {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'X-Client-Info': 'moneko-dashboard-templates-function'
      }
    }
  });
}

// Main function handler
Deno.serve(async (req: Request) => {
  // Always add CORS headers to all responses
  const headers = {
    ...corsHeaders,
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    // Log the request for debugging
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    
    // Validate request method
    if (req.method !== 'GET') {
      return createErrorResponse(
        405, 
        'Method not allowed', 
        `Method ${req.method} not allowed for this endpoint`,
        { ...headers, 'Allow': 'GET, OPTIONS' }
      );
    }

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse(401, 'No authorization header provided', null, headers);
    }

    // Get the JWT token from the authorization header
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return createErrorResponse(401, 'Invalid token format', null, headers);
    }

    // Validate environment variables
    const { supabaseUrl, supabaseKey } = validateEnv();
    
    // Create a Supabase client with the service role key
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

    // Get the user from the JWT token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return createErrorResponse(401, 'Invalid or expired token', userError, headers);
    }

    // Get the request URL
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    // Route handling based on path
    if (path === "all" || !path || path === "dashboard-templates") {
      // Get all templates
      return getAvailableTemplates(headers);
    } else {
      // Get a specific template by ID
      return getTemplateDetails(path, headers);
    }
  } catch (error) {
    console.error('Unhandled error in dashboard-templates function:', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
});

// Function to get all available templates
function getAvailableTemplates(headers: Record<string, string>) {
  try {
    const templates = getAllTemplates();
    
    return new Response(
      JSON.stringify(templates),
      {
        status: 200,
        headers
      }
    );
  } catch (error) {
    return createErrorResponse(500, 'Failed to fetch templates', error, headers);
  }
}

// Function to get a specific template by ID
function getTemplateDetails(templateId: string, headers: Record<string, string>) {
  try {
    const template = getTemplateById(templateId);

    if (!template) {
      return createErrorResponse(404, 'Template not found', null, headers);
    }

    return new Response(
      JSON.stringify({ 
        template: template.info,
        widgets: template.widgets 
      }),
      {
        status: 200,
        headers
      }
    );
  } catch (error) {
    return createErrorResponse(500, 'Failed to fetch template details', error, headers);
  }
}
