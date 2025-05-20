"use client";

import { useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import type { Lesson } from "@/types/learning.types";
import { sendMessageToGemini, createChatSession } from "@/services/gemini-service";
import { useAuth } from "@/contexts/auth-context";
// Import conversation service functions
import { getConversations, getConversation, createConversation, addMessage, deleteConversation, updateConversation } from '@/services/conversation-service';
import { supabase } from '@/lib/supabase';

interface Message {
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
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
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Thinking...");
  
  // State for JSON continuation
  const [incompleteJson, setIncompleteJson] = useState<string | null>(null);
  const [waitingForContinuation, setWaitingForContinuation] = useState(false);
  
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

  // Initialize chat session
  useEffect(() => {
    // Create a new chat session with the Gemini API
    const aiPrompt = import.meta.env.VITE_AI_PROMPT || "Hi I'm Paw-FI! I'll help you learn about personal finance. What topics interest you most?";
    chatSessionRef.current = createChatSession(aiPrompt);
    
    return () => {
      // Clean up any resources if needed in the future
    };
  }, []);

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
    }
  }, [isAuthenticated, welcomeMessage, messages.length]);
  
  // Load conversation messages when conversation changes
  useEffect(() => {
    if (currentConversationId) {
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
  const checkJsonString = (str: string) => {
    // Check if the string looks like it might be JSON
    if (!str.trim().startsWith('{') && !str.trim().startsWith('[')) {
      return { isJson: false, isComplete: true };
    }
    
    try {
      JSON.parse(str);
      return { isJson: true, isComplete: true };
    } catch (e) {
      // If it fails to parse, it might be incomplete JSON
      return { isJson: true, isComplete: false };
    }
  };

  // Process generated lessons and store in localStorage
  const startLessonGeneration = (lessonData: any) => {
    try {
      // Notify parent component about the lesson generation
      if (onGeneratingStateChange) {
        onGeneratingStateChange(true, 0);
      }
      
      // Process the lesson data
      const lessons = Array.isArray(lessonData) ? lessonData : [lessonData];
      
      // Store the lessons in localStorage
      localStorage.setItem('paw-fi-generated-lessons', JSON.stringify(lessons));
      
      // Notify the parent component that the survey is complete
      onCompleteSurvey(lessons);
      
      // Update the UI to show generation is complete
      if (onGeneratingStateChange) {
        onGeneratingStateChange(false, 100);
      }
    } catch (error) {
      console.error('Error processing lesson data:', error);
      
      // Notify the parent component about the error
      if (onGeneratingStateChange) {
        onGeneratingStateChange(false, 0);
      }
    }
  };

  // Define the response type for the AI response
  interface AIResponse {
    content: string;
    isComplete: boolean;
    generatedLessons?: any;
  }

  // This function sends a message to the Gemini API and gets a response
  const getAIResponse = async (userMessage: string, addToChat = true): Promise<AIResponse | string> => {
    try {
      // Use the chat session to send the message and get a response
      const response = await sendMessageToGemini(chatSessionRef.current, userMessage);
      
      // Check if the response contains JSON
      const { isJson, isComplete } = checkJsonString(response);
      
      // If it's JSON and it looks like a lesson plan, process it
      if (isJson && isComplete && response.includes('"title"') && response.includes('"content"')) {
        try {
          const jsonData = JSON.parse(response);
          return {
            content: response,
            isComplete: true,
            generatedLessons: jsonData
          };
        } catch (e) {
          // If JSON parsing fails, just return the text
          console.error('Error parsing JSON response:', e);
        }
      }
      
      return {
        content: response,
        isComplete: isJson ? isComplete : true
      };
    } catch (error) {
      console.error('Error getting AI response:', error);
      return {
        content: "I'm sorry, I encountered an error. Please try again.",
        isComplete: true
      };
    }
  };

  // Load user's conversations
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
    } catch (error) {
      console.error('Error loading conversation:', error);
      setMessages([]);
    }
  };

  // Create a new conversation
  const createNewConversation = async (userId: string) => {
    try {
      const initialMessage: Message = {
        content: welcomeMessage,
        role: 'assistant',
        timestamp: Date.now()
      };
      
      const newConversation = await createConversation(
        supabase,
        userId,
        `Conversation ${conversations.length + 1}`,
        [initialMessage]
      );
      
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
      const savedMessage = await addMessage(supabase, currentConversationId, message);
      
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
  
  // Update the conversation in the backend
  const updateConversationInBackend = async () => {
    if (isAuthenticated && currentConversationId) {
      try {
        await loadUserConversations();
      } catch (error) {
        console.error('Error refreshing conversations:', error);
      }
    }
  };

  // Function to handle continuing JSON response
  const continueJsonResponse = async () => {
    if (!incompleteJson) return;
    
    setWaitingForContinuation(false);
    setIsLoading(true);
    setLoadingMessage("Getting the rest of the data...");
    
    try {
      // Get the continuation without adding the "continue" message to the chat
      const response = await sendMessageToGemini(chatSessionRef.current, "Please continue the JSON response", false);
      
      // Combine the incomplete JSON with the continuation
      const combinedJson = incompleteJson + response;
      
      // Check if the combined JSON is now complete
      const { isJson, isComplete } = checkJsonString(combinedJson);
      
      if (isJson && isComplete) {
        // If it's complete, add it to the chat
        const assistantMessage: Message = {
          content: combinedJson,
          role: "assistant",
          timestamp: Date.now(),
        };
        
        const updatedMessages = [...messages, assistantMessage];
        setMessages(updatedMessages);
        
        // Save the message to the conversation
        if (isAuthenticated && currentConversationId) {
          await saveMessageToConversation(assistantMessage);
        } else {
          // Fallback to localStorage for unauthenticated users
          localStorage.setItem('chatMessages', JSON.stringify(updatedMessages));
        }
        
        // Reset the incomplete JSON state
        setIncompleteJson(null);
        
        // Check if it's a lesson plan
        if (combinedJson.includes('"title"') && combinedJson.includes('"content"')) {
          try {
            const jsonData = JSON.parse(combinedJson);
            startLessonGeneration(jsonData);
          } catch (e) {
            console.error('Error parsing combined JSON:', e);
          }
        }
      } else {
        // If it's still incomplete, update the incomplete JSON state
        setIncompleteJson(combinedJson);
        setWaitingForContinuation(true);
      }
    } catch (error) {
      console.error('Error continuing JSON response:', error);
      
      // Add error message to chat
      const errorMessage: Message = {
        content: "Sorry, I encountered an error while processing the data. Please try again.",
        role: "assistant",
        timestamp: Date.now(),
      };
      
      setMessages([...messages, errorMessage]);
      
      // Reset the incomplete JSON state
      setIncompleteJson(null);
      setWaitingForContinuation(false);
    } finally {
      setIsLoading(false);
      setLoadingMessage("Thinking...");
    }
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;
    
    // Create the user message object
    const userMessage: Message = {
      content,
      role: 'user',
      timestamp: Date.now()
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
          `Conversation ${new Date().toLocaleString()}`,
          [userMessage]
        );
        
        console.log('New conversation created:', newConversation.id);
        setCurrentConversationId(newConversation.id);
        conversationId = newConversation.id;
        
        // Save the message to the new conversation
        await addMessage(supabase, conversationId, userMessage);
        
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
        const aiResponse = await getAIResponse(content);
        
        if (!aiResponse) {
          throw new Error('No response from AI');
        }
        
        // Ensure we have a string content
        const responseContent = typeof aiResponse === 'string' 
          ? aiResponse 
          : aiResponse.content || 'No response content';
        
        // Add the AI response to the UI
        const assistantMessage: Message = {
          content: responseContent,
          role: 'assistant',
          timestamp: Date.now()
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
          metadata: { isError: true }
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
      {/* Chat header */}
      <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
        <div className="flex items-center">
          <img
            src="/assets/images/paw-fi-logo.png"
            alt="Paw-Fi Logo"
            className="h-8 w-8 mr-2"
          />
          <h2 className="text-lg font-semibold text-gray-800">Paw-Fi Assistant</h2>
        </div>
        {currentConversationId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteConversation(currentConversationId)}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1"
            >
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
            Delete Chat
          </Button>
        )}
      </div>
      
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
                  <ReactMarkdown>{message.content}</ReactMarkdown>
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
      
      {/* Conversation selector */}
      {isAuthenticated && conversations.length > 0 && (
        <div className="bg-white border-t border-gray-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">Conversations</h3>
            <Button 
              onClick={() => user?.id && createNewConversation(user.id)}
              variant="outline"
              className="text-xs py-1 px-2"
            >
              New Chat
            </Button>
          </div>
          <div className="flex overflow-x-auto space-x-2 pb-2">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setCurrentConversationId(conv.id)}
                className={`px-3 py-1 text-sm rounded-full whitespace-nowrap ${currentConversationId === conv.id ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-gray-100 text-gray-700 border-gray-200'} border`}
              >
                {conv.session_id}
              </button>
            ))}
          </div>
        </div>
      )}

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
