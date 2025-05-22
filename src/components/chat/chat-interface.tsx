"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { FormEvent } from "react"; // For verbatimModuleSyntax
import { Link } from "@tanstack/react-router";
import {
  useConversations,
  useConversation,
  useCreateConversation,
  useAddMessage,
} from "@/services/conversation-service";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { ChatMessageItem } from "./chat-message-item";
import { storeCourse } from "@/data/lessons";
import { useNavigate } from "@tanstack/react-router";
import { getAIResponseFromEdge } from "@/services/conversation-service";
import { supabase } from "@/lib/supabase";

interface Message {
  content: string;
  role: "user" | "assistant";
  timestamp: number;
  chat_session_id: string;
  metadata?: Record<string, any>;
}

export function ChatInterface() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAuthenticated = !!user;

  const [currentMessage, setCurrentMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Paw-Fi is thinking...");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

function handleScroll() {
  const container = chatContainerRef.current;
  if (!container) return;
  const threshold = 100; // px from bottom
  const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  setAutoScroll(atBottom);
}


  // Scroll to bottom helper
  function scrollToBottom() {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }

  const { 
    data: conversationsData, 
    isLoading: isConversationsLoading, 
    refetch: refetchConversations 
  } = useConversations(supabase);
  const conversations = useMemo(() => conversationsData || [], [conversationsData]);

  const currentConversationId = useMemo(() => {
    // Attempt to get from localStorage first, then fallback to first in list
    const storedConvId = typeof window !== 'undefined' ? localStorage.getItem("paw-fi-current-conversation") : null;
    if (storedConvId && conversations.find(c => c.id === storedConvId)) {
      return storedConvId;
    }
    return conversations[0]?.id;
  }, [conversations]);

  const { 
    data: currentConversationData, 
    isLoading: isConversationLoading, 
    refetch: refetchConversation 
  } = useConversation(supabase, currentConversationId);
  
  const currentConversation = useMemo(() => currentConversationData, [currentConversationData]);

  const createConversationMutation = useCreateConversation(supabase);
  const addMessageMutation = useAddMessage(supabase);

  const authenticatedMessage = "Hi I'm Paw-Fi! I'll help you learn about personal finance. Type 'start' to begin or ask me anything.";
  const unauthenticatedMessage = "Hi I'm Paw-Fi! Sign in to start learning about personal finance with me.";
  const baseWelcomeMessage = isAuthenticated ? authenticatedMessage : unauthenticatedMessage;

  // Scroll to bottom on mount and whenever messages change or loading state changes
  useEffect(() => {
    // Use a small delay to ensure content is rendered before scrolling
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, isLoading]);

  // Always scroll to bottom when the component mounts (page reload)
  useEffect(() => {
    // Initial scroll with a delay to ensure DOM is fully rendered
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, []);
  
  // Additional effect to handle scroll after data is loaded
  useEffect(() => {
    if (!isConversationsLoading && !isConversationLoading) {
      const timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [isConversationsLoading, isConversationLoading]);

  // // Robust JSON extractor for chat messages
  // function extractFirstJson(
  //   text: string,
  // ): { json: any; start: number; end: number } | null {
  //   // 1. Try to extract the first ```json ... ``` code block
  //   const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/i;
  //   const jsonBlockMatch = text.match(jsonBlockRegex);
  //   if (jsonBlockMatch && jsonBlockMatch[1]) {
  //     try {
  //       const code = jsonBlockMatch[1].trim();
  //       const json = JSON.parse(code);
  //       const idx = text.indexOf(jsonBlockMatch[0]);
  //       return {
  //         json,
  //         start: idx,
  //         end: idx + jsonBlockMatch[0].length,
  //       };
  //     } catch (err) {
  //       console.warn(
  //         "Could not parse JSON from code block:",
  //         jsonBlockMatch[1].substring(0, 100),
  //         err,
  //       );
  //     }
  //   }
  //   // 2. Fallback: Try to find the first {...} that parses
  //   const curlyBlockRegex = /\{[\s\S]*\}/g;
  //   let match: RegExpExecArray | null;
  //   while ((match = curlyBlockRegex.exec(text)) !== null) {
  //     try {
  //       const json = JSON.parse(match[0]);
  //       return {
  //         json,
  //         start: match.index,
  //         end: match.index + match[0].length,
  //       };
  //     } catch (err) {
  //       continue;
  //     }
  //   }
  //   return null;
  // }

  // Effect for setting initial messages (welcome or from conversation)
  useEffect(() => {
    if (!isAuthenticated && messages.length === 0) {
      setMessages([
        {
          content: unauthenticatedMessage,
          role: "assistant",
          timestamp: Date.now(),
          chat_session_id: "unauthenticated-welcome",
        },
      ]);
    } else if (isAuthenticated && currentConversationId && currentConversation) {
      if (currentConversation.messages && currentConversation.messages.length > 0) {
        // Merge and deduplicate local and server messages by timestamp+role
        const serverMsgs = currentConversation.messages ?? [];
        const merged: Message[] = [...serverMsgs];
        messages.forEach(localMsg => {
          if (!serverMsgs.some(s => s.timestamp === localMsg.timestamp && s.role === localMsg.role)) {
            merged.push(localMsg);
          }
        });
        // Sort by timestamp ascending
        merged.sort((a, b) => a.timestamp - b.timestamp);
        // Only update if different (by length or last message)
        const isDifferent =
          merged.length !== messages.length ||
          (merged.length > 0 && messages.length > 0 &&
            (merged[merged.length - 1].timestamp !== messages[messages.length - 1].timestamp ||
             merged[merged.length - 1].role !== messages[messages.length - 1].role));
        if (isDifferent) {
          setMessages(merged);
        }
      } else if (messages.length === 0) { // Only add welcome if truly no messages yet
        const welcomeMsg: Message = {
          content: authenticatedMessage,
          role: "assistant",
          timestamp: Date.now(),
          chat_session_id: currentConversationId,
        };
        // Add to local state immediately for responsiveness
        setMessages([welcomeMsg]);
        // Persist to DB, but don't block UI
        addMessageMutation.mutate(welcomeMsg, {
          onError: (error) => console.error("Failed to save welcome message:", error),
          // No need to refetch here as we've updated local state
        });
      }
    } else if (isAuthenticated && !currentConversationId && !isConversationsLoading && messages.length === 0) {
      // If authenticated, no current conv ID, not loading conversations, and no messages yet
      // This implies there are no conversations at all. Show a generic welcome.
      setMessages([
        {
          content: authenticatedMessage,
          role: "assistant",
          timestamp: Date.now(),
          chat_session_id: "initial-auth-welcome",
        },
      ]);
    }
  }, [
    isAuthenticated, 
    currentConversationId, 
    currentConversation, 
    isConversationsLoading, // Added to avoid premature welcome message if conversations are still loading
    addMessageMutation, // Dependency for addMessageMutation.mutate
    authenticatedMessage, // Dependency for authenticatedMessage
    unauthenticatedMessage, // Dependency for unauthenticatedMessage
    // messages.length removed to prevent loop when welcome message is added
  ]);

  // Persist currentConversationId to localStorage
  useEffect(() => {
    if (currentConversationId && typeof window !== 'undefined') {
      localStorage.setItem("paw-fi-current-conversation", currentConversationId);
    }
  }, [currentConversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      // Determine if user was near the bottom before new messages were added
      const isScrolledNearBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 250; // 250px threshold
      
      if (isScrolledNearBottom || isLoading) { 
        // Scroll if near bottom OR if a new loading indicator for AI response appears
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }
  }, [messages, isLoading]);

  const handleCreateConversationAndSendMessage = async (userId: string, firstMessageContent: string) => {
    setIsLoading(true);
    setLoadingMessage("Starting new conversation...");
    try {
      const newConversationTitle = `Chat ${new Date().toLocaleString()}`;
      const newConvData = await createConversationMutation.mutateAsync({ userId, title: newConversationTitle });
      
      if (newConvData && newConvData.id) {
        const newConvId = newConvData.id;
        await refetchConversations(); // This should update currentConversationId via its useMemo
        
        // Send the first message to this new conversation
        const userMessage: Message = {
          content: firstMessageContent,
          role: "user",
          timestamp: Date.now(),
          chat_session_id: newConvId,
        };
        setMessages([userMessage]); // Show user message immediately
        setCurrentMessage("");
        inputRef.current?.focus();
        // setLoadingMessage("Paw-Fi is thinking..."); // Set by getAIResponseFromEdge call
        
        await addMessageMutation.mutateAsync(userMessage); // Save user message

        // Get AI response for the first message
        const stream = await getAIResponseFromEdge(newConvId, [userMessage]); // Pass only user message for context
        let assistantResponse = "";
        const assistantMessageId = `assistant-${Date.now()}`;
        
        for await (const chunk of stream) {
          assistantResponse += chunk;
          setMessages((prevMessages) =>
            [...prevMessages, {
              content: assistantResponse,
              role: "assistant",
              timestamp: Date.now(), 
              chat_session_id: newConvId,
              metadata: { id: assistantMessageId, isStreaming: true },
            }]
          );
        }
        
        const finalAssistantMessage: Message = {
          content: assistantResponse,
          role: "assistant",
          timestamp: Date.now(), 
          chat_session_id: newConvId,
          metadata: { id: assistantMessageId, isStreaming: false },
        };
        await addMessageMutation.mutateAsync(finalAssistantMessage);
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.metadata?.id === assistantMessageId ? finalAssistantMessage : msg
          )
        );
        refetchConversation(); // Fetch again to ensure UI is consistent with DB

      } else {
        throw new Error("Failed to create conversation or get new ID.");
      }
    } catch (error) {
      console.error("Error creating conversation and sending message:", error);
      const errorMsg: Message = {
        content: "Sorry, I couldn't start a new conversation. Please try again.",
        role: "assistant",
        timestamp: Date.now(),
        chat_session_id: currentConversationId || "error-conv",
         metadata: { isError: true },
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setLoadingMessage("Paw-Fi is thinking...");
      inputRef.current?.focus();
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    if (!isAuthenticated || !user?.id) {
      console.log("User not authenticated. Cannot send message.");
      return;
    }

    // Construct user message first
    const userMessage: Message = {
      content,
      role: "user",
      timestamp: Date.now(),
      chat_session_id: currentConversationId,
    };

    // Immediately add user message to UI for instant feedback
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    if (!currentConversationId) {
      // If no current conversation, create one and then send the message
      await handleCreateConversationAndSendMessage(user.id, content);
      return;
    }

    setCurrentMessage("");
    inputRef.current?.focus();
    
    // Force scroll to bottom after adding user message
    setTimeout(() => scrollToBottom(), 50);
    
    setIsLoading(true);
    setLoadingMessage("Paw-Fi is thinking...");

    try {
      // Save user message to database
      await addMessageMutation.mutateAsync(userMessage);
      
      // Get response from AI
      try {
        // Format messages for the API
        // Use the latest messages including the just-sent user message
        const contextMessages = [
          ...messages,
          userMessage
        ].map(msg => ({
          role: msg.role,
          content: msg.content
        }));
        
        // Call the AI service
        const response = await getAIResponseFromEdge(
          supabase,
          content,
          contextMessages
        );
        
        // Add the assistant response to UI only when available
        const finalAssistantMessage: Message = {
          content: response.response || "I'm sorry, I couldn't generate a response.",
          role: "assistant",
          timestamp: Date.now(), 
          chat_session_id: currentConversationId,
        };
        setMessages((prevMessages) => [...prevMessages, finalAssistantMessage]);
        setIsLoading(false); // Hide loading as soon as response is rendered
        
        // Save assistant message to database
        await addMessageMutation.mutateAsync(finalAssistantMessage);
      } catch (aiError) {
        console.error("Error getting AI response:", aiError);
        throw aiError; // Propagate to outer catch block
      }
    } catch (error) {
      console.error("Error getting AI response or saving message:", error);
      const errorMessage: Message = {
        content: "Sorry, I had trouble connecting. Please check your connection or try again.",
        role: "assistant",
        timestamp: Date.now(),
        chat_session_id: currentConversationId,
        metadata: { isError: true },
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
      // No need to save this particular client-side error message to DB usually
    } finally {
      setIsLoading(false);
      setLoadingMessage("Paw-Fi is thinking..."); 
      inputRef.current?.focus();
      refetchConversation();
      // Final scroll to bottom
      setTimeout(() => scrollToBottom(), 100);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  };
  
  const extractFirstJson = (text: string): { json: any; start: number; end: number } | null => {
    const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/i;
    const jsonBlockMatch = text.match(jsonBlockRegex);
    if (jsonBlockMatch && jsonBlockMatch[1]) {
      try {
        const code = jsonBlockMatch[1].trim();
        const json = JSON.parse(code);
        const idx = text.indexOf(jsonBlockMatch[0]);
        return { json, start: idx, end: idx + jsonBlockMatch[0].length };
      } catch (err) { /* Fall through */ }
    }
    const curlyBlockRegex = /\{[\s\S]*\}/g;
    let match: RegExpExecArray | null;
    while ((match = curlyBlockRegex.exec(text)) !== null) {
      try {
        const json = JSON.parse(match[0]);
        return { json, start: match.index, end: match.index + match[0].length };
      } catch (err) { continue; }
    }
    return null;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (currentMessage.trim()) {
      handleSendMessage(currentMessage);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-gray-50 dark:bg-gray-900 shadow-lg">
      <div
        ref={chatContainerRef}
        className="flex-1 h-full overflow-y-scroll p-4 md:p-6"
        id="chat-messages-container"
        onScroll={handleScroll}
      >
        <div className="mx-auto space-y-3 pb-8">
          {(isConversationsLoading || (currentConversationId && isConversationLoading)) && messages.length === 0 && (
            <div className="space-y-4 pt-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`flex animate-pulse ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                  <div className={`w-3/5 rounded-lg p-3 ${i % 2 === 0 ? 'bg-purple-200 dark:bg-purple-700' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <div className={`mb-1.5 h-4 rounded ${i % 2 === 0 ? 'bg-purple-300 dark:bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'} w-3/4`}></div>
                    <div className={`h-4 rounded ${i % 2 === 0 ? 'bg-purple-300 dark:bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'} w-full`}></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isConversationsLoading && !isConversationLoading && !isLoading && (
            <div className=" text-center text-gray-400 dark:text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-lg">{baseWelcomeMessage}</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <ChatMessageItem
              key={msg.timestamp + '-' + idx}
              message={msg}
              formatTime={formatTime}
              extractFirstJson={extractFirstJson}
              storeCourse={storeCourse}
              navigate={navigate}
            />
          ))}

          <div ref={messagesEndRef} id="messages-end-ref" style={{ height: '1px', float: 'left', clear: 'both' }} />

          {isLoading && messages.length > 0 && !messages[messages.length-1]?.metadata?.isStreaming && (
             <div className="flex justify-start pt-2">
              <div className="max-w-[80%] rounded-lg border border-gray-200/80 bg-white dark:bg-gray-800 dark:border-gray-700 p-3 shadow-sm">
                <div className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">{loadingMessage}</div>
                <div className="flex items-center space-x-1.5">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-purple-400 [animation-delay:-0.3s]"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-purple-400 [animation-delay:-0.15s]"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-purple-400"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto w-full p-3 md:p-4">
          {isAuthenticated ? (
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <input
                ref={inputRef}
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="Type your message..."
                className="w-full flex-grow resize-none overflow-y-hidden rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 py-2.5 text-sm shadow-sm transition-colors focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as any); 
                  }
                }}
              />
              <Button
                type="submit"
                variant="primary"
                disabled={!currentMessage.trim() || isLoading}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-600 p-0 text-white transition-all duration-150 ease-in-out hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:hover:bg-gray-300 dark:disabled:hover:bg-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="transition-transform duration-150 ease-in-out group-hover:scale-110">
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
                <span className="sr-only">Send message</span>
              </Button>
            </form>
          ) : (
            <div className="flex flex-col items-center space-y-3 py-4">
              <p className="text-center text-sm text-gray-600 dark:text-gray-400">Sign in to chat with Paw-Fi and explore personal finance.</p>
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="rounded-md bg-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="rounded-md border border-purple-600 px-5 py-2.5 text-sm font-medium text-purple-700 shadow-sm transition-colors hover:bg-purple-50 dark:text-purple-400 dark:border-purple-500 dark:hover:bg-purple-700 dark:hover:text-white focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
      <div ref={messagesEndRef} />
    </div>
  );
}
