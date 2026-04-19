"use client";

import { useState, useEffect, useRef } from "react";
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid";
import { OrbitingCircles } from "@/components/ui/orbiting-circles";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useInView } from "react-intersection-observer";
import { motion } from "framer-motion";
import { Zap, Wallet, Users, BrainCircuit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import monekoIcon from "@/assets/images/logo/moneko.png";
import lunchReceipt from "@/assets/images/index/lunch-receipt.jpeg";
import { useClientCurrencySymbol } from "@/hooks/use-client-currency-symbol";
import { useReducedVisualEffects } from "@/hooks/use-reduced-visual-effects";

// --- Component 1: WhatsApp Assistant Visual ---
interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  showTyping?: boolean;
  imageSrc?: string;
  imageAlt?: string;
}

const WhatsAppVisual = () => {
  const { ref, inView } = useInView({ threshold: 0.3, triggerOnce: true });
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currencySymbol = useClientCurrencySymbol();
  const reducedVisualEffects = useReducedVisualEffects();

  // Conversation flow definition
  const conversationFlow: { delay: number; msg: Message }[] = [
    {
      delay: 300,
      msg: {
        role: "user",
        content: "",
        timestamp: "10:42 AM",
        imageSrc: lunchReceipt,
        imageAlt: "Lunch receipt",
      },
    },
    {
      delay: 1000,
      msg: {
        role: "assistant",
        content: `Got it! 🍽️ Logged to Food.`,
        timestamp: "10:42 AM",
        showTyping: true,
      },
    },
    {
      delay: 1700,
      msg: {
        role: "assistant",
        content: "Do you want to see your total spending today?",
        timestamp: "10:42 AM",
        showTyping: true,
      },
    },
    {
      delay: 2700,
      msg: { role: "user", content: "Yes please", timestamp: "10:43 AM" },
    },
    {
      delay: 3200,
      msg: {
        role: "assistant",
        content: `You've spent ${currencySymbol}82.50 today across 3 transactions. 📉`,
        timestamp: "10:43 AM",
        showTyping: true,
      },
    },
  ];

  useEffect(() => {
    if (inView) {
      // Reset messages when re-entering view for replayability
      setMessages([]);

      const timeouts: NodeJS.Timeout[] = [];

      conversationFlow.forEach(({ delay, msg }) => {
        const timeout = setTimeout(
          () => {
            setMessages((prev) => [...prev, msg]);
          },
          reducedVisualEffects ? Math.min(delay, 600) : delay,
        );
        timeouts.push(timeout);
      });

      return () => timeouts.forEach(clearTimeout);
    }
  }, [inView]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={ref}
      className="relative flex h-full w-full flex-col overflow-hidden bg-[#efeae2] p-6 transition-colors duration-300 dark:bg-[#0b141a]"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-25 dark:opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.1) 1px, transparent 0)",
          backgroundSize: "14px 14px",
        }}
      />

      <div
        ref={scrollRef}
        className="scrollbar-hide pointer-events-none relative z-10 min-h-0 flex-1 space-y-3 overflow-y-auto pb-20"
        style={{ scrollBehavior: "smooth" }}
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex items-start gap-2 ${msg.role === "user" ? "justify-end" : ""} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            {msg.role === "assistant" && (
              <Avatar className="mt-1 size-8 flex-shrink-0">
                <AvatarImage src={monekoIcon} alt="Moneko AI" />
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
            )}

            <div
              className={`max-w-[85%] p-2 px-3 text-sm shadow-sm ${
                msg.role === "user"
                  ? "rounded-lg rounded-tr-none bg-[#d9fdd3] text-black dark:bg-[#005c4b] dark:text-[#e9edef]"
                  : "rounded-lg rounded-tl-none bg-white text-black dark:bg-[#202c33] dark:text-[#e9edef]"
              }`}
            >
              {msg.imageSrc && (
                <img
                  src={msg.imageSrc}
                  alt={msg.imageAlt ?? "Receipt"}
                  className="mb-1 w-full max-w-[220px] rounded-md border border-black/5 object-cover"
                  width={220}
                  height={140}
                  loading="lazy"
                  decoding="async"
                />
              )}
              {msg.content.length > 0 &&
                (msg.showTyping && !reducedVisualEffects ? (
                  <TypingAnimation
                    className="text-sm leading-normal font-normal tracking-normal"
                    duration={10}
                    startOnView={false}
                  >
                    {msg.content}
                  </TypingAnimation>
                ) : (
                  <p>{msg.content}</p>
                ))}
              <span className="mt-1 block text-right text-[10px] text-gray-500 opacity-70 dark:text-[#8696a0]">
                {msg.timestamp}
              </span>
            </div>

            {msg.role === "user" && (
              <Avatar className="mt-1 size-8 flex-shrink-0">
                <AvatarImage
                  src="https://randomuser.me/api/portraits/men/32.jpg"
                  alt="User"
                />
                <AvatarFallback>Me</AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
        {/* Spacer for scroll */}
        <div className="h-4" />
      </div>
    </div>
  );
};

// --- Component 2: Household Orbit (With Real Pictures) ---
const FeatureTag = ({ label }: { label: string }) => (
  <div className="relative flex h-full !w-64 items-center justify-center">
    <span
      aria-hidden="true"
      className="bg-primary shadow-primary/30 block h-2 w-2 rounded-full shadow-sm"
    />
    <Badge
      aria-label={label}
      variant="outline"
      className="bg-card/80 border-border text-foreground absolute left-full ml-2 rounded-full border px-3 py-1 text-xs font-medium shadow-sm backdrop-blur"
    >
      {label}
    </Badge>
  </div>
);

const HouseholdOrbitVisual = () => {
  const reducedVisualEffects = useReducedVisualEffects();
  const motionSpeed = reducedVisualEffects ? 0 : 1;

  return (
    <div className="relative h-full min-h-full w-full overflow-hidden bg-gradient-to-br from-orange-50/50 to-amber-50/50 dark:from-orange-950/30 dark:to-amber-950/30">
      <div className="absolute inset-0 top-12 flex scale-110 items-center justify-center">
        {motionSpeed > 0 && (
          <>
            {/* Inner Ring: People (Real Photos) */}
            <OrbitingCircles
              iconSize={40}
              radius={80}
              duration={30}
              path
              speed={motionSpeed}
            >
              <Avatar className="border-2 border-white shadow-sm">
                <AvatarImage src="https://randomuser.me/api/portraits/women/44.jpg" />
              </Avatar>
              <Avatar className="border-2 border-white shadow-sm">
                <AvatarImage src="https://randomuser.me/api/portraits/men/32.jpg" />
              </Avatar>
            </OrbitingCircles>

            {/* Outer Ring: Categories */}
            <OrbitingCircles
              iconSize={10}
              radius={130}
              duration={40}
              reverse
              path
              speed={motionSpeed}
            >
              <FeatureTag label="Rent Split" />
              <FeatureTag label="Joint Savings" />
              <FeatureTag label="Shared Bills" />
              <FeatureTag label="Joint Expenses" />
            </OrbitingCircles>
          </>
        )}
      </div>
    </div>
  );
};

// --- Component 3: Pockets Liquid Visual (Enhanced Double Wave) ---
const PocketsLiquidVisual = () => {
  const currencySymbol = useClientCurrencySymbol();
  const reducedVisualEffects = useReducedVisualEffects();

  // Mock Pocket Data
  const pockets = [
    { name: "Food", total: 500, spent: 320, color: "#f97316" }, // Orange
    { name: "Travel", total: 200, spent: 150, color: "#3b82f6" }, // Blue
    { name: "Fun", total: 100, spent: 40, color: "#a855f7" }, // Purple
    { name: "Bills", total: 400, spent: 380, color: "#ef4444" }, // Red
    { name: "Health", total: 150, spent: 20, color: "#10b981" }, // Green
  ];

  return (
    <div className="flex h-full min-h-full w-full flex-col justify-center bg-gradient-to-br from-pink-50/50 to-rose-50/50 p-6 dark:from-pink-950/30 dark:to-rose-950/30">
      <div className="flex h-[180px] items-end justify-center gap-4">
        {pockets.map((pocket, i) => {
          const percent = Math.min((pocket.spent / pocket.total) * 100, 100);
          const showWave = !reducedVisualEffects && percent > 55;

          return (
            <div
              key={pocket.name}
              className="group flex flex-col items-center gap-2"
            >
              {/* Glass Container */}
              <div className="relative h-24 w-12 overflow-hidden rounded-2xl border border-white/30 bg-white/20 shadow-sm backdrop-blur-sm sm:h-32 sm:w-16 dark:border-white/10 dark:bg-white/5">
                {/* Liquid Fill */}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${percent}%` }}
                  transition={{
                    duration: reducedVisualEffects ? 0.35 : 1.2,
                    delay: reducedVisualEffects ? 0 : i * 0.12,
                    type: "spring",
                    bounce: 0.12,
                  }}
                  className="absolute bottom-0 left-0 w-full"
                  style={{ backgroundColor: pocket.color, minHeight: "2px" }}
                >
                  {showWave && (
                    <div className="absolute inset-x-0 top-0 h-3 -translate-y-1 rounded-full bg-white/25" />
                  )}
                </motion.div>
              </div>

              {/* Labels */}
              <div className="text-center">
                <p className="text-foreground text-[10px] font-semibold sm:text-xs">
                  {pocket.name}
                </p>
                <p className="text-muted-foreground text-[9px] sm:text-[10px]">
                  {currencySymbol}
                  {pocket.spent}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- Component 4: Insights Chat (Corrected Query) ---
const InsightsVisual = () => {
  const { ref, inView } = useInView({ threshold: 0.3, triggerOnce: true });
  const [step, setStep] = useState(0);
  const currencySymbol = useClientCurrencySymbol();
  const reducedVisualEffects = useReducedVisualEffects();

  useEffect(() => {
    if (inView) {
      const stepOneDelay = reducedVisualEffects ? 150 : 1000;
      const stepTwoDelay = reducedVisualEffects ? 350 : 2500;
      const stepOneTimeout = window.setTimeout(() => setStep(1), stepOneDelay);
      const stepTwoTimeout = window.setTimeout(() => setStep(2), stepTwoDelay);

      return () => {
        window.clearTimeout(stepOneTimeout);
        window.clearTimeout(stepTwoTimeout);
      };
    }
  }, [inView, reducedVisualEffects]);

  return (
    <div
      ref={ref}
      className="flex h-full min-h-full w-full flex-col bg-gradient-to-br from-cyan-50/50 to-blue-50/50 p-6 dark:from-cyan-950/30 dark:to-blue-950/30"
    >
      <div className="flex-1 space-y-4">
        {/* Question */}
        <div className="flex items-start justify-end gap-3">
          <div className="bg-card max-w-[85%] rounded-2xl rounded-tr-sm p-3 shadow-sm">
            <p className="text-foreground text-sm">
              Can I buy a {currencySymbol}2,000 laptop before Jan 2, 2026?
            </p>
          </div>
        </div>

        {/* Answer */}
        {step >= 1 && (
          <div className="flex items-start gap-3">
            <img
              src={monekoIcon}
              className="size-8 rounded-full"
              alt="AI"
              width={32}
              height={32}
              loading="lazy"
              decoding="async"
            />
            <div className="bg-primary text-primary-foreground max-w-[90%] rounded-2xl rounded-tl-sm p-3 shadow-sm dark:text-white">
              <p className="text-sm">
                Yes! Based on your current savings rate of {currencySymbol}
                400/mo, you'll reach {currencySymbol}2,000 by{" "}
                <span className="font-bold underline">December 15th</span>.
              </p>
            </div>
          </div>
        )}

        {/* Visual Aid */}
        {step >= 2 && (
          <div className="bg-card/80 border-border/50 animate-in fade-in slide-in-from-bottom-2 ml-11 rounded-xl border p-4 shadow-sm backdrop-blur-sm">
            <div className="mb-2 flex items-end justify-between">
              <span className="text-muted-foreground text-xs">
                Projected Savings
              </span>
              <span className="text-primary text-sm font-bold">
                {currencySymbol}2,400
              </span>
            </div>
            {/* Simple bar visual */}
            <div className="flex h-12 items-end gap-1">
              <div className="bg-primary/20 h-[40%] w-1/4 rounded-t-sm"></div>
              <div className="bg-primary/40 h-[60%] w-1/4 rounded-t-sm"></div>
              <div className="bg-primary/60 h-[80%] w-1/4 rounded-t-sm"></div>
              <div className="bg-primary relative h-full w-1/4 rounded-t-sm">
                <div className="bg-foreground text-background absolute -top-6 left-1/2 -translate-x-1/2 rounded px-1.5 py-0.5 text-[10px]">
                  Goal
                </div>
              </div>
            </div>
            <div className="text-muted-foreground mt-1 flex justify-between text-[10px]">
              <span>Oct</span>
              <span>Nov</span>
              <span>Dec</span>
              <span>Jan</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const features = [
  {
    Icon: Zap,
    name: "WhatsApp Assistant",
    description:
      "Log expenses from WhatsApp with text, voice notes, receipt photos, PDFs, or spreadsheets.",
    href: "/features/whatsapp-assistant",
    cta: "Chat on WhatsApp",
    className:
      "col-span-1 lg:col-span-1 lg:row-span-2 min-h-[500px] lg:min-h-[300px]",
    component: <WhatsAppVisual />,
  },
  {
    Icon: Wallet,
    name: "Pockets System",
    description:
      "Use envelope-style Pockets to plan spending before money leaves your account.",
    href: "/features/pockets-system",
    cta: "Learn about pockets",
    className: "col-span-1 lg:col-span-1 min-h-[300px] lg:min-h-[200px]",
    component: <PocketsLiquidVisual />,
  },
  {
    Icon: Users,
    name: "Household Mode",
    description:
      "Separate personal spending from shared bills, rent, groceries, and partner reimbursements.",
    href: "/features/household-mode",
    cta: "Explore households",
    className: "col-span-1 lg:col-span-1 min-h-[300px] lg:min-h-[200px]",
    component: <HouseholdOrbitVisual />,
  },
  {
    Icon: BrainCircuit,
    name: "AI Insights",
    description:
      'Ask "Can I buy this?" and get answers based on your budget, pockets, and goals.',
    href: "/features/ai-insights",
    cta: "Ask Moneko",
    className: "col-span-1 lg:col-span-2 min-h-[400px] lg:min-h-[250px]",
    component: <InsightsVisual />,
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            AI budgeting tools for daily spending, pockets, and shared money
          </h2>
          <p className="text-muted-foreground mx-auto max-w-[800px] text-lg">
            Moneko combines chat-based expense capture, envelope budgeting, and
            household workflows in one personal finance app.
          </p>
        </div>
        <BentoGrid className="mx-auto max-w-5xl auto-rows-auto lg:auto-rows-[20rem]">
          {features.map((feature) => (
            <BentoCard key={feature.name} {...feature} />
          ))}
        </BentoGrid>
      </div>
    </section>
  );
}
