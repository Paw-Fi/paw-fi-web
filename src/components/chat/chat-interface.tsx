"use client";

import { useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { useAuth } from "@/contexts/auth-context";
import { getAIResponseFromEdge } from '@/services/conversation-service';
import { supabase } from '@/lib/supabase';
// Import conversation service functions
import { getConversations, getConversation, createConversation, addMessage, deleteConversation } from '@/services/conversation-service';

interface Message {
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
  chat_session_id: string;
  metadata?: Record<string, any>;
}

interface ChatInterfaceProps {
  onCompleteSurvey: (generatedLessons: any) => void;
  onGeneratingStateChange?: (isGenerating: boolean, progress: number) => void;
}

export function ChatInterface({ onCompleteSurvey, onGeneratingStateChange }: ChatInterfaceProps) {
  // Get authentication state
  const { user } = useAuth();
  const isAuthenticated = !!user;

  // State for chat messages
  const [messages, setMessages] = useState<Message[]>([]);
  // Track when messages are loaded from the backend
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Thinking...");
  
  // State for conversation management
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Array<{id: string, session_id: string}>>([]);
  
  // Refs for DOM elements
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatSessionRef = useRef<any>(null);
  
  // Different welcome messages based on authentication state
  const authenticatedMessage = "Hi I'm Paw-FI! I'll help you learn about personal finance. Type 'start' to begin.";
  const unauthenticatedMessage = "Hi I'm Paw-FI! Sign in to start learning about personal finance with me.";
  
  // Choose the appropriate welcome message
  const welcomeMessage = isAuthenticated ? authenticatedMessage : unauthenticatedMessage;

  // Auto-add welcome message to current conversation if needed
  useEffect(() => {
    if (isAuthenticated && currentConversationId && messagesLoaded && messages.length === 0) {
      const welcomeMsg: Message = {
        content: authenticatedMessage,
        role: 'assistant',
        timestamp: Date.now(),
        chat_session_id: currentConversationId
      };
      saveMessageToConversation(welcomeMsg).then(() => {
        setMessages([welcomeMsg]);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, currentConversationId, messagesLoaded, messages.length]);



  // Load user's conversations when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Load conversations and automatically select the first one
      loadUserConversations();
    } else if (messages.length === 0) {
      // If not authenticated, just show the welcome message
      setMessages([{
        content: welcomeMessage,
        role: "assistant",
        timestamp: Date.now(),
      }]);
      setMessagesLoaded(true);
    }
  }, [isAuthenticated, welcomeMessage, messages.length]);
  
  // Load conversation messages when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      setMessagesLoaded(false); // Reset before loading
      // Save the current conversation ID to localStorage
      localStorage.setItem('paw-fi-current-conversation', currentConversationId);
      loadConversation(currentConversationId);
    }
  }, [currentConversationId]);

  // Auto-scroll to the bottom of the chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Function to check if a string might be JSON and if it's complete
  const checkJsonString = (str: unknown): { isJson: boolean, isComplete: boolean } => {
    if (typeof str !== 'string') return { isJson: false, isComplete: true };
    try {
      JSON.parse(str);
      return { isJson: true, isComplete: true };
    } catch (e) {
      // If it fails to parse, it might be incomplete JSON
      return { isJson: true, isComplete: false };
    }
  };

  const loadUserConversations = async () => {
    try {
      const userConversations = await getConversations(supabase);
      setConversations(userConversations);

      // Store the conversation IDs in localStorage for quick access on page reload
      if (userConversations.length > 0) {
        localStorage.setItem('paw-fi-conversations', JSON.stringify(userConversations.map((c: any) => ({
          id: c.id,
          session_id: c.session_id
        }))));
        
        // Always use the first conversation
        const firstConversation = userConversations[0];
        console.log('Setting current conversation to first conversation:', firstConversation.id);
        setCurrentConversationId(firstConversation.id);
      } else {
        // If no conversations exist, create a new one
        console.log('No conversations found, creating a new one...');
        if (user?.id) {
          await createNewConversation(user.id);
        }
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  // Load a specific conversation
  const loadConversation = async (conversationId: string) => {
    try {
      const conversation = await getConversation(supabase, conversationId);
      if (conversation && conversation.messages) {
        setMessages(conversation.messages);
      } else {
        setMessages([]);
      }
      setMessagesLoaded(true);
    } catch (error) {
      console.error('Error loading conversation:', error);
      setMessages([]);
      setMessagesLoaded(true);
    }
  };

  // Create a new conversation
  const createNewConversation = async (userId: string) => {
    try {
      // 1. Create the chat session
      const newConversation = await createConversation(
        supabase,
        userId,
        `Conversation ${conversations.length + 1}`
      );

      // 2. Add the welcome message as the first message in chat_messages
      const initialMessage: Message = {
        content: welcomeMessage,
        role: 'assistant',
        timestamp: Date.now(),
        chat_session_id: newConversation.id
      };
      await addMessage(supabase, initialMessage);

      setCurrentConversationId(newConversation.id);
      setMessages([initialMessage]);

      // Refresh the conversations list
      loadUserConversations();
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  // Save message to current conversation
  const saveMessageToConversation = async (message: Message) => {
    try {
      if (!currentConversationId) {
        console.error('Cannot save message: No conversation ID found');
        throw new Error('No conversation ID found');
      }
      
      if (!isAuthenticated) {
        console.error('Cannot save message: User not authenticated');
        throw new Error('User not authenticated');
      }
      
      console.log('Saving message to conversation:', currentConversationId);
      // Ensure chat_session_id is present
    const messageWithSessionId = {
      ...message,
      chat_session_id: currentConversationId
    };
    const savedMessage = await addMessage(supabase, messageWithSessionId);
      
      if (!savedMessage) {
        throw new Error('Failed to save message to server');
      }
      
      // Also save to conversation-specific localStorage for offline access
      const updatedMessages = [...messages, message];
      localStorage.setItem(`paw-fi-messages-${currentConversationId}`, JSON.stringify(updatedMessages));
      
      return savedMessage;
    } catch (error) {
      console.error('Error saving message:', error);
      
      // Fallback to localStorage if we have a conversation ID
      if (currentConversationId) {
        const updatedMessages = [...messages, message];
        localStorage.setItem(`paw-fi-messages-${currentConversationId}`, JSON.stringify(updatedMessages));
        console.warn('Message saved to localStorage as fallback');
      }
      
      throw error; // Re-throw the error to be handled by the caller
    }
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSendMessage = async (content: string) => {
    console.log('Sending message:', content)
    if (!content.trim() || isLoading) return;
    
    // Create the user message object
    const userMessage: Message = {
      content,
      role: 'user',
      timestamp: Date.now(),
      chat_session_id: currentConversationId!
    };

    try {
      setIsLoading(true);
      setCurrentMessage('');

      // Add the user message to the UI immediately
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);

      // Ensure we have a valid conversation ID
      let conversationId = currentConversationId;
      
      // If no conversation exists, create one
      if (!conversationId) {
        if (!user?.id) {
          throw new Error('User must be authenticated to start a conversation');
        }
        
        console.log('No conversation ID found, creating a new conversation...');
        const newConversation = await createConversation(
          supabase,
          user.id,
          `Conversation ${conversations.length + 1}`
        );

        console.log('New conversation created:', newConversation.id);
        setCurrentConversationId(newConversation.id);
        conversationId = newConversation.id;
        
        // Update the message's chat_session_id to the new conversation's id
        const userMessageWithSession: Message = { ...userMessage, chat_session_id: newConversation.id };
        await addMessage(supabase, userMessageWithSession);
        
        // Refresh conversations list
        await loadUserConversations();
        
        // Load the new conversation
        await loadConversation(conversationId);
      } else {
        // Add the message to the existing conversation
        console.log('Adding message to existing conversation:', conversationId);
        await saveMessageToConversation(userMessage);
      }

      // Get AI response
      try {
        // Remove all leading non-user messages
        let filteredMessages = updatedMessages;
        while (
          filteredMessages.length > 0 &&
          filteredMessages[0].role !== 'user'
        ) {
          filteredMessages = filteredMessages.slice(1);
        }
        // Log the filtered history for debugging
        console.log('Filtered chat history sent to Gemini:', filteredMessages);
        // If there are no user messages, abort and show error
        if (filteredMessages.length === 0 || filteredMessages[0].role !== 'user') {
          setMessages(prev => [
            ...prev,
            {
              content: 'Please type a message to start the conversation.',
              role: 'assistant',
              timestamp: Date.now(),
              chat_session_id: currentConversationId!,
              metadata: { isError: true }
            }
          ]);
          setIsLoading(false);
          return;
        }
        // Format for Gemini (convert 'assistant' role to 'model')
        const geminiHistory = filteredMessages.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : msg.role,
          parts: [{ text: msg.content }]
        }));
        const aiResponse = await getAIResponseFromEdge(supabase, content, geminiHistory);
        
        if (!aiResponse) {
          throw new Error('No response from AI');
        }
        
        // Ensure we have a string content
        const responseContent = typeof aiResponse === 'string'
          ? aiResponse
          : aiResponse.response || aiResponse.content || 'No response content';
        
        // Add the AI response to the UI
        const assistantMessage: Message = {
          content: responseContent,
          role: 'assistant',
          timestamp: Date.now(),
          chat_session_id: currentConversationId!
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        
        // Save the assistant's response to the conversation
        if (currentConversationId) {
          console.log('Saving assistant response to conversation:', currentConversationId);
          await saveMessageToConversation(assistantMessage);
        } else {
          console.warn('No conversation ID available to save assistant response');
        }
      } catch (error) {
        console.error('Error getting AI response:', error);
        
        // Show error message to the user
        const errorMessage: Message = {
          content: 'Sorry, I encountered an error while processing your request. Please try again.',
          role: 'assistant',
          timestamp: Date.now(),
          metadata: { isError: true },
          chat_session_id: currentConversationId!
        };
        
        setMessages(prev => [...prev, errorMessage]);
        
        // Save the error message to the conversation if we have a conversation ID
        if (currentConversationId) {
          try {
            await saveMessageToConversation(errorMessage);
          } catch (saveError) {
            console.error('Failed to save error message to conversation:', saveError);
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update the conversation in the backend
  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await deleteConversation(supabase, conversationId);
      setCurrentConversationId(null);
      setMessages([]);
      loadUserConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === "user"
                    ? "bg-purple-600 text-white"
                    : "bg-white border border-gray-200 text-gray-800"
                }`}
              >
                <div className="prose prose-sm max-w-none">
                  {/* Render a Card if content contains a JSON block */}
                  {(() => {
                    // Robustly extract the first valid JSON object from the message
                    function extractFirstJson(text: string): { json: any; start: number; end: number } | null {
                      // 1. Try to extract the first ```json ... ``` code block
                      const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/i;
                      const jsonBlockMatch = text.match(jsonBlockRegex);
                      if (jsonBlockMatch && jsonBlockMatch[1]) {
                        try {
                          const code = jsonBlockMatch[1].trim();
                          const json = JSON.parse(code);
                          const idx = text.indexOf(jsonBlockMatch[0]);
                          return { json, start: idx, end: idx + jsonBlockMatch[0].length };
                        } catch (err) {
                          console.warn('Could not parse JSON from code block:', jsonBlockMatch[1].substring(0, 100), err);
                        }
                      }
                      // 2. Fallback: Try to find the first {...} that parses
                      const curlyBlockRegex = /\{[\s\S]*\}/g;
                      let match: RegExpExecArray | null;
                      while ((match = curlyBlockRegex.exec(text)) !== null) {
                        try {
                          const json = JSON.parse(match[0]);
                          return { json, start: match.index, end: match.index + match[0].length };
                        } catch (err) {
                          // Skip malformed JSON blocks
                          continue;
                        }
                      }
                      return null;
                    }
                    const found = extractFirstJson(message.content);
                    if (found) {
                      const { json, start, end } = found;
                      const intro = message.content.slice(0, start).trim();
                      const outro = message.content.slice(end).trim();
                      return <>
                        {intro && <div className="mb-2"><ReactMarkdown>{intro}</ReactMarkdown></div>}
                        <Card title={json.title || ''} description={json.description || ''} lessonCount={Array.isArray(json.lessons) ? json.lessons.length : 0} />
                        {outro && <div className="mt-2"><ReactMarkdown>{outro}</ReactMarkdown></div>}
                      </>;
                    }
                    // Fallback: just render markdown (never show JSON as plain text)
                    return <ReactMarkdown>{message.content.replace(/```json[\s\S]*?```/gi, '').replace(/```[\s\S]*?```/gi, '').replace(/\{[\s\S]*\}/g, '')}</ReactMarkdown>;
                  })()}
                </div>
                <div
                  className={`text-xs mt-1 text-right ${
                    message.role === "user" ? "text-purple-200" : "text-gray-400"
                  }`}
                >
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))}
          
          <div ref={messagesEndRef} />
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-lg p-3 max-w-[80%]">
                <div className="text-gray-500 mb-2">{loadingMessage}</div>
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      

      {/* Input area */}
      <div className="bg-white border-t border-gray-200 p-3">
        {isAuthenticated ? (
          <form onSubmit={(e) => {
            e.preventDefault();
            if (currentMessage.trim()) {
              handleSendMessage(currentMessage);
            }
          }} className="flex items-center gap-2 p-2 border-t border-gray-200">
            <input
              ref={inputRef}
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Type your message..."
              className="w-full border border-gray-300 rounded-full py-3 px-4 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent overflow-x-hidden"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (currentMessage.trim()) {
                    handleSendMessage(currentMessage);
                  }
                }
              }}
            />
          
            <Button
              type="submit"
              variant="dark"
              disabled={!currentMessage.trim() || isLoading}
              className="ml-2 p-3 rounded-full h-12 w-12 flex items-center justify-center bg-purple-600 hover:bg-purple-700 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </Button>
          </form>
        ) : (
          <div className="flex flex-col items-center space-y-3 py-2">
            <p className="text-gray-500 text-sm">Sign in to chat with Paw-Fi</p>
            <div className="flex space-x-3">
              <Link
                to="/login"
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 border border-purple-600 text-purple-600 rounded-md hover:bg-purple-50 transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
