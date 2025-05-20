import { SupabaseClient } from '@supabase/supabase-js';

// Define types for our conversation data
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
  model: string;
  system_prompt?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  messages?: Message[];
}

/**
 * Get all conversations for a user
 */
export const getConversations = async (supabase: SupabaseClient): Promise<Conversation[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('chat_sessions', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
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
    // Get the conversation
    const { data: conversation, error: conversationError } = await supabase.functions.invoke('chat_sessions', {
      method: 'GET',
      path: `/${id}`,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (conversationError) throw conversationError;

    // Get the messages for this conversation
    console.log('Fetching messages for conversation:', id);
    const { data: messages, error: messagesError } = await supabase.functions.invoke(
      `chat_messages/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      throw messagesError;
    }

    // Combine conversation with messages
    return {
      ...conversation,
      messages: messages || []
    };
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
  initialMessages: Message[] = []
): Promise<Conversation> => {
  try {
    const { data, error } = await supabase.functions.invoke('chat_sessions', {
      method: 'POST',
      body: {
        session_id: sessionId,
        messages: initialMessages
      },
      headers: {
        'Content-Type': 'application/json'
      }
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
    
    // Log the parameters for debugging
    console.log('Adding message with chatSessionId:', message.chat_session_id);
// Ensure there are no references to conversationId below this point.
    console.log('Message content:', message.content);
    console.log('Message role:', message.role);
    
    // Prepare the request body
    // Convert timestamp to ISO string for Postgres timestamptz compatibility
    const requestBody = {
      ...message,
      timestamp: new Date(message.timestamp).toISOString()
    };


    // Remove any lingering references to conversationId. All logic should use chatSessionId only.
    
    // Debug logging
    console.log('=== DEBUG: Sending message ===');
    console.log('Chat Session ID:', message.chat_session_id);
    
    // Get the session token
    const session = (await supabase.auth.getSession()).data.session;
    const token = session?.access_token;
    console.log('Auth Token Present:', !!token);
    
    // Log the headers that will be sent
    const headers = {
      'Authorization': `Bearer ${token}`
    };

    console.log('Headers:', headers);
    
    try {
      console.log('Sending request to chat_messages function with body:', JSON.stringify(requestBody, null, 2));
      
      const { data, error } = await supabase.functions.invoke('chat_messages', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: headers
      });
      
      console.log('Response received:', { data, error });
      
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
