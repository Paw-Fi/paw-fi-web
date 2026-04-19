"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Mic, Camera, Type, MessageSquare, Send } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid";
import { Iphone } from "@/components/ui/iphone";
import receiptImg from "@assets/images/index/lunch-receipt.jpeg";
import { useReducedVisualEffects } from "@/hooks/use-reduced-visual-effects";

export function CaptureSection() {
  const [activeTab, setActiveTab] = useState<"text" | "voice" | "camera">(
    "text",
  );
  const reducedVisualEffects = useReducedVisualEffects();

  useEffect(() => {
    if (reducedVisualEffects) {
      return;
    }

    const interval = setInterval(() => {
      setActiveTab((prev) => {
        if (prev === "text") return "voice";
        if (prev === "voice") return "camera";
        return "text";
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [reducedVisualEffects]);

  return (
    <section className="bg-background border-border/40 relative w-full border-t py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
          {/* Left Column: Text Content & "Tabs" */}
          <div className="space-y-8 lg:col-span-5">
            <div>
              <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-5xl">
                Capture spending from chat. <br />
                <span className="text-primary">Review it before saving.</span>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Moneko lives where you already talk about money. Send a message,
                voice note, or receipt photo on WhatsApp, then confirm the
                amount, merchant, and category before it updates your budget.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <FeatureRow
                active={activeTab === "text"}
                onClick={() => setActiveTab("text")}
                icon={Type}
                title="Text an expense"
                description="Type 'Lunch $15' and Moneko suggests the category."
              />
              <FeatureRow
                active={activeTab === "voice"}
                onClick={() => setActiveTab("voice")}
                icon={Mic}
                title="Send a voice note"
                description="On the go? Moneko transcribes the note and prepares the entry."
              />
              <FeatureRow
                active={activeTab === "camera"}
                onClick={() => setActiveTab("camera")}
                icon={Camera}
                title="Scan a receipt"
                description="Take a receipt photo and review the extracted details."
              />
            </div>
          </div>

          {/* Right Column: iPhone Visual */}
          <div className="relative flex justify-center lg:col-span-7 lg:justify-end">
            {/* Decorative blob */}
            <div
              className={cn(
                "absolute top-1/2 left-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60",
                reducedVisualEffects
                  ? "bg-primary/10 h-[85%] w-[85%]"
                  : "from-primary/10 h-[120%] w-[120%] bg-gradient-to-tr via-purple-500/10 to-blue-500/10 blur-3xl",
              )}
            />

            <div className="relative">
              <Iphone className="h-[650px]">
                <DemoScreen mode={activeTab} />
              </Iphone>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureRow({ active, onClick, icon: Icon, title, description }: any) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex cursor-pointer items-start gap-4 rounded-xl border border-transparent p-4 transition-all duration-300",
        active
          ? "bg-accent border-border scale-[1.02] shadow-sm"
          : "hover:bg-accent/50 hover:scale-[1.01]",
      )}
    >
      <div
        className={cn(
          "rounded-xl p-3 transition-colors",
          active
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground group-hover:text-foreground",
        )}
      >
        <Icon size={24} />
      </div>
      <div>
        <h3
          className={cn(
            "text-lg font-semibold",
            active
              ? "text-foreground"
              : "text-muted-foreground group-hover:text-foreground",
          )}
        >
          {title}
        </h3>
        <p className="text-muted-foreground mt-1 text-sm leading-snug">
          {description}
        </p>
      </div>
    </div>
  );
}

function DemoScreen({ mode }: { mode: "text" | "voice" | "camera" }) {
  const reducedVisualEffects = useReducedVisualEffects();

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#efeae2] font-sans transition-colors duration-300 dark:bg-[#0b141a]">
      {/* WhatsApp Header */}
      <div className="z-10 flex items-center gap-3 bg-white p-3 shadow-sm transition-colors duration-300 dark:bg-[#202c33]">
        <div className="from-primary flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br to-purple-600 text-xs font-bold text-white">
          M
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-black dark:text-[#e9edef]">
            Moneko AI
          </div>
          <div className="text-[10px] text-gray-500 dark:text-[#8696a0]">
            online
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="relative flex-1 space-y-4 overflow-y-auto p-4">
        {/* Background Pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-30 dark:opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.1) 1px, transparent 0)",
            backgroundSize: "14px 14px",
          }}
        />

        <div className="relative z-10 mx-auto mb-6 w-max rounded-lg bg-[#e1f3fb] px-3 py-1 text-center text-[10px] tracking-wide text-[#54656f] uppercase opacity-90 shadow-sm transition-colors duration-300 dark:bg-[#1f2c34] dark:text-[#8696a0]">
          Today
        </div>

        <div className="relative z-10 space-y-4">
          {/* Previous Message Context */}

          {/* Dynamic Content Based on Mode */}
          <AnimatePresence initial={false} mode="wait">
            {mode === "text" && (
              <motion.div
                initial={reducedVisualEffects ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedVisualEffects ? { opacity: 1 } : { opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-lg rounded-tr-none bg-[#d9fdd3] p-2 px-3 text-sm text-black shadow-sm transition-colors duration-300 dark:bg-[#005c4b] dark:text-[#e9edef]">
                    Lunch with client $45.50
                    <span className="mt-1 block text-right text-[10px] text-gray-500 transition-colors duration-300 dark:text-[#8696a0]">
                      10:30 AM
                    </span>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-lg rounded-tl-none bg-white p-2 px-3 text-sm text-black shadow-sm transition-colors duration-300 dark:bg-[#202c33] dark:text-[#e9edef]">
                    <div className="text-primary mb-1 text-xs font-semibold">
                      Expense Logged
                    </div>
                    <div className="mb-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
                      <span className="text-gray-500 dark:text-gray-400">
                        Amount:
                      </span>{" "}
                      <span>$45.50</span>
                      <span className="text-gray-500 dark:text-gray-400">
                        Category:
                      </span>{" "}
                      <span>Dining Out</span>
                      <span className="text-gray-500 dark:text-gray-400">
                        Type:
                      </span>{" "}
                      <span>Business</span>
                    </div>
                    Logged "Lunch with client". Enjoy your meal! 🍔
                    <span className="mt-1 block text-right text-[10px] text-gray-500 transition-colors duration-300 dark:text-[#8696a0]">
                      10:30 AM
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {mode === "voice" && (
              <motion.div
                initial={reducedVisualEffects ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedVisualEffects ? { opacity: 1 } : { opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex justify-end">
                  <div className="flex max-w-[80%] min-w-[160px] items-center gap-3 rounded-lg rounded-tr-none bg-[#d9fdd3] p-2 px-3 text-sm text-black shadow-sm transition-colors duration-300 dark:bg-[#005c4b] dark:text-[#e9edef]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00a884]">
                      <span className="text-[10px] text-white">▶</span>
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="h-1 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/30">
                        <div className="h-full w-1/2 bg-black/40 dark:bg-white" />
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-[#e9edef]/70">
                        0:04
                      </div>
                    </div>
                    <div className="absolute right-2 bottom-1 h-3 w-3 overflow-hidden rounded-full">
                      <img
                        src="https://github.com/shadcn.png"
                        className="h-full w-full opacity-50 grayscale"
                        alt="me"
                        width={12}
                        height={12}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-lg rounded-tl-none bg-white p-2 px-3 text-sm text-black shadow-sm transition-colors duration-300 dark:bg-[#202c33] dark:text-[#e9edef]">
                    <div className="border-primary/50 mb-2 border-l-2 pl-2 text-xs text-gray-500 italic dark:text-gray-400">
                      "Groceries at Whole Foods fifty dollars and twenty cents"
                    </div>
                    <div className="text-primary mb-1 text-xs font-semibold">
                      Expense Logged
                    </div>
                    <div className="mb-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
                      <span className="text-gray-500 dark:text-gray-400">
                        Amount:
                      </span>{" "}
                      <span>$50.20</span>
                      <span className="text-gray-500 dark:text-gray-400">
                        Category:
                      </span>{" "}
                      <span>Groceries</span>
                    </div>
                    <span className="mt-1 block text-right text-[10px] text-gray-500 transition-colors duration-300 dark:text-[#8696a0]">
                      10:32 AM
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {mode === "camera" && (
              <motion.div
                initial={reducedVisualEffects ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedVisualEffects ? { opacity: 1 } : { opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-lg rounded-tr-none bg-[#d9fdd3] p-1 shadow-sm transition-colors duration-300 dark:bg-[#005c4b]">
                    <div className="relative overflow-hidden rounded">
                      <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                        {/* Simple receipt visual */}
                        <div className="flex h-16 w-12 flex-col items-center justify-center gap-1 bg-white/90 p-1 shadow-sm">
                          <div className="h-1 w-8 rounded-full bg-black/20" />
                          <div className="h-1 w-6 rounded-full bg-black/10" />
                          <div className="mt-1 h-8 w-8 rounded-sm border border-black/10" />
                        </div>
                      </div>
                      <img
                        src={receiptImg}
                        alt="Receipt"
                        className="h-auto w-48 object-cover opacity-80"
                        width={192}
                        height={256}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <span className="block px-2 py-1 text-right text-[10px] text-gray-500 transition-colors duration-300 dark:text-[#8696a0]">
                      10:35 AM
                    </span>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-lg rounded-tl-none bg-white p-2 px-3 text-sm text-black shadow-sm transition-colors duration-300 dark:bg-[#202c33] dark:text-[#e9edef]">
                    Analyzing image... <br />
                    Found 2 items: <br />
                    1. Coffee - $4.50 (Business) <br />
                    2. Bagel - $3.00 (Business) <br />
                    <div className="my-2 h-px bg-black/5 dark:bg-white/10" />
                    <strong>Total: $7.50</strong> logged! 🧾
                    <span className="mt-1 block text-right text-[10px] text-gray-500 transition-colors duration-300 dark:text-[#8696a0]">
                      10:36 AM
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Input Area (Static) */}
      <div className="flex items-center gap-2 bg-white p-2 transition-colors duration-300 dark:bg-[#202c33]">
        <div className="p-2 text-gray-500 dark:text-gray-400">
          <span className="text-xl">+</span>
        </div>
        <div className="flex h-9 flex-1 items-center rounded-full bg-gray-100 px-4 text-sm text-gray-500 transition-colors duration-300 dark:bg-[#2a3942] dark:text-gray-400">
          Message
        </div>
        <div className="rounded-full bg-[#00a884] p-2 text-white">
          <Mic size={18} />
        </div>
      </div>
    </div>
  );
}
