"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGraduationCap } from "@fortawesome/free-solid-svg-icons";

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
import { AnimatePresence, motion } from "framer-motion";
import { useFinancialHealthProfile, formatProfileForAI, FinancialHealthProfile } from "@/hooks/use-financial-health-profile";

import { ChatMessageItem } from "./chat-message-item";
import { ChatSuggestions } from "./chat-suggestions";
import { supabase } from "@/lib/supabase";
import { useCookie } from "@/utils/use-cookie";
import { sanitizeCourse } from "@/utils/sanitize-course";
import logo from "@/assets/images/icon.svg";
import { ChatInput } from './chat-input';
import { VoiceConversationModal } from './voice-conversation-modal';
import { BetaPill } from "../ui/beta-pill";
import { FinancialHealthQuiz } from "@/components/financial-health/FinancialHealthQuiz";

const INITIAL_SUGGESTIONS = ["Start"];
const MAX_TIME_TO_SHOW_LOADING = 9;
const MAX_GUEST_MESSAGES = 100; // Limit guest messages to prevent cookie overflow
const MESSAGE_MERGE_BATCH_SIZE = 10; // Batch size for merging messages

interface Message {
  content: string;
  role: "user" | "assistant";
  timestamp: number;
  chat_session_id: string;
  userId?: string;
  metadata?: Record<string, any>;
}

interface ChatInterfaceProps {
  initialQuestion?: string;
}

export const iconContainer = (size: string = "size-8") => {
  return (
    <div className="relative flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500">
      <img src={logo} alt="Moneko AI" className={size} />
    </div>
  );
};

export function ChatInterface({ initialQuestion = '' }: ChatInterfaceProps) {
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [suggestedResponses, setSuggestedResponses] = useState<string[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const { getCookie, setCookie } = useCookie();
  const [isVoiceModalOpen, setVoiceModalOpen] = useState(false);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);

    // Initialize query client for React Query
    const queryClient = useQueryClient();

      // Initialize messages state with empty array for SSR
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const { user, isLoading: isAuthLoading } = useAuth();
  const isAuthenticated = !!user;

    // --- Guest Conversation Utilities ---
    const [guestSessionId, setGuestSessionId] = useState("");
    const [isClientInitialized, setIsClientInitialized] = useState(false);
  
  
    // Fetch all conversations
    const { 
      data: conversationsData,
      isLoading: isConversationsLoading,
      refetch: refetchConversations,
      error: conversationsError
    } = useQuery({
      queryKey: ['conversations'],
      queryFn: () => fetchConversations(supabase),
      enabled: isAuthenticated && isClientInitialized,
      staleTime: 30000,
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    });


  
  // Error states for better UX
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Initialize client-side values after hydration
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    let id = getCookie("paw-fi-guest-session-id");
    if (!id) {
      id = crypto.randomUUID();
      setCookie("paw-fi-guest-session-id", id, { days: 365, path: "/", sameSite: "Lax" });
    }
    setGuestSessionId(id);
    setIsClientInitialized(true);
  }, [getCookie, setCookie]);
  
  const getGuestSessionId = useCallback((): string => {
    return guestSessionId;
  }, [guestSessionId]);
  
  const guestMessagesKey = useCallback(() => {
    return `paw-fi-guest-messages-${getGuestSessionId()}`;
  }, [getGuestSessionId]);
  

  // Track initialization states
  const [hasLoadedInitialMessages, setHasLoadedInitialMessages] = useState(false);
  const [hasProcessedUrlQuery, setHasProcessedUrlQuery] = useState(false);
  
  // Function to compress and decompress messages for cookie storage
  const compressMessages = (messages: Message[]): string => {
    // Simple compression: store only essential fields
    const compressed = messages.map(m => ({
      c: m.content,
      r: m.role === "user" ? "u" : "a",
      t: Math.floor(m.timestamp / 1000), // Store seconds instead of milliseconds
      m: m.metadata
    }));
    return JSON.stringify(compressed);
  };
  
  const decompressMessages = (compressed: string): Message[] => {
    try {
      const parsed = JSON.parse(compressed);
      return parsed.map((m: any) => ({
        content: m.c,
        role: m.r === "u" ? "user" : "assistant",
        timestamp: m.t * 1000,
        chat_session_id: getGuestSessionId(),
        metadata: m.m
      }));
    } catch {
      return [];
    }
  };
  
  const loadGuestMessages = useCallback((): Message[] => {
    if (typeof window === "undefined") return localMessages;
    try {
      const raw = getCookie(guestMessagesKey());
      return raw ? decompressMessages(raw) : [];
    } catch (error) {
      console.error("Error loading guest messages:", error);
      return [];
    }
  }, [getCookie, guestMessagesKey, localMessages]);
  
  const saveGuestMessages = useCallback((messages: Message[]) => {
    setLocalMessages(messages);
    
    if (typeof window === "undefined") return;
    
    try {
      // Limit the number of messages to prevent cookie overflow
      const messagesToSave = messages.slice(-MAX_GUEST_MESSAGES);
      const compressed = compressMessages(messagesToSave);
      
      // Check if compressed size is reasonable (cookies have ~4KB limit)
      if (compressed.length > 3500) {
        // If still too large, save fewer messages
        const fewerMessages = messagesToSave.slice(-Math.floor(MAX_GUEST_MESSAGES / 2));
        setCookie(guestMessagesKey(), compressMessages(fewerMessages), { days: 365, path: "/", sameSite: "Lax" });
      } else {
        setCookie(guestMessagesKey(), compressed, { days: 365, path: "/", sameSite: "Lax" });
      }
    } catch (error) {
      console.error("Error saving guest messages:", error);
      setConnectionError("Failed to save chat history. Some messages may be lost.");
    }
  }, [guestMessagesKey, setCookie]);
  
  const clearGuestMessages = useCallback(() => {
    setLocalMessages([]);
    
    if (typeof window === "undefined") return;
    
    try {
      setCookie(guestMessagesKey(), "", { days: -1, path: "/", sameSite: "Lax" });
    } catch (error) {
      console.error("Error clearing guest messages:", error);
    }
  }, [guestMessagesKey, setCookie]);
  
  // Load messages from localStorage after component mounts
  useEffect(() => {
    if (!isClientInitialized || hasLoadedInitialMessages) return;
    
    const savedMessages = loadGuestMessages();
    setLocalMessages(savedMessages);
    
    // For guest users, set the main messages state from cookies
    if (!isAuthenticated && !isAuthLoading) {
      setMessages(savedMessages);
      setHasLoadedInitialMessages(true);
    }
    // For authenticated users, mark as loaded if no conversations exist
    else if (isAuthenticated && !isAuthLoading && !isConversationsLoading) {
      if (!conversationsData || conversationsData.length === 0) {
        setHasLoadedInitialMessages(true);
      }
    }
  }, [isAuthenticated, isAuthLoading, isClientInitialized, hasLoadedInitialMessages, loadGuestMessages, isConversationsLoading, conversationsData]);
  
  // Server-stable timestamp to prevent hydration mismatches
  const getConsistentTimestamp = useCallback((): number => {
    if (typeof window === "undefined") {
      return 1717000000000; // Fixed timestamp for SSR
    }
    return Date.now();
  }, []);

  const acquireMergeLock = useCallback((): boolean => {
    if (typeof window === "undefined") return false;
    const now = getConsistentTimestamp();
    const lockKey = "paw-fi-chat-merge-lock";
    const lockVal = getCookie(lockKey);
    if (lockVal && now - parseInt(lockVal, 10) < 10000) return false;
    setCookie(lockKey, now.toString(), { days: 1, path: "/", sameSite: "Lax" });
    return true;
  }, [getCookie, setCookie, getConsistentTimestamp]);
  
  const releaseMergeLock = useCallback(() => {
    if (typeof window === "undefined") return;
    setCookie("paw-fi-chat-merge-lock", "", { days: -1, path: "/", sameSite: "Lax" });
  }, [setCookie]);
  
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [pendingLessonJson, setPendingLessonJson] = useState<any>(null);
  const [recommendedCourse, setRecommendedCourse] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Moneko is thinking...");
  const [loadingDuration, setLoadingDuration] = useState(0);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Load financial health profile for authenticated users
  const { profile, isLoading: isProfileLoading, error: profileError, hasProfile, refetch: refetchProfile } = useFinancialHealthProfile(user?.id);
  
  // Track merge state
  const [hasMergedGuest, setHasMergedGuest] = useState(false);
  const [isMergingGuestToAuth, setIsMergingGuestToAuth] = useState(false);
  const mergeRetryCount = useRef(0);
  const MAX_MERGE_RETRIES = 3;


  
  const conversations = useMemo(
    () => conversationsData || [],
    [conversationsData],
  );

  const currentConversationId = useMemo(() => {
    if (!conversations.length) return null;
    
    const storedConvId = typeof window !== "undefined"
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
    refetch: refetchConversation,
    error: conversationError
  } = useQuery({
    queryKey: ['conversation', currentConversationId],
    queryFn: () => fetchConversation(supabase, currentConversationId!),
    enabled: !!currentConversationId && isAuthenticated && isClientInitialized,
    staleTime: 10000,
    retry: 3,
  });

  // Handle connection errors
  useEffect(() => {
    if (conversationsError || conversationError) {
      setConnectionError("Having trouble connecting. Your messages are saved locally.");
    } else {
      setConnectionError(null);
    }
  }, [conversationsError, conversationError]);

  // Sync messages from Supabase
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
      setHasLoadedInitialMessages(true);
    }
  }, [isAuthenticated, currentConversationId, currentConversationData, isMergingGuestToAuth]);

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: (params: { userId: string; sessionId: string; initialMessages?: Message[] }) => 
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
  
  // Improved deduplication function
  const dedupeMessages = useCallback((messages: Message[]): Message[] => {
    const seen = new Map<string, Message>();
    
    for (const msg of messages) {
      // Create a robust key that includes content hash
      const contentHash = msg.content.split('').reduce(
        (acc, char) => (acc * 31 + char.charCodeAt(0)) & 0xffffffff,
        0
      );
      const key = `${msg.role}|${contentHash}|${Math.floor(msg.timestamp / 1000)}`;
      
      if (!seen.has(key)) {
        seen.set(key, msg);
      }
    }
    
    return Array.from(seen.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, []);

  // Scroll management
  const handleScroll = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const threshold = 100;
    const atBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    setAutoScroll(atBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, []);

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll || isLoading) {
      const timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [messages, isLoading, autoScroll, scrollToBottom]);

  // Guest to Auth Migration with retry logic
  useEffect(() => {
    if (!isAuthenticated || !isClientInitialized || !user?.id || hasMergedGuest || isMergingGuestToAuth || isAuthLoading) {
      return;
    }

    const guestMsgs = loadGuestMessages();
    if (guestMsgs.length === 0) {
      setHasMergedGuest(true);
      return;
    }

    // Wait for initial data to load
    if (isConversationsLoading || (currentConversationId && isConversationLoading)) {
      return;
    }

    if (!acquireMergeLock()) return;
    
    setIsMergingGuestToAuth(true);
    setMergeError(null);
    
    (async () => {
      try {
        let sessionId = currentConversationId;
        
        if (!sessionId) {
          // Create new conversation
          const created = await createConversationMutation.mutateAsync({
            userId: user.id,
            sessionId: getGuestSessionId(),
            initialMessages: [],
          });
          sessionId = created.id;
          
          if (typeof window !== "undefined") {
            localStorage.setItem("paw-fi-current-conversation", sessionId);
          }
        }

        // Batch merge messages for better performance
        const messagesToMerge = [...guestMsgs];
        const batches = [];
        
        for (let i = 0; i < messagesToMerge.length; i += MESSAGE_MERGE_BATCH_SIZE) {
          batches.push(messagesToMerge.slice(i, i + MESSAGE_MERGE_BATCH_SIZE));
        }

        for (const batch of batches) {
          await Promise.all(
            batch.map(msg => 
              addMessageMutation.mutateAsync({
                ...msg,
                chat_session_id: sessionId!,
                userId: user.id,
              })
            )
          );
        }

        // Refresh data and verify messages were saved
        await Promise.all([
          refetchConversations(),
          refetchConversation()
        ]);

        // Double-check that messages were actually saved before clearing
        const verifyData = await refetchConversation();
        const savedMessagesCount = verifyData?.data?.messages?.length || 0;
        
        if (savedMessagesCount >= guestMsgs.length) {
          // Safe to clear guest messages - they're in the database
          clearGuestMessages();
          setHasMergedGuest(true);
          mergeRetryCount.current = 0;
        } else {
          throw new Error(`Expected ${guestMsgs.length} messages, but only ${savedMessagesCount} were saved`);
        }
        
      } catch (err) {
        console.error("Error merging guest messages:", err);
        
        // Retry logic
        if (mergeRetryCount.current < MAX_MERGE_RETRIES) {
          mergeRetryCount.current++;
          setMergeError(`Retrying merge (${mergeRetryCount.current}/${MAX_MERGE_RETRIES})...`);
          setTimeout(() => {
            setIsMergingGuestToAuth(false);
            releaseMergeLock();
          }, 2000 * mergeRetryCount.current);
        } else {
          setMergeError("Failed to sync chat history. Your messages are saved locally.");
          // Don't clear guest messages on failure
        }
      } finally {
        if (mergeRetryCount.current === 0 || mergeRetryCount.current >= MAX_MERGE_RETRIES) {
          setIsMergingGuestToAuth(false);
          releaseMergeLock();
        }
      }
    })();
  }, [
    isAuthenticated,
    isClientInitialized,
    hasMergedGuest,
    isMergingGuestToAuth,
    isAuthLoading,
    user,
    currentConversationId,
    isConversationsLoading,
    isConversationLoading,
    acquireMergeLock,
    releaseMergeLock,
    loadGuestMessages,
    clearGuestMessages,
    getGuestSessionId,
    createConversationMutation,
    addMessageMutation,
    refetchConversations,
    refetchConversation,
  ]);

  // Function to clean URL parameters after processing
  const cleanUrlParameters = useCallback(() => {
    if (typeof window !== "undefined" && initialQuestion) {
      // Remove the 'q' parameter from URL without causing navigation
      const url = new URL(window.location.href);
      url.searchParams.delete('q');
      window.history.replaceState({}, '', url.toString());
    }
  }, [initialQuestion]);

  // Handle initial question from URL - only execute if no chat history exists
  useEffect(() => {
    if (!initialQuestion || !isClientInitialized || hasProcessedUrlQuery) {
      return;
    }

    // For authenticated users, wait for data and merge to complete
    if (isAuthenticated) {
      if (isAuthLoading || isMergingGuestToAuth || isConversationsLoading || !hasLoadedInitialMessages) {
        return;
      }
      
      // Only execute initial question if NO chat history exists and question doesn't already exist
      const hasExistingMessages = messages.length > 0;
      const questionExists = messages.some(msg => 
        msg.role === 'user' && msg.content.trim() === initialQuestion.trim()
      );
      
      if (!hasExistingMessages && !questionExists && user?.id) {
        setHasProcessedUrlQuery(true);
        cleanUrlParameters();
        if (currentConversationId) {
          handleSendMessage(initialQuestion);
        } else {
          handleCreateConversationAndSendMessage(user.id, initialQuestion);
        }
      } else {
        // Chat history already exists, just clean the URL and don't send message
        setHasProcessedUrlQuery(true);
        cleanUrlParameters();
      }
    } else if (!isAuthLoading && hasLoadedInitialMessages) {
      // For guest users - wait for messages to be loaded, then check if history exists
      const hasExistingMessages = messages.length > 0;
      const questionExists = messages.some(msg => 
        msg.role === 'user' && msg.content.trim() === initialQuestion.trim()
      );
      
      if (!hasExistingMessages && !questionExists) {
        setHasProcessedUrlQuery(true);
        cleanUrlParameters();
        handleSendMessage(initialQuestion);
      } else {
        // Chat history already exists, just clean the URL and don't send message
        setHasProcessedUrlQuery(true);
        cleanUrlParameters();
      }
    }
  }, [
    initialQuestion,
    isClientInitialized,
    hasProcessedUrlQuery,
    isAuthenticated,
    isAuthLoading,
    isMergingGuestToAuth,
    isConversationsLoading,
    hasLoadedInitialMessages,
    messages,
    localMessages,
    user?.id,
    currentConversationId,
    cleanUrlParameters,
  ]);

  // Update loading message based on duration
  useEffect(() => {
    if (loadingDuration === MAX_TIME_TO_SHOW_LOADING) {
      setLoadingMessage("Crafting your personalized financial lessons... 📚");
    } else if (loadingDuration === MAX_TIME_TO_SHOW_LOADING + 15) {
      setLoadingMessage("Building knowledge blocks just for you! Almost there... 🧩");
    } else if (loadingDuration === MAX_TIME_TO_SHOW_LOADING + 30) {
      setLoadingMessage("Creating something special! Your financial wisdom is on the way... ✨");
    } else if (loadingDuration === MAX_TIME_TO_SHOW_LOADING + 45) {
      setLoadingMessage("Almost done! Did you know? Small, consistent steps lead to big financial growth. 🌱");
    }
  }, [loadingDuration]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
      }
    };
  }, []);

  // Check for lesson JSON in messages
  useEffect(() => {
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
  }, [messages, isAuthenticated]);

  // Persist currentConversationId
  useEffect(() => {
    if (currentConversationId && typeof window !== "undefined") {
      localStorage.setItem("paw-fi-current-conversation", currentConversationId);
    }
  }, [currentConversationId]);

  const handleQuizComplete = async (profile: Pick<FinancialHealthProfile, 'profile_description' | 'profile_data'>) => {
    setIsQuizModalOpen(false);
    handleSendMessage("I've completed the questionnaire", profile);
  };

  const handleOpenQuizModal = () => {
    setIsQuizModalOpen(true);
  };

  const handleCreateConversationAndSendMessage = async (
    userIdParam: string,
    firstMessageContent: string,
  ) => {
    try {
      setIsSendingMessage(true);
      setIsLoading(true);
      setLoadingMessage("Creating conversation...");
      
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
      }
      
      loadingTimerRef.current = setInterval(() => {
        setLoadingDuration((prev) => prev + 1);
      }, 1000);

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

      if (typeof window !== "undefined") {
        localStorage.setItem("paw-fi-current-conversation", newConversationId);
      }

      const userMessage: Message = {
        content: firstMessageContent,
        role: "user",
        timestamp: getConsistentTimestamp(),
        chat_session_id: newConversationId,
        userId: userIdParam,
      };

      setMessages([userMessage]);

      await addMessageMutation.mutateAsync(userMessage);

      setLoadingMessage("Moneko is thinking...");
      const profileContext = profile ? formatProfileForAI(profile) : undefined;
      const aiResponse = await getAIResponseFromEdge(
        supabase,
        firstMessageContent,
        [{ role: userMessage.role, content: userMessage.content }],
        userIdParam,
        profileContext
      );

      const assistantMessage: Message = {
        content: aiResponse.response || "I'm sorry, I couldn't generate a response.",
        role: "assistant",
        timestamp: getConsistentTimestamp(),
        chat_session_id: newConversationId,
        userId: userIdParam,
        metadata: aiResponse.generatedLessons ? { courseRecommendation: aiResponse.generatedLessons } : undefined,
      };

      await addMessageMutation.mutateAsync(assistantMessage);

      await Promise.all([refetchConversations(), refetchConversation()]);

      setMessages([userMessage, assistantMessage]);

      if (assistantMessage.metadata?.courseRecommendation) {
        setRecommendedCourse(assistantMessage.metadata.courseRecommendation);
      }
    } catch (error) {
      console.error("Error in handleCreateConversationAndSendMessage:", error);
      const errorMsg: Message = {
        content: "Sorry, I couldn't start a new conversation. Please try again.",
        role: "assistant",
        timestamp: getConsistentTimestamp(),
        chat_session_id: currentConversationId || "error-conv",
        userId: userIdParam,
        metadata: { isError: true },
      };
      
      setMessages((prev) => dedupeMessages([...prev, errorMsg]));
    } finally {
      setIsSendingMessage(false);
      setIsLoading(false);
      setLoadingMessage("Moneko is thinking...");
      setLoadingDuration(0);

      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
      setTimeout(() => scrollToBottom(), 100);
    }
  };

  const handleSendMessage = async (content: string, manual_profile?: Pick<FinancialHealthProfile, 'profile_description' | 'profile_data'>) => {
    if (!content.trim() || isSendingMessage) return;
    
    setIsSendingMessage(true);
    setConnectionError(null);

    if (!isAuthenticated || !user?.id) {
      // Guest Flow
      const guestId = getGuestSessionId();
      const userMessage: Message = {
        content,
        role: "user",
        timestamp: getConsistentTimestamp(),
        chat_session_id: guestId,
      };

      setMessages((prev) => {
        const next = dedupeMessages([...prev, userMessage]);
        saveGuestMessages(next);
        return next;
      });

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
        const contextMessages = [...messages, userMessage].map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

        const response = await getAIResponseFromEdge(
          supabase,
          content,
          contextMessages,
          undefined,
          ""
        );

        const assistantMessage: Message = {
          content: response.response || "I'm sorry, I couldn't generate a response.",
          role: "assistant",
          timestamp: getConsistentTimestamp(),
          chat_session_id: guestId,
        };

        setMessages((prev) => {
          const next = dedupeMessages([...prev, assistantMessage]);
          saveGuestMessages(next);
          return next;
        });
      } catch (error) {
        console.error("Error getting AI response:", error);
        const errorMessage: Message = {
          content: "Sorry, I had trouble connecting. Please check your connection or try again.",
          role: "assistant",
          timestamp: getConsistentTimestamp(),
          chat_session_id: guestId,
          metadata: { isError: true },
        };

        setMessages((prev) => {
          const next = dedupeMessages([...prev, errorMessage]);
          saveGuestMessages(next);
          return next;
        });
        setConnectionError("Connection error. Your messages are saved locally.");
      } finally {
        setIsLoading(false);
        setIsSendingMessage(false);
        setLoadingMessage("Moneko is thinking...");
        setLoadingDuration(0);
        if (loadingTimerRef.current) {
          clearInterval(loadingTimerRef.current);
          loadingTimerRef.current = null;
        }
        setTimeout(() => scrollToBottom(), 100);
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

    setMessages((prev) => dedupeMessages([...prev, userMessage]));
    setTimeout(() => scrollToBottom(), 50);

    setIsLoading(true);
    setLoadingMessage("Moneko is thinking...");
    setLoadingDuration(0);

    if (loadingTimerRef.current) {
      clearInterval(loadingTimerRef.current);
    }

    loadingTimerRef.current = setInterval(() => {
      setLoadingDuration((prev) => prev + 1);
    }, 1000);

    try {
      await addMessageMutation.mutateAsync(userMessage);

      const contextMessages = [...messages, userMessage].map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const current_profile = manual_profile || profile || undefined;
      const profileContext = formatProfileForAI(current_profile);
      
      const response = await getAIResponseFromEdge(
        supabase,
        content,
        contextMessages,
        user.id,
        profileContext
      );

      const assistantMessage: Message = {
        content: response.response || "I'm sorry, I couldn't generate a response.",
        role: "assistant",
        timestamp: getConsistentTimestamp(),
        chat_session_id: currentConversationId,
        userId: user.id,
        metadata: response.generatedLessons ? { courseRecommendation: response.generatedLessons } : undefined,
      };

      setMessages((prev) => dedupeMessages([...prev, assistantMessage]));
      setIsLoading(false);
      setTimeout(() => scrollToBottom(), 100);

      await addMessageMutation.mutateAsync(assistantMessage);

      if (assistantMessage.metadata?.courseRecommendation) {
        setRecommendedCourse(assistantMessage.metadata.courseRecommendation);
      }
    } catch (error) {
      console.error("Error processing message:", error);
      const errorMessage: Message = {
        content: "Sorry, I had trouble connecting. Please check your connection or try again.",
        role: "assistant",
        timestamp: getConsistentTimestamp(),
        chat_session_id: currentConversationId,
        userId: user.id,
        metadata: { isError: true },
      };

      setMessages((prev) => dedupeMessages([...prev, errorMessage]));
      setConnectionError("Connection error. Retrying...");
    } finally {
      setIsLoading(false);
      setIsSendingMessage(false);
      setLoadingMessage("Moneko is thinking...");
      setLoadingDuration(0);

      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
      
      refetchConversation();
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

  const isBackendProcessing = useMemo(
    () =>
      !!(isMergingGuestToAuth ||
        isConversationsLoading ||
        (currentConversationId && isConversationLoading) ||
        (isAuthenticated && isProfileLoading)) &&
      messages.length === 0,
    [
      isMergingGuestToAuth,
      isConversationsLoading,
      currentConversationId,
      isConversationLoading,
      isAuthenticated,
      isProfileLoading,
      messages,
    ],
  );

  // Fetch suggested responses
  useEffect(() => {
    const fetchSuggestions = async () => {
      const lastMsg = messages[messages.length - 1];
      if (messages.length > 0 && !lastMsg?.content?.includes('```json') && lastMsg?.role === 'assistant' && !isLoading) {
        setIsFetchingSuggestions(true);
        const contextMessages = messages.map(msg => ({ role: msg.role, content: msg.content }));
        try {
          const suggestions = await getPredictedResponses(supabase, lastMsg.content, contextMessages);
          setSuggestedResponses(suggestions);
          scrollToBottom();
        } catch (error) {
          console.error('Error fetching suggested responses:', error);
          setSuggestedResponses([]);
        } finally {
          setIsFetchingSuggestions(false);
        }
      } else if (!isLoading && !messages.length && !isBackendProcessing) {
        setSuggestedResponses(INITIAL_SUGGESTIONS);
      } else {
        setSuggestedResponses([]);
      }
    };
    fetchSuggestions();
  }, [messages, isLoading, isBackendProcessing, scrollToBottom]);

  const handleSuggestionClick = (suggestion: string) => {
    setSuggestedResponses([]);
    handleSendMessage(suggestion);
  };

  const authenticatedMessage = "Hi I'm Moneko! I'll help you learn about personal finance. Type 'start' to begin or ask me anything.";
  const baseWelcomeMessage = authenticatedMessage;

  // Registration prompt logic
  const lastMsg = messages[messages.length - 1];
  const shouldPromptRegister = lastMsg?.content?.includes('```json') && !isAuthenticated;

  return (
    <div className="flex w-full flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/20">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500">
            {iconContainer()}
            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white/50" />
          </div>
          <div className="relative flex h-full flex-col">
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Moneko AI</h1>
          </div>
          <BetaPill />
        </div>
      </div>

      {/* Error Messages */}
      {(connectionError || mergeError) && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {connectionError || mergeError}
          </p>
        </div>
      )}

      {/* Messages Area */}
      <div 
        id="messages" 
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth" 
        ref={chatContainerRef} 
        onScroll={handleScroll}
      >
        {isBackendProcessing && (
          <div className="space-y-6 p-4 sm:p-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`flex animate-pulse items-end gap-3 ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
              >
                {i % 2 !== 0 && (
                  <div className="h-10 w-10 shrink-0 rounded-full bg-slate-200/80 dark:bg-slate-700/80"></div>
                )}
                <div
                  className={`w-3/5 rounded-2xl p-4 ${
                    i % 2 === 0 
                      ? "rounded-br-none bg-gradient-to-br from-purple-400/50 to-indigo-500/50" 
                      : "rounded-bl-none bg-slate-200/80 dark:bg-slate-700/80"
                  }`}
                >
                  <div
                    className={`mb-2 h-4 rounded ${
                      i % 2 === 0 
                        ? "bg-purple-300/50 dark:bg-purple-600/50" 
                        : "bg-slate-300/50 dark:bg-slate-600/50"
                    } w-3/4`}
                  ></div>
                  <div
                    className={`h-4 rounded ${
                      i % 2 === 0 
                        ? "bg-purple-300/50 dark:bg-purple-600/50" 
                        : "bg-slate-300/50 dark:bg-slate-600/50"
                    } w-full`}
                  ></div>
                </div>
                {i % 2 === 0 && (
                  <div className="h-10 w-10 shrink-0 rounded-full bg-slate-200/80 dark:bg-slate-700/80"></div>
                )}
              </div>
            ))}
          </div>
        )}

        {!isBackendProcessing && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 dark:text-slate-400">
            <div className="mb-4 rounded-full bg-white/30 p-4 backdrop-blur-md dark:bg-slate-800/30">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mx-auto h-16 w-16 text-slate-400 dark:text-slate-500"
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
            </div>
            <p className="text-lg font-medium">{baseWelcomeMessage}</p>
            <p className="text-sm text-slate-400 dark:text-slate-500">Ask me anything to get started!</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((message, index) => {
            const contentHash =
              message.content.length > 0
                ? message.content
                    .split("")
                    .reduce(
                      (acc, char) =>
                        (acc * 31 + char.charCodeAt(0)) & 0xffffffff,
                      0,
                    )
                : 0;
            return (
              <motion.div
                key={`${message.timestamp}-${message.role}-${contentHash}`}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
              >
                <ChatMessageItem 
                  message={message} 
                  formatTime={formatTime} 
                  extractFirstJson={extractFirstJson}
                  navigate={navigate}
                  onOpenQuizModal={handleOpenQuizModal}
                />
              </motion.div>
            );
          })}

          {isLoading && !messages[messages.length - 1]?.metadata?.isStreaming && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: [0.19, 1, 0.22, 1] }}
            >
              <div className="flex justify-start">
                <div className="flex items-center gap-3 max-w-xs lg:max-w-md">
                  <div className="relative flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 shrink-0">
                    {iconContainer("size-6")}
                  </div>
                  <div className="bg-white/80 dark:bg-slate-700 rounded-2xl p-4">
                    <div className="flex items-center space-x-3">
                      {loadingDuration >= MAX_TIME_TO_SHOW_LOADING ? (
                        <div className="text-slate-600 dark:text-slate-300 text-sm animate-pulse">
                          {loadingMessage}
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <div className="h-2 w-2 animate-pulse rounded-full bg-slate-400 [animation-delay:-0.3s]"></div>
                          <div className="h-2 w-2 animate-pulse rounded-full bg-slate-400 [animation-delay:-0.15s]"></div>
                          <div className="h-2 w-2 animate-pulse rounded-full bg-slate-400"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions and Input */}
      {(!messages[messages.length - 1]?.content?.includes('``QUESTIONNAIRE``') || hasProfile) && (
        <ChatSuggestions
          suggestions={suggestedResponses}
          onSuggestionClick={handleSuggestionClick}
          isLoading={isLoading}
          isSendingMessage={isSendingMessage}
        />
      )}

      <ChatInput 
        onSendMessage={handleSendMessage} 
        isLoading={isLoading || shouldPromptRegister || (messages[messages.length - 1]?.content?.includes('``QUESTIONNAIRE``') && !hasProfile)} 
        onOpenVoiceModal={() => setVoiceModalOpen(true)} 
      />

      {/* Registration Modal */}
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
          <h2 className="text-2xl font-bold text-primary mb-2 text-center drop-shadow-sm">
            Your personalized lesson is ready!
          </h2>
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
            <Link to="/register" search={{ redirect: "/dashboard/chat" }} className="w-full">
              <Button fullWidth className="!bg-primary !text-white !font-bold !py-3 !rounded-xl !shadow-lg hover:!bg-primary/90 transition">
                Register for Free
              </Button>
            </Link>
          </div>
        </div>
      </Modal>

      {/* Financial Health Quiz Modal */}
      <Modal
        isOpen={isQuizModalOpen}
        onClose={() => setIsQuizModalOpen(false)}
        title="Financial Health Assessment"
        description="Complete this assessment to get personalized financial advice"
        width="wide"
        fullHeight={true}
        disableOverlayClick
      >
        {user && (
          <FinancialHealthQuiz
            user={user}
            onDashboardCreated={handleQuizComplete}
          />
        )}
      </Modal>
    </div>
  );
}