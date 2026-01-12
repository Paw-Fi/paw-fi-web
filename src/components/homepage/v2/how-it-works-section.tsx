"use client";

import React from "react";
import { Carousel } from "@/components/ui/apple-cards-carousel";
import { Zap, Wallet, Users, MessageCircle, BarChart3, Smartphone, Home } from "lucide-react";
import { motion } from "motion/react";

export function HowItWorksSection() {
  const cards = data.map((card, index) => (
    <StepCard key={card.src} card={card} index={index} />
  ));

  return (
    <section className="w-full py-24 bg-background overflow-hidden relative border-t border-border/40">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl opacity-50" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-3xl opacity-50" />
        </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16 space-y-4">
            <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-3xl md:text-5xl font-bold tracking-tight bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent"
            >
            Simplicity in Motion.
            </motion.h2>
            <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
            >
            Moneko replaces spreadsheets with a conversation. <br className="hidden md:block"/>
            Here's how you get control of your money in 4 steps.
            </motion.p>
        </div>
        
        <Carousel items={cards} />
      </div>
    </section>
  );
}

const StepCard = ({ card, index }: { card: Card; index: number }) => {
  return (
    <div className="p-4 md:p-6 bg-card dark:bg-neutral-900 border border-border/50 rounded-3xl h-full flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow duration-300 min-w-[280px] md:min-w-[360px] max-w-[360px] mx-4">
      <div className="space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <card.icon className="w-6 h-6 text-primary" />
        </div>
        
        <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Step 0{index + 1}
            </div>
            <h3 className="text-2xl font-bold text-foreground leading-tight">
            {card.title}
            </h3>
        </div>

        <p className="text-muted-foreground text-sm leading-relaxed">
          {card.description}
        </p>
      </div>

      <div className="mt-8 relative aspect-[4/3] rounded-2xl overflow-hidden bg-muted/30 border border-border/20 flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-500">
         <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/5 dark:to-white/5 pointer-events-none" />
         <card.visual />
      </div>
    </div>
  );
};

const data = [
  {
    category: "Onboarding",
    title: "Choose Your Mode",
    description: "Start solo, sync with a partner in Couple Mode, or manage shared bills in Household Mode.",
    src: "step-1",
    icon: Users,
    visual: () => (
        <div className="flex flex-col gap-3 w-full px-6 items-center justify-center h-full">
            <div className="flex gap-3 w-full justify-center">
                <div className="bg-blue-500/10 dark:bg-blue-500/20 p-3 rounded-2xl flex flex-col items-center gap-2 w-24 border border-blue-500/20 shadow-sm">
                   <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Users className="w-4 h-4 text-blue-500"/>
                   </div>
                   <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">Solo</span>
                </div>
                <div className="bg-purple-500/10 dark:bg-purple-500/20 p-3 rounded-2xl flex flex-col items-center gap-2 w-24 border border-purple-500/20 shadow-sm">
                   <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <Users className="w-4 h-4 text-purple-500"/>
                   </div>
                   <span className="text-[10px] font-medium text-purple-600 dark:text-purple-400">Couple</span>
                </div>
            </div>
            <div className="bg-orange-500/10 dark:bg-orange-500/20 p-3 rounded-2xl flex flex-col items-center gap-2 w-24 border border-orange-500/20 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                     <Home className="w-4 h-4 text-orange-500"/>
                </div>
                <span className="text-[10px] font-medium text-orange-600 dark:text-orange-400">Family</span>
            </div>
        </div>
    )
  },
  {
    category: "Setup",
    title: "Fill Your Pockets",
    description: "Give every dollar a job. Allocate income to Rent, Fun, and Savings before you spend.",
    src: "step-2",
    icon: Wallet,
    visual: () => (
        <div className="w-full h-full p-6 flex flex-col justify-center gap-3">
            {/* Income Source */}
            <div className="w-full bg-green-500/10 dark:bg-green-500/20 p-2.5 rounded-xl flex items-center gap-3 border border-green-500/20 shadow-sm">
                <div className="p-1.5 bg-green-500 rounded-lg text-white shadow"><Zap size={12}/></div>
                <div className="flex-1 space-y-1.5">
                    <div className="h-1.5 w-16 bg-green-500/20 rounded-full"></div>
                    <div className="h-1 w-24 bg-green-500/10 rounded-full"></div>
                </div>
            </div>
            
            {/* Arrows down */}
            <div className="flex justify-around text-muted-foreground/30 px-2">
                <div className="h-4 w-px bg-current opacity-50" />
                <div className="h-4 w-px bg-current opacity-50" />
                <div className="h-4 w-px bg-current opacity-50" />
            </div>

            {/* Pockets Row */}
            <div className="flex gap-2 justify-between">
                <div className="bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 rounded-xl p-2 flex flex-col items-center gap-1.5 w-full">
                    <span className="text-sm">🏠</span>
                    <div className="h-1 w-8 bg-red-500/30 rounded-full"/>
                </div>
                <div className="bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 rounded-xl p-2 flex flex-col items-center gap-1.5 w-full">
                     <span className="text-sm">✈️</span>
                     <div className="h-1 w-8 bg-blue-500/30 rounded-full"/>
                </div>
                <div className="bg-pink-500/10 dark:bg-pink-500/20 border border-pink-500/20 rounded-xl p-2 flex flex-col items-center gap-1.5 w-full">
                     <span className="text-sm">🎮</span>
                     <div className="h-1 w-8 bg-pink-500/30 rounded-full"/>
                </div>
            </div>
        </div>
    )
  },
  {
    category: "Action",
    title: "Chat to Track",
    description: "No manual entry. Just text 'Lunch $12' or send a voice note to Moneko on WhatsApp.",
    src: "step-3",
    icon: MessageCircle,
    visual: () => (
        <div className="w-full h-full flex items-center justify-center p-4">
            <div className="w-full max-w-[260px] flex flex-col gap-3">
                <div className="self-end bg-primary shadow-sm text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 text-xs max-w-[85%] animate-in fade-in slide-in-from-bottom-2">
                    Groceries $65.20 at Whole Foods 🍎
                </div>
                <div className="self-start bg-white dark:bg-neutral-800 border border-border/50 rounded-2xl rounded-tl-sm px-4 py-3 text-xs shadow-sm max-w-[90%] space-y-1.5 animate-in fade-in slide-in-from-bottom-3 delay-150 fill-mode-forwards opacity-0" style={{ animationDelay: '150ms' }}>
                    <div className="font-semibold text-primary flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Logged to Groceries
                    </div>
                    <div className="text-muted-foreground leading-relaxed">
                        Budget remaining: <span className="text-foreground font-medium">$134.80</span>
                    </div>
                </div>
            </div>
        </div>
    )
  },
  {
    category: "Result",
    title: "Get Answers",
    description: "Don't guess. Ask 'Can I afford a trip to Japan?' and get an answer based on your real data.",
    src: "step-4",
    icon: BarChart3,
    visual: () => (
        <div className="relative w-full h-full flex items-center justify-center p-4">
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
                <BarChart3 className="w-32 h-32" />
            </div>
            
            <div className="bg-card dark:bg-neutral-800/90 backdrop-blur-sm border border-border/50 shadow-lg rounded-2xl p-4 max-w-[240px] w-full space-y-3 relative z-10 transition-transform hover:scale-105 duration-300">
                 <div className="flex gap-2.5 items-center border-b border-border/40 pb-2.5">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center text-[8px] font-bold text-white">AI</div>
                    <span className="text-xs font-semibold text-muted-foreground">Moneko Insights</span>
                 </div>
                 
                 <div className="space-y-2">
                    <div className="bg-primary/5 rounded-lg p-2 text-xs text-foreground font-medium flex gap-2">
                        <span className="text-lg">🤖</span>
                         Based on your savings rate, you can afford Japan in 4 months.
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground justify-between pt-1">
                        <span>Savings Rate</span>
                        <span className="text-green-500 font-bold">+12% 📈</span>
                    </div>
                 </div>
            </div>
        </div>
    )
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
