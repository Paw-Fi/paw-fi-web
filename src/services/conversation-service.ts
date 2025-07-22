import { AI_ROLE } from '@/components/chat/ai-roles';
import { supabase } from '@/lib/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
// Define types for our conversation data
export interface AIResponse {
  response: string;
  isComplete: boolean;
  generatedLessons?: any;
  messageId?: string;
  conversationId?: string;
}

export interface Message {
  id?: string;
  chat_session_id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
  created_at?: string;
  metadata?: Record<string, any>;
}

export interface Conversation {
  id: string;
  user_id: string;
  session_id: string;
  model: AI_ROLE;
  system_prompt?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  messages?: Message[];
}

/**
 * Get all conversations for a user
 */
// --- HOOKS ---

export async function fetchConversations(supabase: SupabaseClient) {
  return getConversations(supabase);
}

export async function fetchConversation(supabase: SupabaseClient, id: string | undefined) {
  if (!id) return null;
  return getConversation(supabase, id);
}

export async function createNewConversation(supabase: SupabaseClient, params: { userId: string; sessionId: string; initialMessages?: Message[]; model?: string }) {
  return createConversation(supabase, params.userId, params.sessionId, params.initialMessages || [], params.model as AI_ROLE);
}

export async function updateConversationData(supabase: SupabaseClient, params: { conversationId: string; updates: Partial<Conversation> }) {
  return updateConversation(supabase, params.conversationId, params.updates);
}

export async function addMessageToConversation(supabase: SupabaseClient, message: Message) {
  return addMessage(supabase, message);
}

export async function deleteConversationById(supabase: SupabaseClient, conversationId: string) {
  return deleteConversation(supabase, conversationId);
}

// --- RAW ASYNC FUNCTIONS (for use in hooks only) ---

export const getConversations = async (supabase: SupabaseClient): Promise<Conversation[]> => {
  try {
    // Use chat_sessions Edge Function with explicit GET method and model parameter
    const { data, error } = await supabase.functions.invoke('chat_sessions?model=financial_educator', {
      method: 'GET'
    });

    if (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getConversations:', error);
    return [];
  }
};

/**
 * Get a specific conversation by ID
 */
export const getConversation = async (supabase: SupabaseClient, id: string): Promise<Conversation> => {
  try {
    // Use chat_sessions Edge Function to get specific conversation with messages
    // The sessionId should be in the URL path, not the body
    const { data, error } = await supabase.functions.invoke(`chat_sessions/${id}`, {
      method: 'GET'
    });

    if (error) {
      console.error('Error fetching conversation:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching conversation:', error);
    throw error;
  }
};

/**
 * Create a new conversation
 */
export const createConversation = async (
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  initialMessages: Message[] = [],
  model: AI_ROLE
): Promise<Conversation> => {
  try {
    // Get the session token for authorization
    const session = (await supabase.auth.getSession()).data.session;
    const token = session?.access_token;

    if (!token) {
      throw new Error('No authentication token available');
    }

    const requestBody = {
      session_id: sessionId,
      messages: initialMessages,
      model: model
    };
    const { data, error } = await supabase.functions.invoke('chat_sessions', {
      body: requestBody
    });
    
    if (error) {
      console.error('Error creating conversation:', error);
      throw new Error(`Failed to create conversation: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in createConversation:', error);
    throw error;
  }
};

/**
 * Update an existing conversation
 */
export const updateConversation = async (
  supabase: SupabaseClient,
  conversationId: string,
  updates: Partial<Conversation>
): Promise<Conversation | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('chat_sessions', {
      body: { ...updates, id: conversationId },
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (error) {
      console.error('Error updating conversation:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in updateConversation:', error);
    return null;
  }
};

/**
 * Add a message to a conversation
 */
export const addMessage = async (
  supabase: SupabaseClient,
  message: Message
): Promise<Message | null> => {
  try {
    // Validate chat_session_id
    if (!message.chat_session_id) {
      console.error('Cannot add message: chat_session_id is null or undefined');
      return null;
    }
    
    // Validate message content and role
    if (!message.content) {
      console.error('Cannot add message: message content is missing');
      return null;
    }
    
    if (!message.role) {
      console.error('Cannot add message: message role is missing');
      return null;
    }
    
    // Convert timestamp to ISO string for Postgres timestamptz compatibility
    const requestBody = {
      ...message,
      timestamp: new Date(message.timestamp).toISOString()
    };

    // Get the session token for authorization
    const session = (await supabase.auth.getSession()).data.session;
    const token = session?.access_token;
    
    // Set up headers with authorization token
    const headers = {
      'Authorization': `Bearer ${token}`
    };
    
    try {
      const { data, error } = await supabase.functions.invoke('chat_messages', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: headers
      });
      
      
      if (error) {
        console.error('Error response from server:', error);
        return null;
      }
      
      return data as Message;
    } catch (error) {
      console.error('Exception in supabase.functions.invoke:', error);
      return null;
    }
  } catch (error) {
    console.error('Error in addMessage:', error);
    return null;
  }
};

/**
 * Simplified guest/auth chat function - sends message with session/conversation info
 * Backend handles all context, persistence, and session management
 */
export async function sendChatMessage(
  supabase: SupabaseClient,
  message: string,
  options: {
    conversationId?: string | null;
    userId?: string | null;
    sessionId?: string | null;
    model: string;
    profile?: any;
  }
): Promise<AIResponse> {
  try {
    if (!message || message.trim() === '') {
      return {
        response: "I'm sorry, I didn't receive your message. Please try again.",
        isComplete: true
      };
    }
    const requestBody = { 
      message,
      conversationId: options.conversationId,
      userId: options.userId,
      sessionId: options.sessionId,
      model: options.model,
      userProfile: options.profile
    };
    
    // Let Supabase handle method, headers, and JSON serialization automatically
    const { data, error } = await supabase.functions.invoke('chat_stream', {
      body: requestBody
    });
    
    if (error) throw error;
    
    return {
      response: data.response || data.content,
      isComplete: true,
      messageId: data.messageId,
      conversationId: data.conversationId // For guest sessions, backend returns new session ID
    };
  } catch (error: any) {
    return {
      response: error.message || "An error occurred while processing your message. Please try again.",
      isComplete: false,
    };
  }
}

/**
 * Update guest session with user ID on login
 */
export async function updateGuestSession(
  sessionId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const requestBody = { sessionId, userId };
    
    // Let Supabase handle authorization automatically
    const { data, error } = await supabase.functions.invoke('update_guest_session', {
      body: requestBody
    });
    
    if (error) throw error;
    
    return { success: true };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || "Failed to update guest session" 
    };
  }
}

/**
 * Optimized AI chat function - only sends new user message, backend handles context and DB updates
 */
export async function sendMessageOptimized(
  supabase: SupabaseClient,
  conversationId: string,
  userMessage: string,
  userId?: string,
  userProfile?: string
): Promise<AIResponse> {
  try {
    // Get the session token for authorization if user is authenticated
    const session = (await supabase.auth.getSession()).data.session;
    const token = session?.access_token;

    if (!userMessage || userMessage.trim() === '') {
      return {
        response: "I'm sorry, I didn't receive your message. Please try again.",
        isComplete: true
      };
    }

    if (!conversationId) {
      return {
        response: "Error: Missing conversation ID. Please refresh and try again.",
        isComplete: true
      };
    }
    
    const requestBody = { 
      conversationId, 
      userMessage, 
      userId, 
      userProfile 
    };
    
    // Set up headers with authorization token
    const headers: Record<string, string> = {};
    
    // Add authorization header if we have a token (for authenticated users)
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const { data, error } = await supabase.functions.invoke('chat_optimized', {
      body: requestBody,
      headers: Object.keys(headers).length > 0 ? headers : undefined
    });
    
    if (error) throw error;
    
    return {
      response: data.response,
      isComplete: true,
      messageId: data.messageId
    };
  } catch (error: any) {
    return {
      response: error.message || "An error occurred while processing your message. Please try again.",
      isComplete: false,
    };
  }
}

/**
 * Delete a conversation
 */
export const deleteConversation = async (supabase: SupabaseClient, conversationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase.functions.invoke('chat_sessions', {
      method: 'DELETE',
      body: { id: conversationId }
    });

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return false;
  }
};

/**
 * Get suggested responses based on conversation history
 */
export async function getPredictedResponses(
  supabase: SupabaseClient,
  message: string,
  history: any[]
): Promise<string[]> {
  try {
    const { data, error } = await supabase.functions.invoke('predict-user-responses', {
      method: 'POST',
      body: { message, history }
    });
    
    if (error) {
      return [];
    }
    
    // Return the array of suggested responses or an empty array if no data
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}
