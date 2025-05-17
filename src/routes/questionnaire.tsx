"use client";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import catIcon from "@/assets/images/cat.gif";
import { useState } from "react";

// Import the chat interface component
import { ChatInterface } from "@/components/chat/chat-interface";

export const Route = createFileRoute("/questionnaire")({
  component: Questionnaire,
});

function Questionnaire() {
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isGeneratingLessons, setIsGeneratingLessons] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  // This function will be called when the AI chat is complete
  const handleSurveyComplete = (_aiResponse: any) => {
    // In a real implementation, you would:
    // 1. Store the AI-generated lessons in state/context/localStorage
    // 2. Navigate to the results or learning page to show these lessons
    // The response parameter would be used to generate personalized lessons
    
    setIsRedirecting(true);
    
    // Navigate to results page after a short delay to show loading state
    setTimeout(() => {
      navigate({ to: "/results" });
    }, 1500);
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
              onGeneratingStateChange={(isGenerating, progress) => {
                setIsGeneratingLessons(isGenerating);
                setGenerationProgress(progress);
              }} 
            />
          )}
      </div>
    </div>
  );
}
