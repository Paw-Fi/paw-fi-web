"use client";

import { useAIChat } from "@/contexts/ai-chat-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface EmptyStatePromptProps {
  /** Type of content being generated */
  type: 'courses' | 'portfolio';
  /** Optional custom title */
  title?: string;
  /** Optional custom description */
  description?: string;
  /** Optional custom button text */
  buttonText?: string;
  /** Optional custom navigation path */
  navigationPath?: string;
}

export function EmptyStatePrompt({ 
  type,
  title,
  description,
  buttonText,
}: EmptyStatePromptProps) {
  const defaultContent = {
    courses: {
      title: "Your Learning Journey Awaits!",
      description: "Create personalized courses tailored to your financial goals and learning style with our AI assistant.",
      buttonText: "Start Learning with AI",
      icon: (
        <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      )
    },
    portfolio: {
      title: "Create Your Financial Portfolio!",
      description: "Build a personalized financial dashboard tailored to your goals and situation with our AI assistant.",
      buttonText: "Start Building with AI",
      icon: (
        <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    }
  };

  const content = defaultContent[type];
  const finalTitle = title || content.title;
  const finalDescription = description || content.description;
  const finalButtonText = buttonText || content.buttonText;
  const {openChat} = useAIChat();

  return (
    <div className="col-span-full">
      <Card className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-card to-accent/5 p-12 text-center shadow-xl border-primary/20">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-primary/20 rounded-full opacity-20 -translate-x-16 -translate-y-16"></div>
        <div className="absolute bottom-0 right-0 w-24 h-24 bg-accent/20 rounded-full opacity-20 translate-x-12 translate-y-12"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-primary/10 rounded-full opacity-10"></div>
        
        <div className="relative z-10">
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent shadow-lg">
            {content.icon}
          </div>

          {/* Title */}
          <h3 className="mb-4 text-2xl font-bold text-foreground">
            {finalTitle}
          </h3>

          {/* Description */}
          <p className="mb-8 text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
            {finalDescription}
          </p>

          {/* Action button */}
          <Button
            onClick={() => openChat("advisor")}
            size="lg"
            className="group relative overflow-hidden bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl hover:scale-105 hover:shadow-2xl transition-all duration-300"
          >
            <span className="absolute inset-0 bg-white opacity-0 transition-opacity duration-300 group-hover:opacity-10"></span>
            <svg
              className="mr-3 h-6 w-6 transition-transform duration-300 group-hover:rotate-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <span className="relative">{finalButtonText}</span>
            <svg
              className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Button>
        </div>
      </Card>
    </div>
  );
}