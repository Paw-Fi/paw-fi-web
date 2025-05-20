import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";

console.log(`Function "chat_messages" up and running!`);

// Define types for our data
interface Message {
  id?: string;
  chat_session_id: string;
  content: string;
  role: 'user' | 'assistant';
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

interface ErrorResponse {
  error: string;
  message?: string;
  details?: unknown;
}

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
function createSupabaseClient(supabaseUrl: string, supabaseKey: string) {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'X-Client-Info': 'paw-fi-chat-messages-function'
      }
    }
  });
}

// Main function handler
Deno.serve(async (req: Request) => {
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { 
        headers: { ...corsHeaders }
      });
    }

    // Add CORS headers to all responses
    const headers = {
      ...corsHeaders,
      'Content-Type': 'application/json'
    };
    
    // Log the request for debugging
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    
    // Validate request method
    if (req.method !== 'GET' && req.method !== 'POST') {
      return createErrorResponse(
        405, 
        'Method not allowed', 
        `Method ${req.method} not allowed for this endpoint`,
        { ...headers, 'Allow': 'GET, POST, OPTIONS' }
      );
    }

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse(401, 'No authorization header provided');
    }

    // Get the JWT token from the authorization header
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return createErrorResponse(401, 'Invalid token format');
    }

    // Validate environment variables
    const { supabaseUrl, supabaseKey } = validateEnv();
    
    // Create a Supabase client with the service role key
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

    // Get the user from the JWT token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return createErrorResponse(401, 'Invalid or expired token', userError);
    }

    // Get the request method and URL
    const { method } = req;
    const url = new URL(req.url);
    const path = url.pathname.split('/').filter(Boolean);
    const chatSessionId = path[1]; // /chat_messages/:chat_session_id

    // Handle different HTTP methods
    switch (method) {
      case 'GET':
        // Get all messages for a chat_session_id
        if (!chatSessionId) {
          return createErrorResponse(400, 'Chat session ID is required');
        }

        try {
          // Verify the user owns this chat_session_id
          const { data: chat_session_id, error: chat_session_idError } = await supabase
            .from('chat_sessions')
            .select('*')
            .eq('id', chatSessionId)
            .eq('user_id', user.id)
            .single();

          if (chat_session_idError || !chat_session_id) {
            return createErrorResponse(404, 'Conversation not found or access denied');
          }

          // Get the messages for this chat_session_id
          const { data: messages, error: messagesError } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('chat_session_id', chatSessionId)
            .order('timestamp', { ascending: true });

          if (messagesError) {
            return createErrorResponse(500, 'Failed to fetch messages', messagesError);
          }

          // Always return an array (empty if no messages)
          return new Response(JSON.stringify(messages ?? []), {
            status: 200,
            headers
          });
        } catch (error) {
          console.error('Error in GET /chat_messages:', error);
          return createErrorResponse(500, 'Internal server error', error);
        }

    case 'POST':
      try {
        // Log incoming request
        console.log('=== INCOMING REQUEST ===');
        console.log('Method:', req.method);
        console.log('URL:', req.url);
        console.log('Headers:', Object.fromEntries(req.headers.entries()));
        
        // Add a message to a chat_session_id
        let requestData;
        let rawBody: string = '';
        try {
          rawBody = await req.text();
          console.log('Raw request body:', rawBody);
          
          if (!rawBody || rawBody.trim() === '') {
            console.log('Empty request body, using empty object');
            requestData = {};
          } else {
            requestData = JSON.parse(rawBody);
            console.log('Parsed request data:', JSON.stringify(requestData, null, 2));
          }
        } catch (error) {
          console.error('Error parsing JSON:', error);
          console.error('Raw body that failed to parse:', rawBody);
          return createErrorResponse(400, 'Invalid JSON in request body', { rawBody });
        }
        
        // Extra debug logging for requestData and extracted fields
        console.log('=== DEBUG: requestData ===', JSON.stringify(requestData, null, 2));
        // Log all keys in requestData
        console.log('Keys in requestData:', Object.keys(requestData));
        // Log all values in requestData
        Object.entries(requestData).forEach(([k, v]) => console.log(`requestData[${k}] =`, v));

        // Extract fields from request data with defaults
        const { 
          chat_session_id, 
          content, 
          role, 
          metadata = {},
          timestamp
        } = requestData;
        // Log extracted fields
        console.log('Extracted chat_session_id:', chat_session_id);
        console.log('Extracted content:', content);
        console.log('Extracted role:', role);
        console.log('Extracted metadata:', metadata);

        // Check for required fields
        if (!chat_session_id) {
          return createErrorResponse(400, 'Missing required field: chat_session_id');
        }
        
        if (!content) {
          return createErrorResponse(400, 'Missing required field: content');
        }
        
        if (!role) {
          return createErrorResponse(400, 'Missing required field: role');
        }

        // Verify the user owns this chat_session_id
        const { data: chat_session_idToAddTo, error: verifyError } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('id', chat_session_id)
          .eq('user_id', user.id)
          .single();

        if (verifyError || !chat_session_idToAddTo) {
          return createErrorResponse(404, 'Conversation not found or access denied');
        }

        // Add the message
        const { data: newMessage, error: addError } = await supabase
          .from('chat_messages')
          .insert({
            chat_session_id,
            content,
            role,
            timestamp,
            metadata: metadata || null
          })
          .select()
          .single();

        if (addError) {
          return createErrorResponse(500, 'Failed to add message', addError);
        }

        // Update the chat_session_id's updated_at timestamp
        const { error: updateError } = await supabase
          .from('chat_sessions')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', chat_session_id);

        if (updateError) {
          console.error('Error updating chat_session_id timestamp:', updateError);
        }

        return new Response(JSON.stringify(newMessage), {
          status: 201,
          headers
        });
      } catch (error) {
        console.error('Error in POST /chat_messages:', error);
        return createErrorResponse(500, 'Internal server error', error);
      }

    default:
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers
      });
  }
  } catch (error) {
    console.error('Unhandled error in chat_messages function:', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
});
