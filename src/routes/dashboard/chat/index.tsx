"use client";

import { createFileRoute, useSearch } from "@tanstack/react-router";
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';
import { motion } from "framer-motion";
import AmbientHalo from "@/components/ui/ambient-halo";
import { ChatInterface } from "@/components/chat/chat-interface";

export const Route = createFileRoute("/dashboard/chat/")({
  component: Chat,
  head: () => {
    const title = "AI Chat | Moneko - Your Financial Assistant";
    const description = "Chat with Moneko's AI assistant for financial guidance, answers to your money questions, and help with navigating your finances.";
    const keywords = "AI chat, financial assistant, Moneko, money questions, financial help, chatbot";
    const imageUrl = 'https://moneko.io/og-img.png';
    const pageUrl = getCanonicalUrl('/dashboard/chat');

    const meta = seo({
      title: title,
      description: description,
      keywords: keywords,
      image: imageUrl,
      url: pageUrl,
    });    
    return {      
      meta,
      link: [
        {
          rel: 'canonical',
          href: pageUrl
        }
      ]
    };
  },
});

function Chat() {
  const searchParams = useSearch({ from: '/dashboard/chat/' });
  const initialQuestion = (searchParams as any)?.q || '';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative h-full flex flex-col items-center justify-center container flex-1 overflow-hidden max-w-[80rem] mx-auto" 
    >
\        {/* The ChatInterface will now fill this container. 
            It is responsible for its own header, scrolling, and input.
            The old header is removed to create a cleaner, more focused experience. */}
        <ChatInterface initialQuestion={initialQuestion} />
    </motion.div>
  );
}
