"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useFinancialHealthProfile, formatProfileForAI } from "@/hooks/use-financial-health-profile";
import { useCookie } from "@/utils/use-cookie";
import { StreamingChatInterface, StreamingMessage } from "./streaming-chat-interface";
import { ConversationMessage } from "./chat-conversation-display";
import {
  fetchConversations,
  fetchConversation,
  createNewConversation,
  addMessageToConversation,
  getPredictedResponses,
} from "@/services/conversation-service";
import { supabase } from "@/lib/supabase";
import { AI_ROLES } from "./ai-roles";
import logo from "@/assets/images/icon.svg";

type Message = StreamingMessage;

export function FinancialAdvisorChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [loadingMessage] = useState("Moneko is thinking...");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [suggestedResponses, setSuggestedResponses] = useState<string[]>(["How can I grow my money?", "What are some ways to earn passive income?", "How can I learn about investing?"]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  
  const { getCookie, setCookie } = useCookie();
  
  const [guestSessionId, setGuestSessionId] = useState("");
  const [isClientInitialized, setIsClientInitialized] = useState(false);
  const [isMergingGuestToAuth, setIsMergingGuestToAuth] = useState(false);
  
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const { profile } = useFinancialHealthProfile(user?.id);
  
  // Initialize client-side session
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    let id = getCookie("paw-fi-fa-session-id");
    if (!id) {
      id = crypto.randomUUID();
      setCookie("paw-fi-fa-session-id", id, { days: 365, path: "/", sameSite: "Lax" });
    }
    setGuestSessionId(id);
    setIsClientInitialized(true);
  }, [getCookie, setCookie]);

  const getConsistentTimestamp = useCallback((): number => {
    if (typeof window === "undefined") {
      return 1717000000000;
    }
    return Date.now();
  }, []);

  // Fetch all conversations for authenticated users
  const { 
    data: conversationsData,
    refetch: refetchConversations,
    isLoading: isConversationsLoading,
    error: conversationsError
  } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => fetchConversations(supabase),
    enabled: isAuthenticated && isClientInitialized,
    staleTime: 30000,
    retry: 3,
  });
  
  const conversations = useMemo(() => {
    const storedId = typeof window !== "undefined" ? localStorage.getItem("paw-fi-fa-conversation") : null;
    
    const filtered = conversationsData?.filter(c => {
      const matchesModel = c.model === AI_ROLES.FINANCIAL_ADVISOR;
      const matchesStoredWithNull = c.model === null && c.id === storedId;
      return matchesModel || matchesStoredWithNull;
    }) || [];
    return filtered;
  }, [conversationsData]);

  const currentConversationId = useMemo(() => {
    if (!conversations.length) {
      return null;
    }
    
    const storedConvId = typeof window !== "undefined"
      ? localStorage.getItem("paw-fi-fa-conversation")
      : null;
      
    if (storedConvId && conversations.find((c) => c.id === storedConvId)) {
      return storedConvId;
    }
    const fallbackId = conversations[0]?.id;
    return fallbackId;
  }, [conversations]);

  // Fetch current conversation with messages
  const { 
    data: currentConversationData
  } = useQuery({
    queryKey: ['conversation', currentConversationId],
    queryFn: () => fetchConversation(supabase, currentConversationId!),
    enabled: !!currentConversationId && isAuthenticated && isClientInitialized,
    staleTime: 10000,
    retry: 3,
  });

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: (params: { userId: string; sessionId: string; initialMessages?: Message[]; model?: string }) => 
      createNewConversation(supabase, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    retry: 3,
  });

  // Add message mutation
  const addMessageMutation = useMutation({
    mutationFn: (message: Message) => addMessageToConversation(supabase, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['conversation', currentConversationId] 
      });
    },
    retry: 2,
  });

  // Sync messages from Supabase for authenticated users - only on conversation change
  const hasInitializedMessages = useRef<string | null>(null);
  useEffect(() => {
    if (
      isAuthenticated &&
      currentConversationId &&
      currentConversationData?.messages &&
      hasInitializedMessages.current !== currentConversationId &&
      !isMergingGuestToAuth
    ) {
      setMessages(currentConversationData.messages);
      hasInitializedMessages.current = currentConversationId;
    }
  }, [isAuthenticated, currentConversationId, currentConversationData, isMergingGuestToAuth]);

  // Streaming response handler using Supabase functions
  const handleStreamingResponse = async (message: string, history: any[]) => {
    let assistantMessage: Message | null = null;
    let assistantContent = "";
    
    try {
      const userProfile = profile ? formatProfileForAI(profile) : undefined;
      
      // Create initial streaming message
      assistantMessage = {
        content: "",
        role: "assistant",
        timestamp: getConsistentTimestamp(),
        chat_session_id: currentConversationId || guestSessionId || "temp",
        userId: user?.id,
        metadata: { isStreaming: true }
      };

      setMessages(prev => [...prev, assistantMessage!]);
      
      // Stop loading as soon as we create the streaming message
      setIsLoading(false);
      
      // Get the session for authorization
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token;
      
      // Create fetch request to get streaming response
      const requestBody = {
        message,
        history,
        userProfile
      };
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/fa-chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream available');
      }

      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            if (data === '[DONE]') {
              // Mark streaming as complete - find it by timestamp
              setMessages(prev => prev.map(msg => 
                msg.role === 'assistant' && msg.metadata?.isStreaming && msg.timestamp === assistantMessage!.timestamp
                  ? { ...msg, metadata: { ...msg.metadata, isStreaming: false } }
                  : msg
              ));
              
              // Save final message to database if authenticated
              if (isAuthenticated && currentConversationId && assistantContent) {
                const finalMessage: Message = {
                  content: assistantContent,
                  role: "assistant",
                  timestamp: getConsistentTimestamp(),
                  chat_session_id: currentConversationId,
                  userId: user?.id,
                };
                await addMessageMutation.mutateAsync(finalMessage);
              }
              
              // Fetch suggestions after streaming completes
              fetchSuggestions(assistantContent);
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                // Handle the content which might be a JSON string
                let contentToAdd = parsed.content;
                if (typeof contentToAdd === 'string' && contentToAdd.startsWith('"') && contentToAdd.endsWith('"')) {
                  // Remove surrounding quotes if present
                  contentToAdd = contentToAdd.slice(1, -1);
                }
                
                assistantContent += contentToAdd;
                
                // Update the streaming message - find it by timestamp and streaming metadata
                setMessages(prev => prev.map(msg => 
                  msg.role === 'assistant' && msg.metadata?.isStreaming && msg.timestamp === assistantMessage!.timestamp
                    ? { ...msg, content: assistantContent }
                    : msg
                ));
              }
              if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (parseError) {
              // Skip non-JSON lines or malformed data
              console.warn('Failed to parse streaming data:', data);
            }
          }
        }
      }
      
    } catch (error) {
      const errorMessage: Message = {
        content: "Sorry, I had trouble connecting. Please try again.",
        role: "assistant",
        timestamp: getConsistentTimestamp(),
        chat_session_id: currentConversationId || guestSessionId || "temp",
        userId: user?.id,
        metadata: { isError: true }
      };
      
      // Replace streaming message with error or add new error message
      if (assistantMessage) {
        setMessages(prev => prev.map((msg, idx) => 
          idx === prev.length - 1 && msg.role === 'assistant' && msg.metadata?.isStreaming
            ? errorMessage
            : msg
        ));
      } else {
        setMessages(prev => [...prev, errorMessage]);
      }
      
      setConnectionError("Connection error. Please try again.");
    }
  };

  const handleCreateConversationAndSendMessage = async (
    userIdParam: string,
    firstMessageContent: string,
  ) => {
    try {
      setIsSendingMessage(true);
      setIsLoading(true);
      
      const sessionId = guestSessionId;
      const result = await createConversationMutation.mutateAsync({
        userId: userIdParam,
        sessionId,
        initialMessages: [],
        model: AI_ROLES.FINANCIAL_ADVISOR,
      });

      if (!result || !result.id) {
        throw new Error("Failed to create conversation");
      }

      const newConversationId = result.id;

      if (typeof window !== "undefined") {
        localStorage.setItem("paw-fi-fa-conversation", newConversationId);
      }

      const userMessage: Message = {
        content: firstMessageContent,
        role: "user",
        timestamp: getConsistentTimestamp(),
        chat_session_id: newConversationId,
        userId: userIdParam,
      };

      setMessages(prev => [...prev, userMessage]);
      await addMessageMutation.mutateAsync(userMessage);
      
      const history = [{ role: userMessage.role, content: userMessage.content }];
      await handleStreamingResponse(firstMessageContent, history);
      
      await refetchConversations();
      
    } catch (error) {
      const errorMsg: Message = {
        content: "Sorry, I couldn't start a new conversation. Please try again.",
        role: "assistant",
        timestamp: getConsistentTimestamp(),
        chat_session_id: currentConversationId || "error-conv",
        userId: userIdParam,
        metadata: { isError: true },
      };
      
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSendingMessage(false);
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isSendingMessage) return;
    
    setIsSendingMessage(true);
    setConnectionError(null);
    
    if (!isAuthenticated || !user?.id) {
      // Guest flow - simplified, no persistence for now
      const userMessage: Message = {
        content,
        role: "user",
        timestamp: getConsistentTimestamp(),
        chat_session_id: guestSessionId || "temp",
      };

      setMessages(prev => [...prev, userMessage]);
      setIsLoading(true);
      
      try {
        const history = [...messages, userMessage].map(msg => ({
          role: msg.role,
          content: msg.content
        }));
        
        await handleStreamingResponse(content, history);
      } catch (error) {
      } finally {
        setIsLoading(false);
        setIsSendingMessage(false);
      }
      return;
    }

    // Authenticated Flow
    if (!currentConversationId) {
      await handleCreateConversationAndSendMessage(user.id, content);
      return;
    }

    const userMessage: Message = {
      content,
      role: "user",
      timestamp: getConsistentTimestamp(),
      chat_session_id: currentConversationId,
      userId: user.id,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    try {
      await addMessageMutation.mutateAsync(userMessage);
      
      const history = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      await handleStreamingResponse(content, history);
      
      // Remove the refetch to prevent overwriting current messages
      // The messages are already saved to database via addMessageMutation
    } catch (error) {
      const errorMessage: Message = {
        content: "Sorry, I had trouble connecting. Please check your connection or try again.",
        role: "assistant",
        timestamp: getConsistentTimestamp(),
        chat_session_id: currentConversationId,
        userId: user.id,
        metadata: { isError: true },
      };

      setMessages(prev => [...prev, errorMessage]);
      setConnectionError("Connection error. Retrying...");
    } finally {
      setIsLoading(false);
      setIsSendingMessage(false);
    }
  };

  // Fetch suggested responses based on assistant message
  const fetchSuggestions = async (lastAssistantMessage: string) => {
    setIsFetchingSuggestions(true);
    try {
      const contextMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Add the final assistant message to context
      contextMessages.push({
        role: 'assistant',
        content: lastAssistantMessage
      });
      
      const suggestions = await getPredictedResponses(supabase, lastAssistantMessage, contextMessages);
      setSuggestedResponses(suggestions);
    } catch (error) {
      setSuggestedResponses([]);
    } finally {
      setIsFetchingSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSuggestedResponses([]);
    handleSendMessage(suggestion);
  };

  return (
    <StreamingChatInterface
      messages={messages}
      onMessageSend={handleSendMessage}
      isLoading={isLoading}
      isSendingMessage={isSendingMessage}
      isConversationsLoading={isConversationsLoading}
      agentName="Moneko AI - Financial Advisor"
      welcomeMessage="Hi! I'm Moneko, your AI financial advisor. I provide personalized financial guidance based on your situation. What financial question can I help you with today?"
      welcomeSubtitle="Ask me about budgeting, investing, debt management, or any financial topic!"
      suggestions={suggestedResponses}
      onSuggestionClick={handleSuggestionClick}
      connectionError={connectionError || undefined}
      headerClassName="p-4"
      agentIcon={
        <div className="relative flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500">
          <img src={logo} alt="Moneko AI" className="size-6" />
        </div>
      }
    />
  );
}