"use client";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import catIcon from "@/assets/images/cat.gif";
import { useState } from "react";

// Import the chat interface component and mock data
import { ChatInterface } from "@/components/chat/chat-interface";
import mockLessons from "@/data/mock1.json";

// LocalStorage key for lesson data (must match the one in lessons.ts)
const COURSE_STORAGE_KEY = 'paw-fi-course';

export const Route = createFileRoute("/questionnaire")({
  component: Questionnaire,
});

function Questionnaire() {
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isGeneratingLessons, setIsGeneratingLessons] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  
  // This function will be called when the AI chat is complete
  const handleSurveyComplete = async (_aiResponse: any) => {
    // The ChatInterface component has already shown a progress animation up to 100%
    // Now we just need to store the lessons in localStorage and redirect
    try {
      // Store the mock lessons in localStorage
      localStorage.setItem(COURSE_STORAGE_KEY, JSON.stringify(mockLessons));
      console.log('Mock lessons stored in localStorage successfully');
      
      // Set redirecting state (first progress was already handled by ChatInterface)
      setIsRedirecting(true);
      
      // Navigate to learning page after a short delay to show completion message
      setTimeout(() => {
        navigate({ to: "/learning" });
      }, 1500);
    } catch (error) {
      console.error('Error storing mock lessons in localStorage:', error);
      
      // Even if there's an error, still redirect to learning
      // It will fall back to using the default lessons
      setIsRedirecting(true);
      setTimeout(() => {
        navigate({ to: "/learning" });
      }, 1500);
    }
  };
  
  // This handles the generation state from ChatInterface
  const handleGeneratingStateChange = (isGenerating: boolean, progress: number) => {
    setIsGeneratingLessons(isGenerating);
    setGenerationProgress(progress);
  };

  return (
    <div className="h-screen bg-background flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg overflow-hidden h-[70vh] flex flex-col">
          {/* Header */}
          <div className="mb-4 flex justify-center items-center">
            <img src={catIcon} alt="PawFi Cat" className="h-16 w-16" />
          </div>
          
          {/* Title */}
          <div className="mb-4 text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Financial Learning Assistant
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Chat with our AI to get personalized financial education.
            </p>
          </div>
          
          {/* Main content area */}
          {isRedirecting || isGeneratingLessons ? (
            // Shared loading state for both lesson generation and redirection
            <div className="flex-grow flex items-center justify-center flex-col p-6">
              <div className="w-24 h-24 mb-6 bg-white rounded-full shadow-lg p-4 flex items-center justify-center">
                <svg className="w-full h-full text-purple-600 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">
                {isRedirecting ? "Preparing Your Lessons" : "Generating Your Lessons"}
              </h3>
              <p className="text-gray-600 mb-4 text-center max-w-md text-lg">
                {isRedirecting ? 
                  "Your personalized lessons are ready! Taking you there now..." : 
                  "I'm creating personalized financial lessons based on our conversation. This might take a few minutes."}
              </p>
              
              {/* Only show progress bar during generation */}
              {isGeneratingLessons && (
                <>
                  <p className="text-amber-700 mb-8 text-center font-medium">
                    Please wait, this might take a while...
                  </p>
                  <div className="w-full max-w-md bg-white shadow-inner rounded-full h-6 mb-3 overflow-hidden border border-gray-200">
                    <div 
                      className="bg-purple-600 h-6 rounded-full transition-all duration-300 ease-out" 
                      style={{ width: `${generationProgress}%` }}
                    >
                    </div>
                  </div>
                  <div className="text-base font-medium text-purple-800">{generationProgress}% complete</div>
                </>
              )}
            </div>
          ) : (
            // Chat interface
            <ChatInterface 
              onCompleteSurvey={handleSurveyComplete}
              onGeneratingStateChange={handleGeneratingStateChange} 
            />
          )}
      </div>
    </div>
  );
}
