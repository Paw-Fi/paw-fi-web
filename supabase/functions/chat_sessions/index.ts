// @deno-types="https://esm.sh/v135/@supabase/supabase-js@2.39.7/dist/module/index.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../shared/cors.ts";

console.log(`Function "chat_sessions" up and running!`);

// Define types for our conversation data
interface Message {
  id?: string;
  conversation_id?: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, unknown>;
}

interface ChatSession {
  id: string;
  user_id: string;
  session_id: string;
  model: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  messages?: Message[];
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
        'X-Client-Info': 'moneko-chat-sessions-function'
      }
    }
  });
}

// Helper function to validate request body
async function parseRequestBody<T>(req: Request): Promise<{ data: T | null; error: Response | null }> {
  try {
    const text = await req.text();
    if (!text || text.trim() === '') {
      return { data: {} as T, error: null };
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

// Handle GET /chat_sessions or GET /chat_sessions/:id
async function handleGetSessions(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string | undefined,
  headers: Record<string, string>
): Promise<Response> {
  try {
    if (sessionId) {
      // Get a specific chat session
      const { data: chatSession, error: chatSessionError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single();

      if (chatSessionError) {
        return createErrorResponse(404, 'Chat session not found', chatSessionError);
      }

      // Get the messages for this chat session
      const { data: messages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', sessionId)
        .order('timestamp', { ascending: true });

      if (messagesError) {
        return createErrorResponse(500, 'Failed to fetch messages', messagesError);
      }

      // Combine chat session with messages
      return new Response(
        JSON.stringify({
          ...chatSession,
          messages: messages || []
        }),
        { status: 200, headers }
      );
    }

    // Get all chat sessions for the user
    const { data: chatSessions, error: chatSessionsError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (chatSessionsError) {
      return createErrorResponse(500, 'Failed to fetch chat sessions', chatSessionsError);
    }

    return new Response(
      JSON.stringify(chatSessions || []),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Error in handleGetSessions:', error);
    return createErrorResponse(500, 'Failed to get chat session', error instanceof Error ? error.message : 'Unknown error');
  }
}

// Handle POST /chat_sessions
async function handleCreateSession(
  supabase: SupabaseClient,
  userId: string,
  req: Request,
  headers: Record<string, string>
): Promise<Response> {
  try {
    // Parse the request body
    const { data: requestData, error: parseError } = await parseRequestBody<{
      session_id?: string;
      model?: string;
      title?: string;
      messages?: Message[];
    }>(req);

    if (parseError) {
      return parseError;
    }

    // Generate a default session_id if one isn't provided
    const sessionId = requestData?.session_id || crypto.randomUUID();
    const model = requestData?.model || 'gemini-pro';
    const now = new Date().toISOString();

    // Create the chat session
    const { data: newChatSession, error: sessionInsertError } = await supabase
      .from('chat_sessions')
      .insert([
        {
          user_id: userId,
          session_id: sessionId,
          model,
          is_active: true,
          created_at: now,
          updated_at: now
        }
      ])
      .select()
      .single();

    if (sessionInsertError) {
      return createErrorResponse(500, 'Failed to create chat session', sessionInsertError);
    }

    // Insert messages into the chat session
    if (requestData?.messages) {
      const messagesToInsert = requestData.messages.map((msg: Message) => ({
        conversation_id: newChatSession.id,
        content: msg.content,
        role: msg.role,
        timestamp: msg.timestamp || Date.now()
      }));

      const { error: messagesError } = await supabase
        .from('chat_messages')
        .insert(messagesToInsert);

      if (messagesError) {
        return createErrorResponse(500, 'Failed to insert messages', messagesError);
      }
    }

    return new Response(
      JSON.stringify(newChatSession),
      { status: 201, headers }
    );
  } catch (error) {
    console.error('Error in handleCreateSession:', error);
    return createErrorResponse(500, 'Failed to create chat session', error instanceof Error ? error.message : 'Unknown error');
  }
}

// Handle PUT /chat_sessions/:id
async function handleUpdateSession(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  req: Request,
  headers: Record<string, string>
): Promise<Response> {
  try {
    // Verify the session exists and belongs to the user
    const { data: existingSession, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (sessionError || !existingSession) {
      return createErrorResponse(404, 'Chat session not found or access denied');
    }

    // Parse the request body
    const { data: requestData, error: parseError } = await parseRequestBody<{
      title?: string;
      is_active?: boolean;
      metadata?: Record<string, unknown>;
      messages?: Message[];
    }>(req);

    if (parseError || !requestData) {
      return parseError || createErrorResponse(400, 'Invalid request body');
    }

    // Update the chat session
    const { data: updatedSession, error: updateError } = await supabase
      .from('chat_sessions')
      .update({
        ...requestData,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) {
      return createErrorResponse(500, 'Failed to update chat session', updateError);
    }

    // Insert messages into the chat session if provided
    if (requestData.messages && requestData.messages.length > 0) {
      const messagesToInsert = requestData.messages.map((msg: Message) => ({
        conversation_id: sessionId,
        content: msg.content,
        role: msg.role,
        timestamp: msg.timestamp || Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error: messagesError } = await supabase
        .from('chat_messages')
        .insert(messagesToInsert);

      if (messagesError) {
        return createErrorResponse(500, 'Failed to insert messages', messagesError);
      }
    }

    return new Response(
      JSON.stringify(updatedSession),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Error in handleUpdateSession:', error);
    return createErrorResponse(500, 'Failed to update chat session', error instanceof Error ? error.message : 'Unknown error');
  }
}

// Handle DELETE /chat_sessions/:id
async function handleDeleteSession(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  headers: Record<string, string>
): Promise<Response> {
  try {
    // Check if the session exists and belongs to the user
    const { data: existingSession, error: fetchError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingSession) {
      return createErrorResponse(404, 'Chat session not found');
    }

    // First, delete all messages in the session
    const { error: deleteMessagesError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('conversation_id', sessionId);

    if (deleteMessagesError) {
      console.error('Error deleting messages:', deleteMessagesError);
      // Continue with session deletion even if message deletion fails
    }

    // Delete the chat session
    const { error: deleteError } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId);

    if (deleteError) {
      return createErrorResponse(500, 'Failed to delete chat session', deleteError);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Error in handleDeleteSession:', error);
    return createErrorResponse(500, 'Failed to delete chat session', error instanceof Error ? error.message : 'Unknown error');
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

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse(401, 'Authorization header is required');
    }

    // Get the token from the header
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return createErrorResponse(401, 'Invalid token format');
    }

    // Verify the token and get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return createErrorResponse(401, 'Invalid or expired token', userError);
    }

    const userId = user.id;
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const sessionId = pathParts.length > 1 ? pathParts[1] : undefined;

    // Set common headers
    const headers = {
      ...corsHeaders,
      'Content-Type': 'application/json',
    };

    // Route the request based on HTTP method and path
    switch (req.method) {
      case 'GET':
        return handleGetSessions(supabase, userId, sessionId, headers);
      case 'POST':
        return handleCreateSession(supabase, userId, req, headers);
      case 'PUT':
        if (!sessionId) {
          return createErrorResponse(400, 'Session ID is required for updates');
        }
        return handleUpdateSession(supabase, userId, sessionId, req, headers);
      case 'DELETE':
        if (!sessionId) {
          return createErrorResponse(400, 'Session ID is required for deletion');
        }
        return handleDeleteSession(supabase, userId, sessionId, headers);
      default:
        return createErrorResponse(405, `Method ${req.method} not allowed`, null, {
          ...corsHeaders,
          'Allow': 'GET, POST, PUT, DELETE, OPTIONS'
        });
    }
  } catch (error) {
    console.error('Unhandled error in chat_sessions function:', error);
    return createErrorResponse(
      500,
      'Internal server error',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});
