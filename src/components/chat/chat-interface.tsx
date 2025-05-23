"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { FormEvent } from "react"; // For verbatimModuleSyntax
import {
  useConversations,
  useConversation,
  useCreateConversation,
  useAddMessage,
} from "@/services/conversation-service";
import { Button } from "@/components/ui/button";
import {
  getConversations,
  createConversation,
  getConversation,
  addMessage,
  type Message as ServiceMessage,
} from "@/services/conversation-service";
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
const MAX_TIME_TO_SHOW_LOADING = 8;
export function ChatInterface() {
  // --- Guest Conversation Utilities ---
  function getGuestSessionId(): string {
    if (typeof window === "undefined") return "";
    let id = localStorage.getItem("paw-fi-guest-session-id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("paw-fi-guest-session-id", id);
    }
    return id;
  }
  function guestMessagesKey() {
    return `paw-fi-guest-messages-${getGuestSessionId()}`;
  }
  function loadGuestMessages(): Message[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(guestMessagesKey());
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
  function saveGuestMessages(msgs: Message[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(guestMessagesKey(), JSON.stringify(msgs));
  }
  function clearGuestMessages() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(guestMessagesKey());
  }

  function acquireMergeLock(): boolean {
    if (typeof window === "undefined") return false;
    const lockKey = "paw-fi-chat-merge-lock";
    const now = Date.now();
    const lockVal = localStorage.getItem(lockKey);
    if (lockVal && now - parseInt(lockVal, 10) < 10000) return false; // 10s lock
    localStorage.setItem(lockKey, now.toString());
    return true;
  }
  function releaseMergeLock() {
    if (typeof window === "undefined") return;
    localStorage.removeItem("paw-fi-chat-merge-lock");
  }
  const navigate = useNavigate();
  const [currentMessage, setCurrentMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  // Track guest messages separately for merging
  const [guestMessages, setGuestMessages] = useState<Message[]>([]);
  const { user } = useAuth();
  const isAuthenticated = !!user;
  // Track merge state to avoid duplicate merges
  const [hasMergedGuest, setHasMergedGuest] = useState(false);
  // Track if a guest-to-auth merge is in progress
  const [isMergingGuestToAuth, setIsMergingGuestToAuth] = useState(false);

  // Helper: Only clear guest messages after merged messages are fetched and displayed
  useEffect(() => {
    if (
      isMergingGuestToAuth &&
      messages.length > 0 &&
      guestMessages.length > 0
    ) {
      // Merge is complete and merged messages are now displayed, safe to clear guest messages
      clearGuestMessages();
      setGuestMessages([]);
      setIsMergingGuestToAuth(false);
    }
  }, [isMergingGuestToAuth, messages, guestMessages]);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("PawFi is thinking...");
  const [loadingDuration, setLoadingDuration] = useState(0);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [pendingLessonJson, setPendingLessonJson] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  function handleScroll() {
    const container = chatContainerRef.current;
    if (!container) return;
    const threshold = 100; // px from bottom
    const atBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      threshold;
    setAutoScroll(atBottom);
  }

  // Scroll to bottom helper
  function scrollToBottom() {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      // Use smooth scrolling behavior
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }

    // Also ensure the messagesEndRef is scrolled into view smoothly
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }

  const {
    data: conversationsData,
    isLoading: isConversationsLoading,
    refetch: refetchConversations,
  } = useConversations(supabase);
  const conversations = useMemo(
    () => conversationsData || [],
    [conversationsData],
  );

  const currentConversationId = useMemo(() => {
    // Attempt to get from localStorage first, then fallback to first in list
    const storedConvId =
      typeof window !== "undefined"
        ? localStorage.getItem("paw-fi-current-conversation")
        : null;
    if (storedConvId && conversations.find((c) => c.id === storedConvId)) {
      return storedConvId;
    }
    return conversations[0]?.id;
  }, [conversations]);

  const {
    data: currentConversationData,
    isLoading: isConversationLoading,
    refetch: refetchConversation,
  } = useConversation(supabase, currentConversationId);

  const currentConversation = useMemo(
    () => currentConversationData,
    [currentConversationData],
  );

  // Ensure messages state is set from Supabase for authenticated users
  useEffect(() => {
    if (isAuthenticated && currentConversationData?.messages) {
      setMessages(currentConversationData.messages);
    }
  }, [isAuthenticated, currentConversationData]);

  const createConversationMutation = useCreateConversation(supabase);
  const addMessageMutation = useAddMessage(supabase);

  const authenticatedMessage =
    "Hi I'm PawFi! I'll help you learn about personal finance. Type 'start' to begin or ask me anything.";
  const unauthenticatedMessage =
    "Hi I'm PawFi! I'll help you learn about personal finance. Type 'start' to begin or ask me anything. You can continue as a guest, but signing up is free and lets you save your progress.";
  const baseWelcomeMessage = isAuthenticated
    ? authenticatedMessage
    : unauthenticatedMessage;

  // Scroll to bottom on mount and whenever messages change or loading state changes
  useEffect(() => {
    // Use a small delay to ensure content is rendered before scrolling
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100);

    // Check for lesson JSON in the latest message if user is not authenticated
    if (!isAuthenticated && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant") {
        const extractedJson = extractFirstJson(lastMessage.content);
        if (extractedJson?.json && extractedJson.json.type === "lesson") {
          setPendingLessonJson(extractedJson.json);
          setShowSignupPrompt(true);
        }
      }
    }
    return () => clearTimeout(timeoutId);
  }, [messages, isLoading, isAuthenticated]);

  // --- Guest/Authenticated Merge Effect ---
  useEffect(() => {
    if (isAuthenticated && !hasMergedGuest) {
      const guestMsgs = loadGuestMessages();
      if (guestMsgs.length === 0) {
        setHasMergedGuest(true);
        setIsMergingGuestToAuth(false);
        return;
      }
      if (!acquireMergeLock()) return;
      setIsMergingGuestToAuth(true);
      (async () => {
        try {
          // Use service functions for all Supabase operations
          const conversations = await getConversations(supabase);
          let session = conversations.find(
            (c: { user_id: string; id: string }) => c.user_id === user.id,
          );
          let sessionId = session?.id;
          if (!sessionId) {
            // Create new session with a new session id (reuse guest session id for continuity)
            sessionId = getGuestSessionId();
            const created = await createConversation(
              supabase,
              user.id,
              sessionId,
              [],
            );
            sessionId = created.id;
          }
          // Fetch all existing messages for deduplication
          const conversation = await getConversation(supabase, sessionId);
          const existingMsgs = conversation.messages || [];
          // Deduplicate guest messages
          const deduped = guestMsgs.filter(
            (m: ServiceMessage) =>
              !existingMsgs.some(
                (em: ServiceMessage) =>
                  em.role === m.role &&
                  em.content === m.content &&
                  Math.abs(em.timestamp - m.timestamp) < 2000, // 2s window
              ),
          );
          // Insert deduped guest messages
          for (const msg of deduped) {
            await addMessage(supabase, {
              ...msg,
              chat_session_id: sessionId,
            });
          }
          // Wait for the refetch to complete before clearing guest state
          await refetchConversations();
          await refetchConversation();
          clearGuestMessages();
          setGuestMessages([]);
          setHasMergedGuest(true);
          setIsMergingGuestToAuth(false);
          releaseMergeLock();
        } catch (err) {
          // Fail silently
          setIsMergingGuestToAuth(false);
          releaseMergeLock();
        }
      })();
    }
  }, [
    isAuthenticated,
    hasMergedGuest,
    user,
    refetchConversations,
    refetchConversation,
  ]);

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

  // Effect for cleanup
  useEffect(() => {
    return () => {
      // Clear any timers when component unmounts
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
      }
    };
  }, []);

  // Effect to update loading message based on duration
  useEffect(() => {
    if (loadingDuration === MAX_TIME_TO_SHOW_LOADING) {
      setLoadingMessage("Crafting your personalized financial lessons... 📚");
    } else if (loadingDuration === MAX_TIME_TO_SHOW_LOADING + 15) {
      setLoadingMessage(
        "Building knowledge blocks just for you! Almost there... 🧩",
      );
    } else if (loadingDuration === MAX_TIME_TO_SHOW_LOADING + 30) {
      setLoadingMessage(
        "Creating something special! Your financial wisdom is on the way... ✨",
      );
    } else if (loadingDuration === MAX_TIME_TO_SHOW_LOADING + 45) {
      setLoadingMessage(
        "Almost done! Did you know? Small, consistent steps lead to big financial growth. 🌱",
      );
    }
  }, [loadingDuration]);

  // Effect for setting initial messages (welcome or from conversation)
  // Utility: deduplicate array of messages by role, content, and timestamp (rounded to nearest second)
  function dedupeMessages(messages: Message[]): Message[] {
    const seen = new Set<string>();
    return messages.filter((msg) => {
      // Round timestamp to nearest second for deduplication
      const roundedTimestamp = Math.round(msg.timestamp / 1000);
      const key = `${msg.role}|${msg.content}|${roundedTimestamp}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Helper: Compare two arrays of messages for shallow equality
  function areMessagesSimilar(arr1: Message[], arr2: Message[]): boolean {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
      const a = arr1[i];
      const b = arr2[i];
      if (
        a.role !== b.role ||
        a.content !== b.content ||
        Math.round(a.timestamp / 1000) !== Math.round(b.timestamp / 1000)
      ) {
        return false;
      }
    }
    return true;
  }

  // Persist currentConversationId to localStorage
  useEffect(() => {
    if (currentConversationId && typeof window !== "undefined") {
      localStorage.setItem(
        "paw-fi-current-conversation",
        currentConversationId,
      );
    }
  }, [currentConversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      // Determine if user was near the bottom before new messages were added
      const isScrolledNearBottom =
        container.scrollHeight - container.clientHeight <=
        container.scrollTop + 250; // 250px threshold

      if (isScrolledNearBottom || isLoading) {
        // Scroll if near bottom OR if a new loading indicator for AI response appears
        messagesEndRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }
    }
  }, [messages, isLoading]);

  const handleCreateConversationAndSendMessage = async (
    userId: string,
    firstMessageContent: string,
  ) => {
    setIsLoading(true);
    setLoadingMessage("Starting new conversation...");
    setLoadingDuration(0);

    // Clear any existing timer
    if (loadingTimerRef.current) {
      clearInterval(loadingTimerRef.current);
    }

    // Start a new timer to track loading duration
    loadingTimerRef.current = setInterval(() => {
      setLoadingDuration((prev) => prev + 1);
    }, 1000);
    try {
      const newConversationTitle = `Chat ${new Date().toLocaleString()}`;
      const newConvData = await createConversationMutation.mutateAsync({
        userId,
        title: newConversationTitle,
      });

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
        // setLoadingMessage("PawFi is thinking..."); // Set by getAIResponseFromEdge call

        await addMessageMutation.mutateAsync(userMessage); // Save user message

        // Get AI response for the first message
        const stream = await getAIResponseFromEdge(supabase, newConvId, [
          userMessage,
        ]); // Pass only user message for context
        let assistantResponse = "";
        const assistantMessageId = `assistant-${Date.now()}`;

        for await (const chunk of stream) {
          assistantResponse += chunk;
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              content: assistantResponse,
              role: "assistant",
              timestamp: Date.now(),
              chat_session_id: newConvId,
              metadata: { id: assistantMessageId, isStreaming: true },
            },
          ]);
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
            msg.metadata?.id === assistantMessageId
              ? finalAssistantMessage
              : msg,
          ),
        );
        refetchConversation(); // Fetch again to ensure UI is consistent with DB
      } else {
        throw new Error("Failed to create conversation or get new ID.");
      }
    } catch (error) {
      console.error("Error creating conversation and sending message:", error);
      const errorMsg: Message = {
        content:
          "Sorry, I couldn't start a new conversation. Please try again.",
        role: "assistant",
        timestamp: Date.now(),
        chat_session_id: currentConversationId || "error-conv",
        metadata: { isError: true },
      };
      setMessages((prev) => {
        // Check if this exact error message already exists
        const messageExists = prev.some(
          (msg) =>
            msg.timestamp === errorMsg.timestamp &&
            msg.role === errorMsg.role &&
            msg.content === errorMsg.content,
        );

        return messageExists ? prev : [...prev, errorMsg];
      });
    } finally {
      setIsLoading(false);
      setLoadingMessage("PawFi is thinking...");
      setLoadingDuration(0);

      // Clear the loading timer
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }

      inputRef.current?.focus();
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    if (!isAuthenticated || !user?.id) {
      // --- Guest Flow ---
      const guestId = getGuestSessionId();
      const userMessage: Message = {
        content,
        role: "user",
        timestamp: Date.now(),
        chat_session_id: guestId,
      };
      // Add to UI and guest state
      setMessages((prev) => {
        const next = dedupeMessages([...prev, userMessage]);
        next.sort((a, b) => a.timestamp - b.timestamp);
        saveGuestMessages(next);
        setGuestMessages(next);
        return next;
      });
      setCurrentMessage("");
      inputRef.current?.focus();
      setTimeout(() => scrollToBottom(), 50);
      setIsLoading(true);
      setLoadingMessage("PawFi is thinking...");
      setLoadingDuration(0);
      if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
      loadingTimerRef.current = setInterval(
        () => setLoadingDuration((prev) => prev + 1),
        1000,
      );
      try {
        // Call AI API as usual
        const contextMessages = [...messages, userMessage].map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));
        const response = await getAIResponseFromEdge(
          supabase,
          content,
          contextMessages,
        );
        const assistantMessage: Message = {
          content:
            response.response || "I'm sorry, I couldn't generate a response.",
          role: "assistant",
          timestamp: Date.now(),
          chat_session_id: guestId,
        };
        setMessages((prev) => {
          const next = dedupeMessages([...prev, assistantMessage]);
          next.sort((a, b) => a.timestamp - b.timestamp);
          saveGuestMessages(next);
          setGuestMessages(next);
          return next;
        });
        setIsLoading(false);
        // If lesson JSON, prompt for signup handled in effect
      } catch (error) {
        const errorMessage: Message = {
          content:
            "Sorry, I had trouble connecting. Please check your connection or try again.",
          role: "assistant",
          timestamp: Date.now(),
          chat_session_id: guestId,
          metadata: { isError: true },
        };
        setMessages((prev) => {
          const next = dedupeMessages([...prev, errorMessage]);
          next.sort((a, b) => a.timestamp - b.timestamp);
          saveGuestMessages(next);
          setGuestMessages(next);
          return next;
        });
      } finally {
        setIsLoading(false);
        setLoadingMessage("PawFi is thinking...");
        setLoadingDuration(0);
        if (loadingTimerRef.current) {
          clearInterval(loadingTimerRef.current);
          loadingTimerRef.current = null;
        }
        inputRef.current?.focus();
        setTimeout(() => scrollToBottom(), 100);
      }
      return;
    }
    // --- Authenticated Flow ---
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
    // First check if this message already exists to prevent duplicates
    setMessages((prevMessages) => {
      // Add and deduplicate
      const next = dedupeMessages([...prevMessages, userMessage]);
      next.sort((a, b) => a.timestamp - b.timestamp);
      return next;
    });

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
    setLoadingMessage("PawFi is thinking...");
    setLoadingDuration(0);

    // Clear any existing timer
    if (loadingTimerRef.current) {
      clearInterval(loadingTimerRef.current);
    }

    // Start a new timer to track loading duration
    loadingTimerRef.current = setInterval(() => {
      setLoadingDuration((prev) => prev + 1);
    }, 1000);

    try {
      // Save user message to database
      await addMessageMutation.mutateAsync(userMessage);

      // Get response from AI
      try {
        // Format messages for the API
        // Use the latest messages including the just-sent user message
        const contextMessages = [...messages, userMessage].map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

        // Call the AI service
        const response = await getAIResponseFromEdge(
          supabase,
          content,
          contextMessages,
        );

        // Add the assistant response to the messages
        const assistantMessage: Message = {
          content:
            response.response || "I'm sorry, I couldn't generate a response.",
          role: "assistant",
          timestamp: Date.now(),
          chat_session_id: currentConversationId,
        };
        setMessages((prevMessages) => {
          // Add and deduplicate
          const next = dedupeMessages([...prevMessages, assistantMessage]);
          next.sort((a, b) => a.timestamp - b.timestamp);
          return next;
        });
        setIsLoading(false); // Hide loading as soon as response is rendered
        // Save assistant message to database
        await addMessageMutation.mutateAsync(assistantMessage);
      } catch (aiError) {
        console.error("Error getting AI response:", aiError);
        throw aiError; // Propagate to outer catch block
      }
    } catch (error) {
      console.error("Error getting AI response or saving message:", error);
      const errorMessage: Message = {
        content:
          "Sorry, I had trouble connecting. Please check your connection or try again.",
        role: "assistant",
        timestamp: Date.now(),
        chat_session_id: currentConversationId,
        metadata: { isError: true },
      };
      setMessages((prevMessages) => {
        // Add and deduplicate
        const next = dedupeMessages([...prevMessages, errorMessage]);
        next.sort((a, b) => a.timestamp - b.timestamp);
        return next;
      });
      // No need to save this particular client-side error message to DB usually
    } finally {
      setIsLoading(false);
      setLoadingMessage("PawFi is thinking...");
      setLoadingDuration(0);

      // Clear the loading timer
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }

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

  const extractFirstJson = (
    text: string,
  ): { json: any; start: number; end: number } | null => {
    const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/i;
    const jsonBlockMatch = text.match(jsonBlockRegex);
    if (jsonBlockMatch && jsonBlockMatch[1]) {
      try {
        const code = jsonBlockMatch[1].trim();
        const json = JSON.parse(code);
        const idx = text.indexOf(jsonBlockMatch[0]);
        return { json, start: idx, end: idx + jsonBlockMatch[0].length };
      } catch (err) {
        /* Fall through */
      }
    }
    const curlyBlockRegex = /\{[\s\S]*\}/g;
    let match: RegExpExecArray | null;
    while ((match = curlyBlockRegex.exec(text)) !== null) {
      try {
        const json = JSON.parse(match[0]);
        return { json, start: match.index, end: match.index + match[0].length };
      } catch (err) {
        continue;
      }
    }
    return null;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (currentMessage.trim()) {
      handleSendMessage(currentMessage);
    }
  };

  const isBackendProcessing = useMemo(
    () =>
      (isMergingGuestToAuth ||
        isConversationsLoading ||
        (currentConversationId && isConversationLoading)) &&
      messages.length === 0,
    [
      isMergingGuestToAuth,
      isConversationsLoading,
      currentConversationId,
      isConversationLoading,
      messages,
    ],
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-gray-50 shadow-lg dark:bg-gray-900">
      <div
        ref={chatContainerRef}
        className="h-full flex-1 overflow-y-scroll p-4 md:p-6"
        id="chat-messages-container"
        onScroll={handleScroll}
      >
        <div className="mx-auto space-y-3 pb-8">
          {isBackendProcessing && (
            <div className="space-y-4 pt-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`flex animate-pulse ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`w-3/5 rounded-lg p-3 ${i % 2 === 0 ? "bg-purple-200 dark:bg-purple-700" : "bg-gray-200 dark:bg-gray-700"}`}
                  >
                    <div
                      className={`mb-1.5 h-4 rounded ${i % 2 === 0 ? "bg-purple-300 dark:bg-purple-600" : "bg-gray-300 dark:bg-gray-600"} w-3/4`}
                    ></div>
                    <div
                      className={`h-4 rounded ${i % 2 === 0 ? "bg-purple-300 dark:bg-purple-600" : "bg-gray-300 dark:bg-gray-600"} w-full`}
                    ></div>
                    <div
                      className={`h-4 rounded ${i % 2 === 0 ? "bg-purple-300 dark:bg-purple-600" : "bg-gray-300 dark:bg-gray-600"} w-full`}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isBackendProcessing && (
            <div className="text-center text-gray-400 dark:text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="text-lg">{baseWelcomeMessage}</p>
            </div>
          )}

          {messages.map((msg) => {
            // Create a more unique key using content hash to help React identify unique messages
            const contentHash =
              msg.content.length > 0
                ? msg.content
                    .split("")
                    .reduce(
                      (acc, char) =>
                        (acc * 31 + char.charCodeAt(0)) & 0xffffffff,
                      0,
                    )
                : 0;

            return (
              <ChatMessageItem
                key={`${msg.timestamp}-${msg.role}-${contentHash}`}
                message={msg}
                formatTime={formatTime}
                extractFirstJson={extractFirstJson}
                storeCourse={storeCourse}
                navigate={navigate}
              />
            );
          })}

          <div
            ref={messagesEndRef}
            id="messages-end-ref"
            style={{ height: "1px", float: "left", clear: "both" }}
          />

          {isLoading &&
            messages.length > 0 &&
            !messages[messages.length - 1]?.metadata?.isStreaming && (
              <div className="flex justify-start pt-2">
                <div className="max-w-[80%] rounded-lg border border-gray-200/80 bg-white p-3 shadow-sm transition-all duration-300 ease-in-out dark:border-gray-700 dark:bg-gray-800">
                  <div className="mb-2 flex items-center text-sm font-medium text-gray-600 dark:text-gray-300">
                    <span
                      className={`mr-2 ${loadingDuration >= MAX_TIME_TO_SHOW_LOADING ? "text-primary dark:text-primary" : ""}`}
                    >
                      {loadingMessage}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary opacity-90 [animation-delay:-0.3s]"></div>
                    <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary opacity-90 [animation-delay:-0.15s]"></div>
                    <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary opacity-90"></div>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>

      {!isBackendProcessing && (
        <div className="border-t border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto w-full p-3 md:p-4">
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <input
                ref={inputRef}
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="Type your message..."
                className="w-full flex-grow resize-none overflow-y-hidden rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
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
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-600 p-0 text-white transition-all duration-150 ease-in-out hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:hover:bg-gray-300 dark:disabled:bg-gray-600 dark:disabled:hover:bg-gray-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="currentColor"
                  className="transition-transform duration-150 ease-in-out group-hover:scale-110"
                >
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
                <span className="sr-only">Send message</span>
              </Button>
            </form>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
