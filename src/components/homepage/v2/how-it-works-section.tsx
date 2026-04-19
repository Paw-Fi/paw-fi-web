"use client";

import React from "react";
import { Carousel } from "@/components/ui/apple-cards-carousel";
import {
  Zap,
  Wallet,
  Users,
  MessageCircle,
  BarChart3,
  Smartphone,
  Home,
} from "lucide-react";
import { motion } from "motion/react";

export function HowItWorksSection() {
  const cards = data.map((card, index) => (
    <StepCard key={card.src} card={card} index={index} />
  ));

  return (
    <section className="bg-background border-border/40 relative w-full overflow-hidden border-t py-24">
      {/* Background Gradients */}
      <div className="pointer-events-none absolute top-0 left-0 h-full w-full overflow-hidden">
        <div className="bg-primary/5 absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full opacity-50 blur-3xl" />
        <div className="absolute right-[-10%] bottom-[-10%] h-[40%] w-[40%] rounded-full bg-blue-500/5 opacity-50 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 space-y-4 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="from-foreground to-muted-foreground bg-gradient-to-br bg-clip-text text-3xl font-bold tracking-tight text-transparent md:text-5xl"
          >
            How Moneko turns chats into a working budget
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground mx-auto max-w-2xl text-lg md:text-xl"
          >
            Start with a personal, couple, or household budget. Then capture
            spending, update Pockets, and ask what your money can support next.
          </motion.p>
        </div>

        <Carousel items={cards} />
      </div>
    </section>
  );
}

const StepCard = ({ card, index }: { card: Card; index: number }) => {
  return (
    <div className="bg-card border-border/50 mx-4 flex h-full max-w-[360px] min-w-[280px] flex-col justify-between rounded-3xl border p-4 shadow-sm transition-shadow duration-300 hover:shadow-md md:min-w-[360px] md:p-6 dark:bg-neutral-900">
      <div className="space-y-4">
        <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-2xl">
          <card.icon className="text-primary h-6 w-6" />
        </div>

        <div>
          <div className="text-muted-foreground mb-1 text-xs font-semibold tracking-wider uppercase">
            Step 0{index + 1}
          </div>
          <h3 className="text-foreground text-2xl leading-tight font-bold">
            {card.title}
          </h3>
        </div>

        <p className="text-muted-foreground text-sm leading-relaxed">
          {card.description}
        </p>
      </div>

      <div className="bg-muted/30 border-border/20 relative mt-8 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border transition-transform duration-500 group-hover:scale-[1.02]">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent to-black/5 dark:to-white/5" />
        <card.visual />
      </div>
    </div>
  );
};

const data = [
  {
    category: "Onboarding",
    title: "Choose Your Mode",
    description:
      "Start solo, invite a partner, or create a household space for shared bills and groceries.",
    src: "step-1",
    icon: Users,
    visual: () => (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6">
        <div className="flex w-full justify-center gap-3">
          <div className="flex w-24 flex-col items-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3 shadow-sm dark:bg-blue-500/20">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20">
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
              Solo
            </span>
          </div>
          <div className="flex w-24 flex-col items-center gap-2 rounded-2xl border border-purple-500/20 bg-purple-500/10 p-3 shadow-sm dark:bg-purple-500/20">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20">
              <Users className="h-4 w-4 text-purple-500" />
            </div>
            <span className="text-[10px] font-medium text-purple-600 dark:text-purple-400">
              Couple
            </span>
          </div>
        </div>
        <div className="flex w-24 flex-col items-center gap-2 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-3 shadow-sm dark:bg-orange-500/20">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/20">
            <Home className="h-4 w-4 text-orange-500" />
          </div>
          <span className="text-[10px] font-medium text-orange-600 dark:text-orange-400">
            Family
          </span>
        </div>
      </div>
    ),
  },
  {
    category: "Setup",
    title: "Fill Your Pockets",
    description:
      "Allocate income to rent, food, savings, and flexible spending before the month begins.",
    src: "step-2",
    icon: Wallet,
    visual: () => (
      <div className="flex h-full w-full flex-col justify-center gap-3 p-6">
        {/* Income Source */}
        <div className="flex w-full items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/10 p-2.5 shadow-sm dark:bg-green-500/20">
          <div className="rounded-lg bg-green-500 p-1.5 text-white shadow">
            <Zap size={12} />
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="h-1.5 w-16 rounded-full bg-green-500/20"></div>
            <div className="h-1 w-24 rounded-full bg-green-500/10"></div>
          </div>
        </div>

        {/* Arrows down */}
        <div className="text-muted-foreground/30 flex justify-around px-2">
          <div className="h-4 w-px bg-current opacity-50" />
          <div className="h-4 w-px bg-current opacity-50" />
          <div className="h-4 w-px bg-current opacity-50" />
        </div>

        {/* Pockets Row */}
        <div className="flex justify-between gap-2">
          <div className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 p-2 dark:bg-red-500/20">
            <span className="text-sm">🏠</span>
            <div className="h-1 w-8 rounded-full bg-red-500/30" />
          </div>
          <div className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-blue-500/20 bg-blue-500/10 p-2 dark:bg-blue-500/20">
            <span className="text-sm">✈️</span>
            <div className="h-1 w-8 rounded-full bg-blue-500/30" />
          </div>
          <div className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-pink-500/20 bg-pink-500/10 p-2 dark:bg-pink-500/20">
            <span className="text-sm">🎮</span>
            <div className="h-1 w-8 rounded-full bg-pink-500/30" />
          </div>
        </div>
      </div>
    ),
  },
  {
    category: "Action",
    title: "Chat to Track",
    description:
      "Text an expense, send a receipt, or record a voice note from WhatsApp when spending happens.",
    src: "step-3",
    icon: MessageCircle,
    visual: () => (
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="flex w-full max-w-[260px] flex-col gap-3">
          <div className="bg-primary text-primary-foreground animate-in fade-in slide-in-from-bottom-2 max-w-[85%] self-end rounded-2xl rounded-tr-sm px-4 py-2.5 text-xs shadow-sm">
            Groceries $65.20 at Whole Foods 🍎
          </div>
          <div
            className="border-border/50 animate-in fade-in slide-in-from-bottom-3 fill-mode-forwards max-w-[90%] space-y-1.5 self-start rounded-2xl rounded-tl-sm border bg-white px-4 py-3 text-xs opacity-0 shadow-sm delay-150 dark:bg-neutral-800"
            style={{ animationDelay: "150ms" }}
          >
            <div className="text-primary flex items-center gap-1.5 font-semibold">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
              Logged to Groceries
            </div>
            <div className="text-muted-foreground leading-relaxed">
              Budget remaining:{" "}
              <span className="text-foreground font-medium">$134.80</span>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    category: "Result",
    title: "Get Answers",
    description:
      "Ask whether a goal or purchase fits your budget and get an answer grounded in your entries.",
    src: "step-4",
    icon: BarChart3,
    visual: () => (
      <div className="relative flex h-full w-full items-center justify-center p-4">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03] dark:opacity-[0.05]">
          <BarChart3 className="h-32 w-32" />
        </div>

        <div className="bg-card border-border/50 relative z-10 w-full max-w-[240px] space-y-3 rounded-2xl border p-4 shadow-lg backdrop-blur-sm transition-transform duration-300 hover:scale-105 dark:bg-neutral-800/90">
          <div className="border-border/40 flex items-center gap-2.5 border-b pb-2.5">
            <div className="from-primary flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr to-purple-500 text-[8px] font-bold text-white">
              AI
            </div>
            <span className="text-muted-foreground text-xs font-semibold">
              Moneko Insights
            </span>
          </div>

          <div className="space-y-2">
            <div className="bg-primary/5 text-foreground flex gap-2 rounded-lg p-2 text-xs font-medium">
              <span className="text-lg">🤖</span>
              Based on your savings rate, you can afford Japan in 4 months.
            </div>
            <div className="text-muted-foreground flex items-center justify-between gap-2 pt-1 text-[10px]">
              <span>Savings Rate</span>
              <span className="font-bold text-green-500">+12% 📈</span>
            </div>
          </div>
        </div>
      </div>
    ),
  },
];

type Card = {
  title: string;
  category: string;
  description: string;
  src: string;
  icon: any;
  visual: React.ComponentType;
};
