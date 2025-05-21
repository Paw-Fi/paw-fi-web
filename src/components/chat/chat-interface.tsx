"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  useConversations,
  useConversation,
  useCreateConversation,
  useAddMessage,
  useDeleteConversation,
  useUpdateConversation,
} from "@/services/conversation-service";
import { Link, useNavigate } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/ui/course-card";

import { useAuth } from "@/contexts/auth-context";
import { getAIResponseFromEdge } from "@/services/conversation-service";
import { supabase } from "@/lib/supabase";
// Import conversation service functions
import {
  getConversations,
  getConversation,
  createConversation,
  addMessage,
  deleteConversation,
} from "@/services/conversation-service";
import { storeCourse } from "@/data/lessons";

interface Message {
  content: string;
  role: "user" | "assistant";
  timestamp: number;
  chat_session_id: string;
  metadata?: Record<string, any>;
}

export function ChatInterface() {
  // Get authentication state
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const navigate = useNavigate();

  // UI state for chat input, loading, etc.
  const [currentMessage, setCurrentMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Thinking...");

  // React Query hooks for conversations and messages
  const {
    data: conversations,
    isLoading: isConversationsLoading,
    isError: isConversationsError,
    refetch: refetchConversations,
  } = useConversations(supabase);

  const currentConversationId = useMemo(
    () => conversations?.[0]?.id,
    [conversations],
  );

  const {
    data: currentConversation,
    isLoading: isConversationLoading,
    isError: isConversationError,
    refetch: refetchConversation,
  } = useConversation(supabase, currentConversationId);

  const createConversationMutation = useCreateConversation(supabase);
  const addMessageMutation = useAddMessage(supabase);

  // Refs for DOM elements
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Different welcome messages based on authentication state
  const authenticatedMessage =
    "Hi I'm Paw-FI! I'll help you learn about personal finance. Type 'start' to begin.";
  const unauthenticatedMessage =
    "Hi I'm Paw-FI! Sign in to start learning about personal finance with me.";

  // Choose the appropriate welcome message
  const welcomeMessage = isAuthenticated
    ? authenticatedMessage
    : unauthenticatedMessage;

      // Auto-add welcome message to current conversation if needed
  useEffect(() => {
    if (
      currentConversationId&&
      currentConversation && 
      currentConversation.messages?.length === 0 
      &&messages.length === 0
    ) {
      const welcomeMsg: Message = {
        content: authenticatedMessage,
        role: "assistant",
        timestamp: Date.now(),
        chat_session_id: currentConversationId,
      };
      addMessageMutation.mutate(welcomeMsg);
    }
  }, [ 
    currentConversation,   
  ]);

  useEffect(() => {
    if(currentConversation?.messages?.length){
      setMessages(currentConversation.messages);
    }
  }, [currentConversation]);

  // Load user's conversations when authenticated
  // Show welcome message if not authenticated
 useEffect(() => {
    if (!isAuthenticated) {
      setMessages([
        {
          content: welcomeMessage,
          role: "assistant",
          timestamp: Date.now(),
          chat_session_id: "",
        },
      ]);
    }  
  }, [isAuthenticated]);

  // Load conversation messages when conversation changes
  // Save current conversation ID to localStorage when it changes
  useEffect(() => {
    if (currentConversationId) {
      localStorage.setItem(
        "paw-fi-current-conversation",
        currentConversationId,
      );
    }
  }, [currentConversationId]);

  // Auto-scroll to the bottom of the chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load a specific conversation

  // Create a new conversation
  // Create a new conversation using mutation
  const handleCreateConversation = async (userId: string) => {
    const sessionId = `Conversation ${(conversations?.length || 0) + 1}`;
    await createConversationMutation.mutateAsync({ userId, sessionId });
    refetchConversations();
  };

  // Save message to current conversation
  // Save message to current conversation using mutation
  const saveMessageToConversation = async (message: Message) => {
    if (!currentConversationId) throw new Error("No current conversation");
    if (!isAuthenticated) throw new Error("User not authenticated");
    const messageWithSessionId = {
      ...message,
      chat_session_id: currentConversationId,
    };
    const savedMessage =
      await addMessageMutation.mutateAsync(messageWithSessionId);
    if (!savedMessage) throw new Error("Failed to save message to server");
    return savedMessage;
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;
    if (!currentConversationId) {
      if (!user?.id)
        throw new Error("User must be authenticated to start a conversation");
      await handleCreateConversation(user.id);
      return;
    }
    const userMessage: Message = {
      content,
      role: "user",
      timestamp: Date.now(),
      chat_session_id: currentConversationId,
    };
    try {
      setIsLoading(true);
      setCurrentMessage("");

      // Add the user message to the UI immediately
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);

      // Ensure we have a valid conversation ID
      let conversationId = conversations[0]?.id;
      // If no conversation exists, create one
      if (!conversationId) {
        if (!user?.id) {
          throw new Error("User must be authenticated to start a conversation");
        }
        console.log("No conversation found, creating a new conversation...");
        const newConversation = await createConversation(
          supabase,
          user.id,
          `Conversation ${conversations.length + 1}`,
        );
        console.log("New conversation created:", newConversation.id);
        // Prepend new conversation to the front
        setConversations((prev) => [
          { id: newConversation.id, session_id: newConversation.session_id },
          ...prev,
        ]);
        conversationId = newConversation.id;
        // Update the message's chat_session_id to the new conversation's id
        const userMessageWithSession: Message = {
          ...userMessage,
          chat_session_id: newConversation.id,
        };
        await addMessage(supabase, userMessageWithSession);
      } else {
        // Add the message to the existing conversation
        console.log("Adding message to existing conversation:", conversationId);
        await saveMessageToConversation(userMessage);
      }

      // Get AI response
      try {
        // Remove all leading non-user messages
        let filteredMessages = updatedMessages;
        while (
          filteredMessages.length > 0 &&
          filteredMessages[0].role !== "user"
        ) {
          filteredMessages = filteredMessages.slice(1);
        }
        // Log the filtered history for debugging
        console.log("Filtered chat history sent to Gemini:", filteredMessages);
        // If there are no user messages, abort and show error
        if (
          filteredMessages.length === 0 ||
          filteredMessages[0].role !== "user"
        ) {
          setMessages((prev) => [
            ...prev,
            {
              content: "Please type a message to start the conversation.",
              role: "assistant",
              timestamp: Date.now(),
              chat_session_id: currentConversationId!,
              metadata: { isError: true },
            },
          ]);
          setIsLoading(false);
          return;
        }
        // Format for Gemini (convert 'assistant' role to 'model')
        const geminiHistory = filteredMessages.map((msg) => ({
          role: msg.role === "assistant" ? "model" : msg.role,
          parts: [{ text: msg.content }],
        }));
        const aiResponse = await getAIResponseFromEdge(
          supabase,
          content,
          geminiHistory,
        );

        if (!aiResponse) {
          throw new Error("No response from AI");
        }

        // Ensure we have a string content
        const responseContent =
          typeof aiResponse === "string"
            ? aiResponse
            : aiResponse.response ||
              aiResponse.content ||
              "No response content";

        // Add the AI response to the UI
        const assistantMessage: Message = {
          content: responseContent,
          role: "assistant",
          timestamp: Date.now(),
          chat_session_id: conversations[0]?.id,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        // Save the assistant's response to the conversation
        if (conversations.length > 0) {
          console.log(
            "Saving assistant response to conversation:",
            conversations[0].id,
          );
          await saveMessageToConversation(assistantMessage);
        } else {
          console.warn("No conversation available to save assistant response");
        }
      } catch (error) {
        console.error("Error getting AI response:", error);

        // Show error message to the user
        const errorMessage: Message = {
          content:
            "Sorry, I encountered an error while processing your request. Please try again.",
          role: "assistant",
          timestamp: Date.now(),
          metadata: { isError: true },
          chat_session_id: conversations[0]?.id,
        };
        setMessages((prev) => [...prev, errorMessage]);
        // Save the error message to the conversation if we have a conversation
        if (conversations.length > 0) {
          try {
            await saveMessageToConversation(errorMessage);
          } catch (saveError) {
            console.error(
              "Failed to save error message to conversation:",
              saveError,
            );
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
        <div className="space-y-4">
          {/* Skeleton loader for messages when data is loading */}
          {(isConversationsLoading || isConversationLoading) &&
          messages.length === 0 ? (
            <>
              {/* Skeleton for assistant message */}
              <div className="flex animate-pulse justify-start">
                <div className="w-[65%] max-w-[80%] rounded-lg border border-gray-200 bg-white p-3">
                  <div className="mb-2 h-4 w-3/4 rounded bg-gray-200"></div>
                  <div className="mb-2 h-4 w-full rounded bg-gray-200"></div>
                  <div className="mb-2 h-4 w-5/6 rounded bg-gray-200"></div>
                  <div className="h-4 w-1/2 rounded bg-gray-200"></div>
                  <div className="mt-1 flex justify-end">
                    <div className="mt-1 h-3 w-16 rounded bg-gray-200"></div>
                  </div>
                </div>
              </div>

              {/* Skeleton for user message */}
              <div className="flex animate-pulse justify-end">
                <div className="w-[40%] max-w-[80%] rounded-lg bg-purple-200 p-3">
                  <div className="mb-2 h-4 w-full rounded bg-purple-300"></div>
                  <div className="h-4 w-3/4 rounded bg-purple-300"></div>
                  <div className="mt-1 flex justify-end">
                    <div className="mt-1 h-3 w-16 rounded bg-purple-300"></div>
                  </div>
                </div>
              </div>

              {/* Another skeleton for assistant message */}
              <div className="flex animate-pulse justify-start">
                <div className="w-[70%] max-w-[80%] rounded-lg border border-gray-200 bg-white p-3">
                  <div className="mb-2 h-4 w-full rounded bg-gray-200"></div>
                  <div className="mb-2 h-4 w-3/4 rounded bg-gray-200"></div>
                  <div className="mb-2 h-4 w-5/6 rounded bg-gray-200"></div>
                  <div className="mb-2 h-4 w-4/5 rounded bg-gray-200"></div>
                  <div className="h-4 w-2/3 rounded bg-gray-200"></div>
                  <div className="mt-1 flex justify-end">
                    <div className="mt-1 h-3 w-16 rounded bg-gray-200"></div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Regular message display when data is loaded */
            <>
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
                        : "border border-gray-200 bg-white text-gray-800"
                    }`}
                  >
                    <div className="prose prose-sm max-w-none">
                      {/* Render a Card if content contains a JSON block */}
                      {(() => {
                        // Robustly extract the first valid JSON object from the message
                        function extractFirstJson(
                          text: string,
                        ): { json: any; start: number; end: number } | null {
                          // 1. Try to extract the first ```json ... ``` code block
                          const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/i;
                          const jsonBlockMatch = text.match(jsonBlockRegex);
                          if (jsonBlockMatch && jsonBlockMatch[1]) {
                            try {
                              const code = jsonBlockMatch[1].trim();
                              const json = JSON.parse(code);
                              const idx = text.indexOf(jsonBlockMatch[0]);
                              return {
                                json,
                                start: idx,
                                end: idx + jsonBlockMatch[0].length,
                              };
                            } catch (err) {
                              console.warn(
                                "Could not parse JSON from code block:",
                                jsonBlockMatch[1].substring(0, 100),
                                err,
                              );
                            }
                          }
                          // 2. Fallback: Try to find the first {...} that parses
                          const curlyBlockRegex = /\{[\s\S]*\}/g;
                          let match: RegExpExecArray | null;
                          while (
                            (match = curlyBlockRegex.exec(text)) !== null
                          ) {
                            try {
                              const json = JSON.parse(match[0]);
                              return {
                                json,
                                start: match.index,
                                end: match.index + match[0].length,
                              };
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
                          return (
                            <>
                              {intro && (
                                <div className="mb-2">
                                  <ReactMarkdown>{intro}</ReactMarkdown>
                                </div>
                              )}
                              <CourseCard
                                onClick={() => {
                                  storeCourse(json);
                                  navigate({ to: `/learning` });
                                }}
                                title={json.title || ""}
                                description={json.description || ""}
                                lessonCount={
                                  Array.isArray(json.lessons)
                                    ? json.lessons.length
                                    : 0
                                }
                              />
                              {outro && (
                                <div className="mt-2">
                                  <ReactMarkdown>{outro}</ReactMarkdown>
                                </div>
                              )}
                            </>
                          );
                        }
                        // Fallback: just render markdown (never show JSON as plain text)
                        return (
                          <ReactMarkdown>
                            {message.content
                              .replace(/```json[\s\S]*?```/gi, "")
                              .replace(/```[\s\S]*?```/gi, "")
                              .replace(/\{[\s\S]*\}/g, "")}
                          </ReactMarkdown>
                        );
                      })()}
                    </div>
                    <div
                      className={`mt-1 text-right text-xs ${
                        message.role === "user"
                          ? "text-purple-200"
                          : "text-gray-400"
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          <div ref={messagesEndRef} />

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg border border-gray-200 bg-white p-3">
                <div className="mb-2 text-gray-500">{loadingMessage}</div>
                <div className="flex space-x-2">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
                  <div
                    className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 bg-white p-3">
        {isAuthenticated ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (currentMessage.trim()) {
                handleSendMessage(currentMessage);
              }
            }}
            className="flex items-center gap-2 border-t border-gray-200 p-2"
          >
            <input
              ref={inputRef}
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Type your message..."
              className="w-full resize-none overflow-x-hidden rounded-full border border-gray-300 px-4 py-3 pr-12 focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none"
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
              className="ml-2 flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 p-3 transition-colors hover:bg-purple-700"
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
            <p className="text-sm text-gray-500">Sign in to chat with Paw-Fi</p>
            <div className="flex space-x-3">
              <Link
                to="/login"
                className="rounded-md bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="rounded-md border border-purple-600 px-4 py-2 text-purple-600 transition-colors hover:bg-purple-50"
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
