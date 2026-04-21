"use client";

import React from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Home,
  PiggyBank,
  Target,
  DollarSign,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAIChat } from "@/contexts/ai-chat-context";

interface ConversationInsights {
  hasConversations: boolean;
  totalConversations: number;
  totalMessages: number;
}

interface Calculator {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  color: string;
  category: string;
}

interface DashboardRightColumnProps {
  conversationInsights: ConversationInsights;
  availableCalculators: Calculator[];
  itemVariants: {
    hidden: { opacity: number; y: number };
    visible: { opacity: number; y: number; transition: { duration: number; ease: number[] } };
  };
}

/**
 * DashboardRightColumn - Right column cards for dashboard home
 * Contains: AI Assistant Card, Quick Tools Card, Essential Lessons Card
 */
export function DashboardRightColumn({
  conversationInsights,
  availableCalculators,
  itemVariants,
}: DashboardRightColumnProps) {
  const { openChat } = useAIChat();

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* AI Assistant Card - Mobile Optimized */}
      <motion.div variants={itemVariants}>
        <div className="rounded-2xl bg-white p-4 sm:rounded-3xl sm:p-6 md:p-8 dark:bg-slate-900">
          <div className="mb-6 sm:mb-8">
            <h2 className="text-foreground mb-1 text-lg font-medium sm:mb-2 sm:text-xl md:text-2xl">
              Moneko AI
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Your personal financial advisor
            </p>
          </div>

          {conversationInsights.hasConversations ? (
            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-muted/20 rounded-xl p-3 text-center sm:rounded-2xl sm:p-4">
                  <div className="text-foreground mb-0.5 text-xl font-light sm:mb-1 sm:text-2xl">
                    {conversationInsights.totalConversations}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Chats
                  </div>
                </div>
                <div className="bg-muted/20 rounded-xl p-3 text-center sm:rounded-2xl sm:p-4">
                  <div className="text-foreground mb-0.5 text-xl font-light sm:mb-1 sm:text-2xl">
                    {conversationInsights.totalMessages}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Messages
                  </div>
                </div>
              </div>

              <Button
                size="lg"
                onClick={() => openChat("advisor")}
                className="w-full rounded-full"
              >
                Continue Chat
              </Button>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              <div className="space-y-3 sm:space-y-4">
                <p className="text-muted-foreground mb-3 text-xs sm:mb-4 sm:text-sm">
                  Get personalized help with:
                </p>
                <div className="space-y-2 sm:space-y-3">
                  <div className="text-muted-foreground text-xs sm:text-sm">
                    Investment strategies
                  </div>
                  <div className="text-muted-foreground text-xs sm:text-sm">
                    Budget planning
                  </div>
                  <div className="text-muted-foreground text-xs sm:text-sm">
                    Financial goals
                  </div>
                </div>
              </div>
              <Button
                size="lg"
                onClick={() => openChat("advisor")}
                className="w-full rounded-full"
              >
                Start Chat
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Quick Tools Card - Mobile Optimized */}
      <motion.div variants={itemVariants}>
        <div className="rounded-2xl bg-white p-4 sm:rounded-3xl sm:p-6 md:p-8 dark:bg-slate-900">
          <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
            <div>
              <h2 className="text-foreground mb-1 text-lg font-medium sm:mb-2 sm:text-xl md:text-2xl">
                Quick Tools
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                Financial calculators
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="w-full rounded-full sm:w-auto"
            >
              <Link to="/calculators">View All</Link>
            </Button>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {availableCalculators.slice(0, 4).map((calculator) => {
              return (
                <motion.div
                  key={calculator.title}
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link to={calculator.path}>
                    <div className="bg-muted/10 hover:bg-muted/20 rounded-xl p-3 transition-colors duration-200 sm:rounded-2xl sm:p-4 dark:bg-slate-800/10 dark:hover:bg-slate-700/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="mb-0.5 text-xs font-medium sm:mb-1 sm:text-sm">
                            {calculator.title}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {calculator.category}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Essential Lessons Card - Mobile Optimized */}
      <motion.div variants={itemVariants}>
        <div className="rounded-2xl bg-white p-4 sm:rounded-3xl sm:p-6 md:p-8 dark:bg-slate-900">
          <div className="mb-6 sm:mb-8">
            <h2 className="text-foreground mb-1 text-lg font-medium sm:mb-2 sm:text-xl md:text-2xl">
              Essential Lessons
            </h2>
            <p className="text-foreground text-sm sm:text-base">
              Foundation knowledge
            </p>
          </div>

          <div className="bg-muted/20 rounded-xl p-4 sm:rounded-2xl sm:p-5 md:p-6 dark:bg-slate-800/20">
            <h4 className="text-foreground mb-2 text-base font-medium sm:mb-3 sm:text-lg">
              Your 2025 Guide to Investing
            </h4>
            <p className="text-muted-foreground mb-4 text-xs leading-relaxed sm:mb-6 sm:text-sm">
              Master investment fundamentals with 20+ comprehensive
              lessons
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
              <div className="text-muted-foreground text-xs sm:text-sm">
                20+ lessons available
              </div>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="w-full rounded-full sm:w-auto"
              >
                <Link to="/dashboard/essentials">Start Learning</Link>
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default DashboardRightColumn;
