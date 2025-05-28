"use client";

import { createFileRoute } from "@tanstack/react-router";
import { seo } from '@/utils/seo';
import catIcon from "@/assets/images/cat.gif";

// Import the chat interface component
import { ChatInterface } from "@/components/chat/chat-interface";

export const Route = createFileRoute("/chat")({
  component: Chat,
  head: () => {
    const title = "AI Chat | PawFi - Your Financial Assistant";
    const description = "Chat with PawFi's AI assistant for financial guidance, answers to your money questions, and help with navigating your finances.";
    const keywords = "AI chat, financial assistant, PawFi, money questions, financial help, chatbot";
    const imageUrl = 'https://paw-fi.app/og-img.png';
    const pageUrl = 'https://pawfi.app/chat';

    const meta = seo({
      title: title,
      description: description,
      keywords: keywords,
      image: imageUrl,
      url: pageUrl,
    });    
    return {      
      meta
    };
  },
});

function Chat() {
  return (
    <div className="flex items-center justify-center p-4 md:p-6">
      <div className="flex h-[calc(100vh-6rem)] w-[95vw] flex-col overflow-hidden rounded-xl bg-white shadow-lg lg:h-[calc(100vh-8rem)]  lg:w-[55rem]">
        {/* Header */}
        <div className="mt-2 mb-2 flex items-center justify-center">
          <img
            src={catIcon}
            alt="PawFi Cat"
            className="size-8 my-2 sm:size-14"
          />
        </div>

        {/* Title */}
        <div className="mb-4 text-center">
          <h1 className="text-lg leading-tight font-bold text-gray-900 sm:text-2xl">
            Financial Learning Assistant
          </h1>
          <p className="mt-1 text-xs leading-snug text-gray-600 sm:text-sm">
            Chat with our AI to get personalized financial education.
          </p>
        </div>

        {/* Chat interface - always shown */}
        <ChatInterface />
      </div>
    </div>
  );
}
