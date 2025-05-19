"use client";

import { useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import type { Lesson } from "@/types/learning.types";
import { sendMessageToGemini, createChatSession } from "@/services/gemini-service";

interface Message {
  content: string;
  role: "user" | "assistant";
  timestamp: number;
}

interface ChatInterfaceProps {
  onCompleteSurvey: (generatedLessons: any) => void;
  onGeneratingStateChange?: (isGenerating: boolean, progress: number) => void;
}

export function ChatInterface({ onCompleteSurvey, onGeneratingStateChange }: ChatInterfaceProps) {
  // State for chat messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState("start");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Thinking...");
  
  // State for JSON continuation
  const [incompleteJson, setIncompleteJson] = useState<string | null>(null);
  const [waitingForContinuation, setWaitingForContinuation] = useState(false);
  
  // Refs for DOM elements
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatSessionRef = useRef<any>(null);
  
  // Get AI prompt from environment variable
  const welcomeMessage = "Hi I'm Paw-FI! I'll help you learn about personal finance. Type 'start' to begin.";

  // Initialize chat session
  useEffect(() => {
    // Create a new chat session with the Gemini API
    const aiPrompt = import.meta.env.VITE_AI_PROMPT || "Hi I'm Paw-FI! I'll help you learn about personal finance. What topics interest you most?";
    chatSessionRef.current = createChatSession(aiPrompt);
    
    return () => {
      // Clean up any resources if needed in the future
    };
  }, []);

  // Initialize chat with the first message from AI
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        content: welcomeMessage,
        role: "assistant",
        timestamp: Date.now(),
      }]);
    }
  }, [welcomeMessage, messages.length]);

  // Auto-scroll to the bottom of the chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus the input field when component loads
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Function to check if a string might be JSON and if it's complete
  const checkJsonString = (str: string): { isJson: boolean; isComplete: boolean } => {
    try {
      // Try to parse it as JSON
      JSON.parse(str);
      return { isJson: true, isComplete: true };
    } catch (e) {
      // Check if it looks like it might be incomplete JSON
      const hasOpeningBrace = str.includes('{');
      // We use hasClosingBrace in the JSON pattern detection logic below
      const hasClosingBrace = str.includes('}');
      const openingCount = (str.match(/\{/g) || []).length;
      const closingCount = (str.match(/\}/g) || []).length;
      const openingBracketCount = (str.match(/\[/g) || []).length;
      const closingBracketCount = (str.match(/\]/g) || []).length;
      
      // Check for unbalanced braces or brackets
      const hasUnbalancedBraces = openingCount !== closingCount;
      const hasUnbalancedBrackets = openingBracketCount !== closingBracketCount;
      
      // Check for common JSON patterns
      const startsWithJsonPattern = /^\s*\{|^\s*\[/.test(str);
      const hasJsonKeyValuePattern = /"\s*:\s*"/.test(str) || /"\s*:\s*\d/.test(str);
      
      // If it has JSON-like structure but is incomplete, it's likely incomplete JSON
      if (hasOpeningBrace && (hasUnbalancedBraces || hasUnbalancedBrackets || !hasClosingBrace) && 
          (startsWithJsonPattern || hasJsonKeyValuePattern)) {
        console.log("[DEBUG] Detected incomplete JSON:", {
          openingCount, closingCount, openingBracketCount, closingBracketCount,
          hasJsonKeyValuePattern, startsWithJsonPattern
        });
        return { isJson: true, isComplete: false };
      }
      
      // If it fails and doesn't look like incomplete JSON, it's not JSON
      return { isJson: false, isComplete: false };
    }
  };

  // Process generated lessons and store in localStorage
  const startLessonGeneration = (lessonData: any) => {
    try {
      // Check if the data is already in course format (has lessons array)
      if (lessonData.id && lessonData.title && Array.isArray(lessonData.lessons)) {
        console.log("[DEBUG] Storing course format data");
        // Already in course format, store directly
        const course = {
          id: lessonData.id,
          title: lessonData.title,
          description: lessonData.description || "Learn the basics of personal finance.",
          lessons: lessonData.lessons,
          currentLessonId: lessonData.lessons[0]?.id || lessonData.id,
        };
        
        // Store the course in localStorage
        localStorage.setItem("paw-fi-course", JSON.stringify(course));
        console.log("[DEBUG] Course data stored in localStorage");
        
        // Notify parent component that survey is complete
        if (onCompleteSurvey) {
          onCompleteSurvey(lessonData.lessons[0] || lessonData);
        }
      } else {
        // Single lesson format, create a course object with the generated lesson
        console.log("[DEBUG] Storing single lesson format data");
        const course = {
          id: "paw-fi-course",
          title: "Personal Finance Fundamentals",
          description: "Learn the basics of personal finance to build a strong financial foundation.",
          lessons: [lessonData],
          currentLessonId: lessonData.id,
        };
        
        // Store the course in localStorage
        localStorage.setItem("paw-fi-course", JSON.stringify(course));
        console.log("[DEBUG] Course data stored in localStorage");
        
        // Notify parent component that survey is complete
        if (onCompleteSurvey) {
          onCompleteSurvey(lessonData);
        }
      }
      
      // Update progress state
      if (onGeneratingStateChange) {
        onGeneratingStateChange(false, 100);
      }
    } catch (error) {
      console.error("Error storing lesson data:", error);
    }
  };

  // This function sends a message to the Gemini API and gets a response
  const getAIResponse = async (userMessage: string, addToChat: boolean = true): Promise<{
    content: string;
    isComplete: boolean;
    generatedLessons?: any;
  }> => {
    try {
      if (!chatSessionRef.current) {
        throw new Error("Chat session not initialized");
      }
      
      // Pass the user's message to the AI model
      // If addToChat is false, this is a continuation request and should not be displayed
      const response = await sendMessageToGemini(chatSessionRef.current, userMessage);
      
      // Check if the response is valid JSON for a lesson
      try {
        const lessonData = JSON.parse(response.content);
        if (lessonData && lessonData.id && lessonData.title && lessonData.questions) {
          return {
            content: response.content,
            isComplete: true,
            generatedLessons: lessonData
          };
        }
      } catch (e) {
        // Check if it might be incomplete JSON
        const jsonCheck = checkJsonString(response.content);
        if (jsonCheck.isJson && !jsonCheck.isComplete && addToChat) {
          // Only store for continuation if this is a message that's being added to chat
          setIncompleteJson(response.content);
          setWaitingForContinuation(true);
          
          // Automatically trigger JSON continuation without user interaction
          setTimeout(() => {
            console.log("[DEBUG] Auto-triggering JSON continuation");
            continueJsonResponse();
          }, 500); // Small delay to allow state updates to complete
          
          return { content: response.content, isComplete: false };
        }
        // Not valid JSON, which is fine for normal responses
      }
      
      return { content: response.content, isComplete: true };
    } catch (error) {
      console.error("Error in getAIResponse:", error);
      return { content: "Sorry, I encountered an error. Please try again.", isComplete: false };
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
      const response = await getAIResponse("continue", false);
      
      // Combine the previous incomplete JSON with the new response
      // First, clean up any potential formatting issues
      let firstPart = incompleteJson.trim();
      let secondPart = response.content.trim();
      
      // Check if the first part ends with a comma and the second part starts with one
      if (firstPart.endsWith(',') && secondPart.startsWith(',')) {
        secondPart = secondPart.substring(1);
      }
      // If first part doesn't end with comma and second doesn't start with one, add it
      else if (!firstPart.endsWith(',') && !secondPart.startsWith(',') && 
               !firstPart.endsWith('{') && !secondPart.startsWith('}')) {
        firstPart += ',';
      }
      
      // Properly merge the two parts
      const combinedJson = firstPart + secondPart;
      console.log("[DEBUG] Combined JSON:", combinedJson.substring(0, 100) + "...");
      
      const jsonCheck = checkJsonString(combinedJson);
      
      // Check if we now have complete JSON
      if (jsonCheck.isJson && jsonCheck.isComplete) {
        console.log("[DEBUG] Successfully merged into complete JSON");
        
        // Remove the incomplete message and add a new complete one
        setMessages(prev => {
          // Filter out any messages that contain parts of the incomplete JSON
          const filteredMessages = prev.filter(m => 
            !(m.role === "assistant" && 
              (m.content === incompleteJson || m.content === response.content))
          );
          
          // Add a new message with the complete JSON
          return [
            ...filteredMessages,
            {
              content: combinedJson,
              role: "assistant",
              timestamp: Date.now()
            }
          ];
        });
        
        // Reset the incomplete JSON state
        setIncompleteJson(null);
        
        // Try to parse the complete JSON to see if it's lesson data
        try {
          const parsedData = JSON.parse(combinedJson);
          console.log("[DEBUG] Parsed data:", parsedData);
          
          if (parsedData && parsedData.id && parsedData.title && parsedData.questions) {
            // Store the lesson data in localStorage
            console.log("[DEBUG] Storing valid lesson data from combined JSON");
            startLessonGeneration(parsedData);
          }
        } catch (e) {
          console.error("Error parsing combined JSON:", e);
        }
      } else if (jsonCheck.isJson && !jsonCheck.isComplete) {
        // Still incomplete, update and continue
        console.log("[DEBUG] JSON is still incomplete after continuation");
        setIncompleteJson(combinedJson);
        setWaitingForContinuation(true);
        
        // Remove the old incomplete message and add a new one with updated content
        setMessages(prev => {
          // Filter out the old incomplete message
          const filteredMessages = prev.filter(m => 
            !(m.role === "assistant" && m.content === incompleteJson)
          );
          
          // Add a new message with the updated incomplete content
          return [
            ...filteredMessages,
            {
              content: combinedJson,
              role: "assistant",
              timestamp: Date.now()
            }
          ];
        });
        
        // Try again after a short delay if still incomplete
        setTimeout(() => {
          if (waitingForContinuation) {
            console.log("[DEBUG] Auto-triggering another JSON continuation");
            continueJsonResponse();
          }
        }, 1000);
      } else {
        // Something went wrong, add as a new message
        console.error("[DEBUG] Failed to create valid JSON after continuation");
        setMessages(prev => [
          ...prev,
          {
            content: "Sorry, I encountered an error processing the data. Please try again.",
            role: "assistant",
            timestamp: Date.now()
          }
        ]);
        setIncompleteJson(null);
      }
    } catch (error) {
      console.error("Error continuing JSON response:", error);
      setMessages(prev => [
        ...prev,
        {
          content: "Sorry, I encountered an error getting the rest of the data. Please try again.",
          role: "assistant",
          timestamp: Date.now()
        }
      ]);
      setIncompleteJson(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentMessage.trim() || isLoading) return;
    
    // Special case for "continue" - handle it differently
    if (currentMessage.trim().toLowerCase() === "continue" && incompleteJson) {
      // Don't add this message to the chat
      setCurrentMessage("");
      // Just call continueJsonResponse directly
      continueJsonResponse();
      return;
    }
    
    // Add user message to chat
    const newUserMessage: Message = {
      content: currentMessage,
      role: "user",
      timestamp: Date.now(),
    };
    
    setMessages((prev) => [...prev, newUserMessage]);
    setCurrentMessage("");
    setIsLoading(true);
    setLoadingMessage("Thinking...");
    
    try {
      // Call the Gemini API with the user's message (explicitly set addToChat to true)
      setLoadingMessage("Generating response...");
      const response = await getAIResponse(newUserMessage.content, true);
      
      // Add AI response to chat
      setMessages((prev) => [
        ...prev,
        {
          content: response.content,
          role: "assistant",
          timestamp: Date.now(),
        },
      ]);
      
      // Check if AI response indicates we should start generating lessons
      if (response.isComplete && response.generatedLessons) {
        // Start generating lessons with the provided data
        setLoadingMessage("Processing lesson data...");
        startLessonGeneration(response.generatedLessons);
      }
    } catch (error) {
      console.error("Error getting AI response:", error);
      setMessages((prev) => [
        ...prev,
        {
          content: "Sorry, I encountered an error. Please try again.",
          role: "assistant",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-gray-50 rounded-lg overflow-hidden shadow-inner relative">
      
      {/* Chat messages area */}
      <div className="flex-grow overflow-y-auto py-4 px-3 space-y-4">
        <div className="max-w-3xl mx-auto w-full">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            {/* Assistant avatar (only show on first message or if previous message was from user) */}
            {message.role === "assistant" && (index === 0 || messages[index - 1].role === "user") && (
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
            )}
            
            {/* Message bubble */}
            <div className={`group max-w-[75%] flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}>
              <div
                className={`px-4 py-3 rounded-2xl ${message.role === "user"
                  ? "bg-purple-600 text-white rounded-tr-none shadow-sm"
                  : message.content.startsWith('{"type":"lesson-card"') 
                    ? "bg-transparent" 
                    : "bg-white text-gray-800 rounded-tl-none shadow-sm border border-gray-200"
                }`}
              >
                {/* Debug info - only visible during development */}
                {process.env.NODE_ENV === 'development' && message.content.includes('{') && (
                  <div className="debug-info bg-yellow-50 p-2 mb-2 text-xs border border-yellow-200 rounded">
                    <div className="font-bold text-yellow-700">Debug:</div>
                    <div>Message contains JSON-like content</div>
                    <div>Content length: {message.content.length} chars</div>
                    <div>First 50 chars: "{message.content.substring(0, 50)}..."</div>
                  </div>
                )}
                
                {/* Try to parse JSON content if it looks like JSON */}
                {(message.content.includes('{') && message.content.includes('}')) ? (
                  (() => {
                    // Check if this is incomplete JSON and waiting for continuation
                    const jsonCheck = checkJsonString(message.content);
                    
                    // If it's incomplete JSON and we're waiting for continuation
                    if (jsonCheck.isJson && !jsonCheck.isComplete && waitingForContinuation && message.content === incompleteJson) {
                      return (
                        <div className="flex flex-col">
                          <div className="prose prose-sm max-w-none mb-3">
                            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                              {message.content.substring(0, 50)}...
                            </pre>
                            <div className="text-amber-600 text-sm mt-2">
                              Automatically retrieving complete data...
                            </div>
                            <div className="flex space-x-2 mt-2">
                              <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                              <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                              <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    try {
                      // Try to parse the complete message content first
                      let lessonData;
                      try {
                        // First attempt: try to parse the entire content
                        lessonData = JSON.parse(message.content);
                        console.log("[DEBUG] Successfully parsed complete JSON");
                      } catch (parseError) {
                        // Second attempt: try to extract JSON from the message content
                        const jsonMatch = message.content.match(/\{[\s\S]*\}/);
                        const jsonContent = jsonMatch ? jsonMatch[0] : null;
                        
                        if (!jsonContent) {
                          throw new Error("No JSON content found");
                        }
                        
                        lessonData = JSON.parse(jsonContent);
                        console.log("[DEBUG] Parsed extracted JSON");
                      }
                      
                      // Debug: Log the parsed data
                      console.log("[DEBUG] Parsed lesson data:", lessonData);
                      
                      // Debug the structure of the parsed data
                      console.log("[DEBUG] Checking lesson data structure:", {
                        hasId: !!lessonData?.id,
                        hasTitle: !!lessonData?.title,
                        hasLessons: Array.isArray(lessonData?.lessons),
                        lessonsLength: lessonData?.lessons?.length,
                        firstLessonHasQuestions: Array.isArray(lessonData?.lessons?.[0]?.questions),
                        hasQuestions: Array.isArray(lessonData?.questions)
                      });
                      
                      // Check for course format (contains lessons array)
                      if (lessonData?.id && lessonData?.title && Array.isArray(lessonData?.lessons) && lessonData.lessons.length > 0) {
                        console.log("[DEBUG] Found valid course data with lessons");
                        // Store the course data directly
                        const course = {
                          id: lessonData.id,
                          title: lessonData.title,
                          description: lessonData.description || "Learn about personal finance",
                          lessons: lessonData.lessons,
                          currentLessonId: lessonData.lessons[0].id,
                        };
                        
                        // Store the course in localStorage
                        localStorage.setItem("paw-fi-course", JSON.stringify(course));
                        console.log("[DEBUG] Stored course data in localStorage");
                        
                        // Notify parent component
                        if (onCompleteSurvey) {
                          onCompleteSurvey(lessonData.lessons[0]);
                        }
                        
                        // Render the lesson card for the first lesson
                        const firstLesson = lessonData.lessons[0];
                        return (
                          <div className="lesson-card bg-purple-50 p-4 rounded-lg border border-purple-200">
                            <div className="flex items-start">
                              <div className="text-3xl mr-3">{firstLesson.icon || '📚'}</div>
                              <div className="flex-1">
                                <h3 className="font-bold text-purple-700 mb-1">{lessonData.title}</h3>
                                <p className="text-sm text-gray-700 mb-3">{lessonData.description}</p>
                                <div className="flex items-center">
                                  <Link 
                                    to="/learning" 
                                    className="inline-block bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
                                  >
                                    Start Learning
                                  </Link>
                                  <span className="ml-2 text-sm text-gray-500">
                                    {lessonData.lessons.length} {lessonData.lessons.length === 1 ? 'lesson' : 'lessons'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      
                      // Check for single lesson format
                      if (!lessonData || !lessonData.id || !lessonData.title || !Array.isArray(lessonData.questions)) {
                        console.log("[DEBUG] Invalid lesson data format:", lessonData);
                        
                        // In development mode, show a special debug message
                        if (process.env.NODE_ENV === 'development') {
                          return (
                            <div className="debug-error p-2 bg-red-50 border border-red-200 rounded">
                              <div className="text-red-600 font-bold mb-1">JSON Parsing Debug:</div>
                              <div className="text-xs text-gray-700 overflow-auto max-h-40">
                                {message.content}
                              </div>
                            </div>
                          );
                        }
                        // If not in development mode, render the message content as markdown
                        return (
                          <div className="markdown-content text-sm text-gray-800">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        );
                      }
                      
                      // If we have valid single lesson data, store it in localStorage and render a lesson card
                      if (lessonData && lessonData.id && lessonData.title && Array.isArray(lessonData.questions)) {
                        // Store the lesson data in localStorage
                        console.log("[DEBUG] Storing valid lesson data in localStorage");
                        startLessonGeneration(lessonData);
                        return (
                          <div className="lesson-card bg-purple-50 p-4 rounded-lg border border-purple-200">
                            <div className="flex items-start">
                              <div className="text-3xl mr-3">{lessonData.icon || '📚'}</div>
                              <div className="flex-1">
                                <h3 className="font-bold text-purple-700 mb-1">{lessonData.title}</h3>
                                <p className="text-sm text-gray-700 mb-3">{lessonData.description}</p>
                                <div className="flex items-center">
                                  <Link 
                                    to="/learning" 
                                    className="inline-block bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
                                  >
                                    Start Learning
                                  </Link>
                                  <span className="ml-2 text-sm text-gray-500">{lessonData.questions.length} questions</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    } catch (e) {
                      console.error("[DEBUG] Error parsing JSON:", e);
                      
                      // Check if it might be incomplete JSON
                      const jsonCheck = checkJsonString(message.content);
                      if (jsonCheck.isJson && !jsonCheck.isComplete) {
                        // Store the incomplete JSON for later continuation if not already stored
                        if (!incompleteJson) {
                          setIncompleteJson(message.content);
                          setWaitingForContinuation(true);
                        }
                        
                        // If this is the incomplete JSON message and we're waiting for continuation
                        if (waitingForContinuation && message.content === incompleteJson) {
                          return (
                            <div className="flex flex-col">
                              <div className="prose prose-sm max-w-none mb-3">
                                <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                                  {message.content.substring(0, 50)}...
                                </pre>
                                <div className="text-amber-600 text-sm mt-2">
                                  Automatically retrieving complete data...
                                </div>
                                <div className="flex space-x-2 mt-2">
                                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                                </div>
                              </div>
                            </div>
                          );
                        }
                      }
                      
                      // If it's not valid JSON or not waiting for continuation, render as markdown
                      return (
                        <div className="markdown-content text-sm text-gray-800">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      );
                    }
                  })()
                ) : (
                  // Regular message content (non-JSON)
                  <div className="markdown-content text-sm">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {formatTime(message.timestamp)}
              </div>
            </div>
            
            {/* User avatar (only show if message is from user and either last message or next is from assistant) */}
            {message.role === "user" && (index === 0 || messages[index - 1].role === "assistant") && (
              <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center ml-2 mt-1 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
            )}
          </div>
        ))}
        
        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-start">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-2 flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <div className="bg-white rounded-2xl rounded-tl-none shadow-sm px-4 py-3 border border-gray-200">
              <div className="flex flex-col">
                <span className="text-sm text-gray-600 mb-1">{loadingMessage}</span>
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
      
      {/* Input area */}
      <div className="bg-white border-t border-gray-200 p-3">
        <form onSubmit={handleSubmit} className="flex items-end">
            <input
              ref={inputRef}
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Type your message..."
              className="w-full border border-gray-300 rounded-full py-3 px-4 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent overflow-x-hidden"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
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
      </div>
    </div>
  );
}
