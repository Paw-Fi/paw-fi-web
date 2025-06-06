"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { FormEvent } from "react"; // For verbatimModuleSyntax
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGraduationCap, faLightbulb } from "@fortawesome/free-solid-svg-icons";

import { Button } from "@/components/ui/button";
import { Modal } from "../ui/modal";
import {
  fetchConversations,
  fetchConversation,
  createNewConversation,
  addMessageToConversation,
  type Message as ServiceMessage,
  type Conversation,
  getAIResponseFromEdge,
  getPredictedResponses
} from "@/services/conversation-service";
import { useAuth } from "@/contexts/auth-context";
import { ChatMessageItem } from "./chat-message-item";
import { ChatSuggestions } from "./chat-suggestions";
import { supabase } from "@/lib/supabase";
import { useCookie } from "@/utils/use-cookie";
import { sanitizeCourse } from "@/utils/sanitize-course";

const INITIAL_SUGGESTIONS = ["Start"];

interface Message {
  content: string;
  role: "user" | "assistant";
  timestamp: number;
  chat_session_id: string;
  userId?: string;
  metadata?: Record<string, any>;
}
const MAX_TIME_TO_SHOW_LOADING = 8;


export function ChatInterface() {
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [suggestedResponses, setSuggestedResponses] = useState<string[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const { getCookie, setCookie } = useCookie();

  // --- Guest Conversation Utilities ---
  // State for client values with consistent initial SSR values
  const [guestSessionId, setGuestSessionId] = useState("");
  
  // Initialize client-side values after hydration
  useEffect(() => {
    // This will only run on the client after hydration
    let id = getCookie("paw-fi-guest-session-id");
    if (!id) {
      id = crypto.randomUUID();
      setCookie("paw-fi-guest-session-id", id, { days: 365, path: "/", sameSite: "Lax" });
    }
    setGuestSessionId(id);
  }, []);
  
  function getGuestSessionId(): string {
    return guestSessionId;
  }
  function guestMessagesKey() {
    return `paw-fi-guest-messages-${getGuestSessionId()}`;
  }
  // Initialize messages state with empty array for SSR
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  
  // Load messages from localStorage after component mounts
  useEffect(() => {
    loadGuestMessages();
  }, []);
  
  function loadGuestMessages(): Message[] {
    // During SSR or initial render, return the state
    if (typeof window === "undefined") return localMessages;
    try {
      const raw = getCookie(guestMessagesKey());
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
  function saveGuestMessages(messages: Message[]) {
    // Update local state first for consistent UI
    setLocalMessages(messages);
    
    // Skip localStorage operations during SSR
    if (typeof window === "undefined") return;
    
    try {
      setCookie(guestMessagesKey(), JSON.stringify(messages), { days: 365, path: "/", sameSite: "Lax" });
    } catch (error) {
      console.error("Error saving guest messages:", error);
    }
  }
  function clearGuestMessages() {
    // Update local state first for consistent UI
    setLocalMessages([]);
    
    // Skip cookie operations during SSR
    if (typeof window === "undefined") return;
    
    try {
      setCookie(guestMessagesKey(), "", { days: -1, path: "/", sameSite: "Lax" });
    } catch (error) {
      console.error("Error clearing guest messages:", error);
    }
  }
  
  // Server-stable timestamp to prevent hydration mismatches
  const [baseTimestamp] = useState(() => {
    // Use a consistent timestamp during SSR and initial client render
    return 1717000000000; // Fixed timestamp for SSR (May 30, 2024)
  });
  
  // Get a timestamp that's consistent between server and client
  // but still provides relative time differences for sorting
  function getConsistentTimestamp(): number {
    if (typeof window === "undefined") {
      // During SSR, use the base timestamp + a small increment for ordering
      return baseTimestamp;
    }
    // On client after hydration, use real timestamps
    return Date.now();
  }

  function acquireMergeLock(): boolean {
    if (typeof window === "undefined") return false;
    const now = getConsistentTimestamp();
    const lockKey = "paw-fi-chat-merge-lock";
    const lockVal = getCookie(lockKey);
    if (lockVal && now - parseInt(lockVal, 10) < 10000) return false; // 10s lock
    setCookie(lockKey, now.toString(), { days: 1, path: "/", sameSite: "Lax" });
    return true;
  }
  function releaseMergeLock() {
    if (typeof window === "undefined") return;
    setCookie("paw-fi-chat-merge-lock", "", { days: -1, path: "/", sameSite: "Lax" });
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
  const [loadingMessage, setLoadingMessage] = useState("Moneko is thinking...");
  const [loadingDuration, setLoadingDuration] = useState(0);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [pendingLessonJson, setPendingLessonJson] = useState<any>(null);
  const [recommendedCourse, setRecommendedCourse] = useState<any>(null);

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

  // Initialize query client for React Query
  const queryClient = useQueryClient();
  
  // Fetch all conversations
  const { 
    data: conversationsData,
    isLoading: isConversationsLoading,
    refetch: refetchConversations
  } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => fetchConversations(supabase),
    enabled: isAuthenticated,
    staleTime: 30000, // 30 seconds
  });
  
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

  // Fetch current conversation with messages
  const { 
    data: currentConversationData,
    isLoading: isConversationLoading,
    refetch: refetchConversation
  } = useQuery({
    queryKey: ['conversation', currentConversationId],
    queryFn: () => fetchConversation(supabase, currentConversationId),
    enabled: !!currentConversationId && isAuthenticated,
    staleTime: 10000, // 10 seconds
  });

  // Only sync messages from Supabase on initial load or when switching conversations
  const hasInitializedMessages = useRef<string | null>(null);
  useEffect(() => {
    if (
      isAuthenticated &&
      currentConversationId &&
      currentConversationData?.messages &&
      hasInitializedMessages.current !== currentConversationId
    ) {
      setMessages(currentConversationData.messages);
      hasInitializedMessages.current = currentConversationId;
    }
  }, [isAuthenticated, currentConversationId, currentConversationData]);

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: (params: { userId: string; sessionId: string; initialMessages?: Message[] }) => 
      createNewConversation(supabase, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  // Add message mutation
  const addMessageMutation = useMutation({
    mutationFn: (message: Message) => addMessageToConversation(supabase, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['conversation', currentConversationId] 
      });
    }
  });
  
  // Function to create a new conversation and send the first message
  async function handleCreateConversationAndSendMessage(
    userIdParam: string,
    firstMessageContent: string,
  ) {
    try {
      setIsSendingMessage(true);
      setIsLoading(true);
      setLoadingMessage("Creating conversation...");
      
      // Clear any existing timer
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
      }
      
      // Start a new timer to track loading duration
      loadingTimerRef.current = setInterval(() => {
        setLoadingDuration((prev) => prev + 1);
      }, 1000);

      // Create a new conversation
      const sessionId = getGuestSessionId();
      const result = await createConversationMutation.mutateAsync({
        userId: userIdParam,
        sessionId,
        initialMessages: [],
      });

      if (!result || !result.id) {
        throw new Error("Failed to create conversation");
      }

      const newConversationId = result.id;

      // Update local state
      if (typeof window !== "undefined") {
        localStorage.setItem("paw-fi-current-conversation", newConversationId);
      }

      // Add the user's message to the conversation
      const userMessage: Message = {
        content: firstMessageContent,
        role: "user",
        timestamp: getConsistentTimestamp(),
        chat_session_id: newConversationId,
        userId: userIdParam,
      };

      // Show user message immediately
      setMessages([userMessage]);
      setCurrentMessage("");
      inputRef.current?.focus();

      // Save the user message
      await addMessageMutation.mutateAsync(userMessage);

      // Fetch AI response
      setLoadingMessage("Moneko is thinking...");
      const aiResponse = await getAIResponseFromEdge(
        supabase,
        firstMessageContent,
        [{ role: userMessage.role, content: userMessage.content }],
        userIdParam
      );

      // Add AI response to conversation
      const assistantMessage: Message = {
        content: aiResponse.response || "I'm sorry, I couldn't generate a response.",
        role: "assistant",
        timestamp: getConsistentTimestamp(),
        chat_session_id: newConversationId,
        userId: userIdParam,
        metadata: aiResponse.generatedLessons ? { courseRecommendation: aiResponse.generatedLessons } : undefined,
      };

      // Save the assistant message
      await addMessageMutation.mutateAsync(assistantMessage);

      // Refresh the conversations list and current conversation
      await Promise.all([refetchConversations(), refetchConversation()]);

      // Update local state with the new messages
      setMessages([userMessage, assistantMessage]);

      // Check for course recommendation
      if (assistantMessage.metadata?.courseRecommendation) {
        setRecommendedCourse(assistantMessage.metadata.courseRecommendation);
      }
    } catch (error) {
      console.error("Error in handleCreateConversationAndSendMessage:", error);
      // Show error message to user
      const errorMsg: Message = {
        content: "Sorry, I couldn't start a new conversation. Please try again.",
        role: "assistant",
        timestamp: getConsistentTimestamp(),
        chat_session_id: currentConversationId || "error-conv",
        userId: userIdParam,
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
      setIsSendingMessage(false);
      setIsLoading(false);
      setLoadingMessage("Moneko is thinking...");
      setLoadingDuration(0);

      // Clear the loading timer
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    }
  }

  const authenticatedMessage =
    "Hi I'm Moneko! I'll help you learn about personal finance. Type 'start' to begin or ask me anything.";
  const baseWelcomeMessage = authenticatedMessage;

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
          // Use TanStack Query to fetch conversations
          await refetchConversations();
          const conversations = conversationsData || [];
          let session = conversations.find(
            (c: { user_id: string; id: string }) => c.user_id === user.id,
          );
          let sessionId = session?.id;
          if (!sessionId) {
            // Create new session with a new session id (reuse guest session id for continuity)
            sessionId = getGuestSessionId();
            const created = await createConversationMutation.mutateAsync({
              userId: user.id,
              sessionId,
              initialMessages: [],
            });
            sessionId = created.id;
          }
          // Fetch all existing messages for deduplication
          await refetchConversation();
          const conversationData = { messages: [] }; // Default empty if not available
          const existingMsgs = conversationData.messages || [];
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
            await addMessageMutation.mutateAsync({
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
        // Refresh conversation data
      } else {
        throw new Error("Failed to create conversation or get new ID.");
      }
      }
      },[isLoading])
  

  const handleSendMessage = async (content: string) => {
    setIsSendingMessage(true);
    if (!content.trim()) return;
    if (!isAuthenticated || !user?.id) {
      // --- Guest Flow ---
      const guestId = getGuestSessionId();
      const userMessage: Message = {
        content,
        role: "user",
        timestamp: getConsistentTimestamp(),
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
      setLoadingMessage("Moneko is thinking...");
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
          timestamp: getConsistentTimestamp(),
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
          timestamp: getConsistentTimestamp(),
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
        setLoadingMessage("Moneko is thinking...");
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
      timestamp: getConsistentTimestamp(),
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
    setLoadingMessage("Moneko is thinking...");
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
          user.id,
        );

        // Add the assistant response to the messages (optimistic update)
        const assistantMessage: Message = {
          content:
            response.response || "I'm sorry, I couldn't generate a response.",
          role: "assistant",
          timestamp: getConsistentTimestamp(),
          chat_session_id: currentConversationId,
        };
        setMessages((prevMessages) => {
          // Add and deduplicate
          const next = dedupeMessages([...prevMessages, assistantMessage]);
          next.sort((a, b) => a.timestamp - b.timestamp);
          return next;
        });
        setIsLoading(false); // Hide loading as soon as response is rendered
        setTimeout(() => scrollToBottom(), 100);
        // Save assistant message to database (do not refetch after)
        await addMessageMutation.mutateAsync(assistantMessage);
        setIsSendingMessage(false);
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
        timestamp: getConsistentTimestamp(),
        chat_session_id: currentConversationId,
        metadata: { isError: true },
      };
      setMessages((prevMessages) => {
        // Add and deduplicate
        const next = dedupeMessages([...prevMessages, errorMessage]);
        next.sort((a, b) => a.timestamp - b.timestamp);
        return next;
      });
      setIsSendingMessage(false);

      // No need to save this particular client-side error message to DB usually
    } finally {
      setIsLoading(false);
      setLoadingMessage("Moneko is thinking...");
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
        const sanitized = sanitizeCourse(json);
        const idx = text.indexOf(jsonBlockMatch[0]);
        return { json: sanitized, start: idx, end: idx + jsonBlockMatch[0].length };
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

  // Fetch suggested responses when the last message is from the assistant
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (messages.length > 0 &&!lastMsg?.content?.includes('```json')&& lastMsg?.role === 'assistant' && !isLoading) {
        setIsFetchingSuggestions(true);
        const lastMessage = messages[messages.length - 1];
        const contextMessages = messages.map(msg => ({ role: msg.role, content: msg.content }));
        try {
          const suggestions = await getPredictedResponses(supabase, lastMessage.content, contextMessages);
          setSuggestedResponses(suggestions);
          scrollToBottom();
        } catch (error) {
          console.error('Error fetching suggested responses:', error);
          setSuggestedResponses([]);
        } finally {
          setIsFetchingSuggestions(false);
        }
      } else {
        if(!isLoading&&!messages.length)
        {
          setSuggestedResponses(INITIAL_SUGGESTIONS);
        }
        else
        setSuggestedResponses([]);
      }
    };
    fetchSuggestions();
  }, [messages, isLoading]);

  // Handle clicking on a suggestion button
  const handleSuggestionClick = (suggestion: string) => {
    setCurrentMessage(suggestion);
    setSuggestedResponses([]);
    
    // Instantly send the message
    handleSendMessage(suggestion);
  };

  // Registration prompt logic
  const lastMsg = messages[messages.length - 1];
  const shouldPromptRegister =
    lastMsg?.content?.includes('```json') && !isAuthenticated;

  return (
    <div className={`flex flex-1 flex-col overflow-hidden bg-gray-50 shadow-lg dark:bg-gray-900 ${shouldPromptRegister ? 'pointer-events-none select-none opacity-80' : ''}`}>
      <div
        ref={chatContainerRef}
        className="h-full flex-1 overflow-y-scroll p-2 md:p-6"
        id="chat-messages-container"
        onScroll={handleScroll}
      >
        <div className="mx-auto">
          {isBackendProcessing && (
            <div className="space-y-4 pt-6">
              {[1, 2, 3, 4,5].map((i) => (
                <div
                  key={i}
                  className={`flex animate-pulse ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`w-3/5 rounded-lg p-3 ${i % 2 === 0 ? "bg-purple-200 dark:bg-purple-700" : "bg-gray-200 dark:bg-gray-700"}`}
                  >
                    <div
                      className={`mb-1.5 h-4 rounded ${i % 2 === 0 ? "bg-purple-300 dark:bg-primary" : "bg-gray-300 dark:bg-gray-600"} w-3/4`}
                    ></div>
                    <div
                      className={`h-4 rounded ${i % 2 === 0 ? "bg-purple-300 dark:bg-primary" : "bg-gray-300 dark:bg-gray-600"} w-full`}
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
                navigate={navigate}
              />
            );
          })}

          <div
            ref={messagesEndRef}
            id="messages-end-ref"
            style={{ height: "1px", float: "left", clear: "both" }}
          />

          {/* Modal overlay for registration prompt using reusable Modal */}
          <Modal
            isOpen={shouldPromptRegister}
            onClose={() => {}}
            disableOverlayClick={true}
            overlayClassName="bg-black/40"
            contentClassName="relative flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-900 rounded-2xl border border-primary/30 shadow-2xl w-[90vw] max-w-md mx-auto pointer-events-auto"
          >
            <div className="flex flex-col items-center w-full">
    <div className="mb-4 flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary/80 to-primary/50 rounded-full shadow-lg">
    <FontAwesomeIcon icon={faGraduationCap} className="text-white text-3xl" />
  </div>
  <h2 className="text-2xl font-bold text-primary mb-2 text-center drop-shadow-sm">Your personalized lesson is ready!</h2>
  <p className="text-gray-700 dark:text-gray-200 mb-3 text-center text-base font-medium">
    Register a free account to view this personalized lesson and access more features.
  </p>
    <div className="mb-8 w-full max-w-md mx-auto bg-white/80 dark:bg-gray-800/80 rounded-2xl border border-primary/20 shadow-lg px-6 py-4 flex flex-col gap-2 backdrop-blur-sm">
    <ul className="text-gray-700 dark:text-gray-200 text-base list-disc pl-5 space-y-2">
      <li><span className="font-semibold text-primary">Access</span> your saved chats and history on any device</li>
      <li><span className="font-semibold text-primary">Get unlimited</span> personalized lessons and financial tools</li>
      <li><span className="font-semibold text-primary">We respect your privacy</span>—no spam, ever</li>
    </ul>
  </div>
  <div className="w-full flex flex-col gap-2">
    <Link to="/register" className="w-full">
      <Button fullWidth className="!bg-primary !text-white !font-bold !py-3 !rounded-xl !shadow-lg hover:!bg-primary/90 transition">
        Register for Free
      </Button>
    </Link>
  </div>
</div>

          </Modal>

          {isLoading &&
            messages.length > 0 &&
            !messages[messages.length - 1]?.metadata?.isStreaming && (
              <div className="flex justify-start pt-2">
                <div className="max-w-[80%] h-20 rounded-lg border border-gray-200/80 bg-white p-3 shadow-sm transition-all duration-300 ease-in-out dark:border-gray-700 dark:bg-gray-800">
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
            <ChatSuggestions
              suggestions={suggestedResponses}
              onSuggestionClick={handleSuggestionClick}
              isLoading={isLoading}
              isSendingMessage={isSendingMessage}
            />
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <input
                ref={inputRef}
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder={shouldPromptRegister ? "Register to continue..." : "Type your message..."}
                className="w-full flex-grow resize-none overflow-y-hidden rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
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
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary p-0 text-white transition-all duration-150 ease-in-out hover:bg-primary/80 focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 disabled:bg-gray-300 disabled:hover:bg-gray-300 dark:disabled:bg-gray-600 dark:disabled:hover:bg-gray-600"
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
