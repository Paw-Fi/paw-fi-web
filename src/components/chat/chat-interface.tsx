"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getMockAIResponse } from "@/data/mock-conversations";

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingLessons, setIsGeneratingLessons] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get AI prompt from environment variable
  const aiPrompt = "Hi I'm Paw-FI! I'll help you learn about personal finance. What topics interest you most?";

  // Initialize chat with the first message from AI
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        content: aiPrompt,
        role: "assistant",
        timestamp: Date.now(),
      }]);
    }
  }, [aiPrompt, messages.length]);

  // Auto-scroll to the bottom of the chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus the input field when component loads
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-resize textarea as user types
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "inherit";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [currentMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentMessage.trim() || isLoading) return;
    
    // Add user message to chat
    const newUserMessage: Message = {
      content: currentMessage,
      role: "user",
      timestamp: Date.now(),
    };
    
    setMessages((prev) => [...prev, newUserMessage]);
    setCurrentMessage("");
    setIsLoading(true);
    
    try {
      // In a real implementation, this would call your AI API with the conversation history
      // For now, we'll simulate a response
      const response = await simulateAIResponse(
        messages.concat(newUserMessage)
      );
      
      // Check if AI response indicates we should start generating lessons
      if (response.isComplete) {
        // In a real implementation, we would now start generating the lesson JSON
        // For demo, we'll simulate this process with a progress indicator
        startLessonGeneration(response.generatedLessons);
      } else {
        // Add AI response to chat
        setMessages((prev) => [
          ...prev,
          {
            content: response.content,
            role: "assistant",
            timestamp: Date.now(),
          },
        ]);
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

  // Simulates the process of generating lessons with a progress indicator
  const startLessonGeneration = (generatedLessons: any) => {
    // Add a message indicating that lessons are being generated
    setMessages((prev) => [
      ...prev,
      {
        content: "I'm now generating personalized lessons based on our conversation. This might take a few minutes. I'll let you know when they're ready!",
        role: "assistant",
        timestamp: Date.now(),
      },
    ]);
    
    // Notify parent immediately with initial generation state
    setIsGeneratingLessons(true);
    onGeneratingStateChange?.(true, 5); // Start at 5%
    
    // Create predefined progress steps for more predictable increases
    const progressSteps = [
      { percent: 15, delay: 800 },
      { percent: 28, delay: 800 },  
      { percent: 42, delay: 1000 },
      { percent: 60, delay: 1000 },
      { percent: 75, delay: 1200 },
      { percent: 88, delay: 800 },
      { percent: 95, delay: 1000 }
    ];
    
    // Use a recursive function for more reliable incremental updates
    const updateProgressSequentially = (stepIndex: number) => {
      if (stepIndex < progressSteps.length) {
        const { percent, delay } = progressSteps[stepIndex];
        
        // Update the progress
        console.log(`Setting progress to ${percent}%`);
        onGeneratingStateChange?.(true, percent);
        
        // Schedule the next update
        setTimeout(() => {
          updateProgressSequentially(stepIndex + 1);
        }, delay);
      }
    };
    
    // Start the progress updates
    updateProgressSequentially(0);
    
    // Real-world implementation would look something like:
    // async function generateLessons() {
    //   try {
    //     const response = await fetch('/api/generate-lessons', {
    //       method: 'POST',
    //       body: JSON.stringify({ messages: messages.map(m => ({ role: m.role, content: m.content })) }),
    //     });
    //     
    //     if (response.ok) {
    //       const lessons = await response.json();
    //       onCompleteSurvey(lessons);
    //     }
    //   } catch (error) {
    //     console.error('Error generating lessons:', error);
    //     setIsGeneratingLessons(false);
    //     // Show error message
    //   }
    // }
    // generateLessons();
    
    // Complete the progress to 100% after the steps have had time to run
    // Total time for steps is about 6.6 seconds, so wait 7.5 seconds before completing
    setTimeout(() => {
      // Clear any ongoing intervals just in case
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      
      // Set final progress to 100%
      console.log('Setting final progress to 100%');
      onGeneratingStateChange?.(true, 100);
      
      // After showing 100% for a moment, redirect
      setTimeout(() => {
        console.log('Completing generation process');
        setIsGeneratingLessons(false);
        // Notify parent that generation is complete 
        onGeneratingStateChange?.(false, 0);
        onCompleteSurvey(generatedLessons || { lessons: [] });
      }, 1500); // Slightly longer pause at 100% for better user visibility
    }, 7500); // Wait until all progress steps have had time to complete
  };
  
  // This simulates the AI response using our mock conversation data
  const simulateAIResponse = async (messageHistory: Message[]): Promise<{
    content: string;
    isComplete: boolean;
    generatedLessons?: any;
  }> => {
    return new Promise((resolve) => {
      // Add a slight delay to simulate AI thinking
      setTimeout(() => {
        // Count user messages to track conversation step
        const userMessages = messageHistory.filter(m => m.role === "user");
        const conversationStep = userMessages.length - 1; // 0-indexed
        
        // Get the latest user message
        const latestUserMessage = userMessages[conversationStep].content;
        
        // Get appropriate response from mock data
        const aiResponse = getMockAIResponse(latestUserMessage, conversationStep);
        
        resolve(aiResponse);
      }, 1500);
    });
  };
  
  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
                  : "bg-white text-gray-800 rounded-tl-none shadow-sm border border-gray-200"
                }`}
              >
                {message.content}
              </div>
              
              {/* Timestamp - visible on hover */}
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
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
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
        <form onSubmit={handleSubmit} className="flex items-end" onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !isGeneratingLessons) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}>
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
            disabled={!currentMessage.trim() || isLoading || isGeneratingLessons}
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
