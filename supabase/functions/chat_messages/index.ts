import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";

console.log(`Function "chat_messages" up and running!`);

// Define types for our data
interface Message {
  id?: string;
  conversation_id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
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
    const conversationId = path[1]; // /chat_messages/:conversation_id

    // Handle different HTTP methods
    switch (method) {
      case 'GET':
        // Get all messages for a conversation
        if (!conversationId) {
          return createErrorResponse(400, 'Conversation ID is required');
        }

        try {
          // Verify the user owns this conversation
          const { data: conversation, error: conversationError } = await supabase
            .from('chat_sessions')
            .select('*')
            .eq('id', conversationId)
            .eq('user_id', user.id)
            .single();

          if (conversationError || !conversation) {
            return createErrorResponse(404, 'Conversation not found or access denied');
          }

          // Get the messages for this conversation
          const { data: messages, error: messagesError } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('timestamp', { ascending: true });

          if (messagesError) {
            return createErrorResponse(500, 'Failed to fetch messages', messagesError);
          }

          return new Response(JSON.stringify(messages), {
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
        
        // Add a message to a conversation
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
        
        // Extract fields from request data with defaults
        const { 
          conversation_id, 
          content, 
          role, 
          timestamp = new Date().toISOString(), 
          metadata = {} 
        } = requestData;

        // Check for required fields
        if (!conversation_id) {
          return createErrorResponse(400, 'Missing required field: conversation_id');
        }
        
        if (!content) {
          return createErrorResponse(400, 'Missing required field: content');
        }
        
        if (!role) {
          return createErrorResponse(400, 'Missing required field: role');
        }

        // Verify the user owns this conversation
        const { data: conversationToAddTo, error: verifyError } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('id', conversation_id)
          .eq('user_id', user.id)
          .single();

        if (verifyError || !conversationToAddTo) {
          return createErrorResponse(404, 'Conversation not found or access denied');
        }

        // Add the message
        const { data: newMessage, error: addError } = await supabase
          .from('chat_messages')
          .insert({
            conversation_id,
            content,
            role,
            timestamp: timestamp || new Date().toISOString(),
            metadata: metadata || null
          })
          .select()
          .single();

        if (addError) {
          return createErrorResponse(500, 'Failed to add message', addError);
        }

        // Update the conversation's updated_at timestamp
        const { error: updateError } = await supabase
          .from('chat_sessions')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversation_id);

        if (updateError) {
          console.error('Error updating conversation timestamp:', updateError);
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
