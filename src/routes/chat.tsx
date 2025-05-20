"use client";

import { createFileRoute } from "@tanstack/react-router";
import catIcon from "@/assets/images/cat.gif";

// Import the chat interface component
import { ChatInterface } from "@/components/chat/chat-interface";

export const Route = createFileRoute("/chat")({
  component: Chat,
});

function Chat() {
  // This function will be called when the survey is complete
  // It's no longer used for automatic navigation, as the user will click the link in the chat
  const handleSurveyComplete = async (_aiResponse: any) => {
    console.log('Survey complete');
    // No automatic navigation - user will click the link in the chat interface
  };
  
  // This function is kept for compatibility with the ChatInterface component
  // but we don't need to do anything with the state anymore
  const handleGeneratingStateChange = (isGenerating: boolean, progress: number) => {
    console.log(`Generation state: ${isGenerating ? 'generating' : 'idle'}, progress: ${progress}%`);
  };

  return (
    <div className="flex items-center justify-center p-4 md:p-6">
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
          
          {/* Chat interface - always shown */}
          <ChatInterface 
            onCompleteSurvey={handleSurveyComplete}
            onGeneratingStateChange={handleGeneratingStateChange} 
          />
      </div>
    </div>
  );
}
