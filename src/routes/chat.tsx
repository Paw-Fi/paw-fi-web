"use client";

import { createFileRoute } from "@tanstack/react-router";
import catIcon from "@/assets/images/cat.gif";

// Import the chat interface component
import { ChatInterface } from "@/components/chat/chat-interface";

export const Route = createFileRoute("/chat")({
  component: Chat,
});

function Chat() {

  return (
    <div className="flex items-center justify-center p-4 md:p-6">
      <div className=" w-[95vw] lg:w-[55rem] bg-white rounded-xl shadow-lg overflow-hidden lg:h-[85vh] h-[90vh] flex flex-col">
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
           
          />
      </div>
    </div>
  );
}
