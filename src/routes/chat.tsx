"use client";

import { createFileRoute, useSearch } from "@tanstack/react-router";
import { seo } from '@/utils/seo';
import { motion } from "framer-motion";
import AmbientHalo from "@/components/ui/ambient-halo";
import { ChatInterface } from "@/components/chat/chat-interface";

export const Route = createFileRoute("/chat")({
  component: Chat,
  head: () => {
    const title = "AI Chat | Moneko - Your Financial Assistant";
    const description = "Chat with Moneko's AI assistant for financial guidance, answers to your money questions, and help with navigating your finances.";
    const keywords = "AI chat, financial assistant, Moneko, money questions, financial help, chatbot";
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
  const searchParams = useSearch({ from: '/chat' });
  const initialQuestion = (searchParams as any)?.q || '';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative flex flex-col items-center justify-center max-w-4xl mx-auto flex-1 h-[80vh] mt-8 px-4 lg:px-0"
    >
      <AmbientHalo />
        {/* The ChatInterface will now fill this container. 
            It is responsible for its own header, scrolling, and input.
            The old header is removed to create a cleaner, more focused experience. */}
        <ChatInterface initialQuestion={initialQuestion} />
    </motion.div>
  );
}
