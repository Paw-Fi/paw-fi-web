"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Mic, Camera, Type, MessageSquare, Send } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid";
import { Iphone } from "@/components/ui/iphone";
import receiptImg from "@assets/images/index/receipt.png"

export function CaptureSection() {
  const [activeTab, setActiveTab] = useState<"text" | "voice" | "camera">("text");

  // Auto-switch for demo purposes, pauses on interaction if desired (omitted for simplicity of hook)
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTab((prev) => {
        if (prev === "text") return "voice";
        if (prev === "voice") return "camera";
        return "text";
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTab]);

  return (
    <section className="w-full py-24 bg-background relative border-t border-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Text Content & "Tabs" */}
            <div className="lg:col-span-5 space-y-8">
                <div>
                   <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                        Capture Anything. <br/>
                        <span className="text-primary">Instantly.</span>
                    </h2>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                        Moneko lives where you chat. No clunky forms to fill out. 
                        Just send a message, voice note, or photo on WhatsApp, and our AI handles the rest.
                    </p>
                </div>

                <div className="flex flex-col gap-4">
                    <FeatureRow 
                        active={activeTab === "text"} 
                        onClick={() => setActiveTab("text")}
                        icon={Type}
                        title="Text It"
                        description="Just type 'Lunch $15'. We categorize it automatically."
                    />
                     <FeatureRow 
                        active={activeTab === "voice"} 
                        onClick={() => setActiveTab("voice")}
                        icon={Mic}
                        title="Say It"
                        description="On the go? Send a voice note. We transcribe and log it."
                    />
                     <FeatureRow 
                        active={activeTab === "camera"} 
                        onClick={() => setActiveTab("camera")}
                        icon={Camera}
                        title="Snap It"
                        description="Take a photo of a receipt. We extract every detail."
                    />
                </div>
            </div>

            {/* Right Column: iPhone Visual */}
            <div className="lg:col-span-7 flex justify-center lg:justify-end relative">
                {/* Decorative blob */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-primary/10 via-purple-500/10 to-blue-500/10 rounded-full blur-3xl -z-10 opacity-60" />

                <div className="relative">
                    <Iphone className="h-[650px] ">
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
                "group flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all duration-300 border border-transparent",
                active 
                    ? "bg-accent border-border shadow-sm scale-[1.02]" 
                    : "hover:bg-accent/50 hover:scale-[1.01]"
            )}
        >
            <div className={cn(
                "p-3 rounded-xl transition-colors",
                active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:text-foreground"
            )}>
                <Icon size={24} />
            </div>
            <div>
                <h3 className={cn("font-semibold text-lg", active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                    {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-snug mt-1">
                    {description}
                </p>
            </div>
        </div>
    )
}

function DemoScreen({ mode }: { mode: "text" | "voice" | "camera" }) {
  return (
    <div className="bg-[#efeae2] dark:bg-[#0b141a] h-full w-full flex flex-col font-sans overflow-hidden transition-colors duration-300 ">
      {/* WhatsApp Header */}
      <div className="bg-white dark:bg-[#202c33] p-3 flex items-center gap-3 shadow-sm z-10 transition-colors duration-300">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-xs font-bold text-white">
            M
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm text-black dark:text-[#e9edef]">Moneko AI</div>
          <div className="text-[10px] text-gray-500 dark:text-[#8696a0]">online</div>
        </div>
      </div>

      {/* Chat Area */}
      <div 
        className="flex-1 p-4 space-y-4 overflow-y-auto relative"
      >
         {/* Background Pattern */}
         <div className="absolute inset-0 opacity-40 dark:opacity-5 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat pointer-events-none" />

         <div className="text-center text-[10px] bg-[#e1f3fb] text-[#54656f] dark:bg-[#1f2c34] dark:text-[#8696a0] py-1 px-3 rounded-lg w-max mx-auto shadow-sm uppercase tracking-wide opacity-90 mb-6 relative z-10 transition-colors duration-300">
            Today
         </div>

         <div className="relative z-10 space-y-4">
            {/* Previous Message Context */}
          

            {/* Dynamic Content Based on Mode */}
            <AnimatePresence mode="wait">
                {mode === "text" && (
                     <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                     >
                        <div className="flex justify-end">
                            <div className="bg-[#d9fdd3] text-black dark:bg-[#005c4b] dark:text-[#e9edef] p-2 px-3 rounded-lg rounded-tr-none max-w-[80%] text-sm shadow-sm transition-colors duration-300">
                                Lunch with client $45.50
                                <span className="text-[10px] text-gray-500 dark:text-[#8696a0] block text-right mt-1 transition-colors duration-300">10:30 AM</span>
                            </div>
                        </div>
                        <div className="flex justify-start">
                            <div className="bg-white text-black dark:bg-[#202c33] dark:text-[#e9edef] p-2 px-3 rounded-lg rounded-tl-none max-w-[85%] text-sm shadow-sm transition-colors duration-300">
                                <div className="font-semibold text-primary mb-1 text-xs">Expense Logged</div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2 text-gray-600 dark:text-gray-300">
                                    <span className="text-gray-500 dark:text-gray-400">Amount:</span> <span>$45.50</span>
                                    <span className="text-gray-500 dark:text-gray-400">Category:</span> <span>Dining Out</span>
                                    <span className="text-gray-500 dark:text-gray-400">Type:</span> <span>Business</span>
                                </div>
                                Logged "Lunch with client". Enjoy your meal! 🍔
                                <span className="text-[10px] text-gray-500 dark:text-[#8696a0] block text-right mt-1 transition-colors duration-300">10:30 AM</span>
                            </div>
                        </div>
                     </motion.div>
                )}

                {mode === "voice" && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                     >
                        <div className="flex justify-end">
                            <div className="bg-[#d9fdd3] text-black dark:bg-[#005c4b] dark:text-[#e9edef] p-2 px-3 rounded-lg rounded-tr-none max-w-[80%] text-sm shadow-sm flex items-center gap-3 min-w-[160px] transition-colors duration-300">
                                 <div className="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center">
                                    <span className="text-[10px] text-white">▶</span>
                                 </div>
                                 <div className="flex-1 space-y-1">
                                    <div className="h-1 bg-black/10 dark:bg-white/30 rounded-full w-full overflow-hidden">
                                        <div className="h-full bg-black/40 dark:bg-white w-1/2" />
                                    </div>
                                    <div className="text-[10px] text-gray-500 dark:text-[#e9edef]/70">0:04</div>
                                 </div>
                                 <div className="absolute bottom-1 right-2 w-3 h-3 rounded-full overflow-hidden">
                                    <img src="https://github.com/shadcn.png" className="w-full h-full opacity-50 grayscale" alt="me"/>
                                 </div>
                            </div>
                        </div>
                        <div className="flex justify-start">
                            <div className="bg-white text-black dark:bg-[#202c33] dark:text-[#e9edef] p-2 px-3 rounded-lg rounded-tl-none max-w-[85%] text-sm shadow-sm transition-colors duration-300">
                                <div className="text-xs text-gray-500 dark:text-gray-400 italic mb-2 border-l-2 border-primary/50 pl-2">
                                    "Groceries at Whole Foods fifty dollars and twenty cents"
                                </div>
                                <div className="font-semibold text-primary mb-1 text-xs">Expense Logged</div>
                                 <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2 text-gray-600 dark:text-gray-300">
                                    <span className="text-gray-500 dark:text-gray-400">Amount:</span> <span>$50.20</span>
                                    <span className="text-gray-500 dark:text-gray-400">Category:</span> <span>Groceries</span>
                                </div>
                                <span className="text-[10px] text-gray-500 dark:text-[#8696a0] block text-right mt-1 transition-colors duration-300">10:32 AM</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                 {mode === "camera" && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                     >
                        <div className="flex justify-end">
                            <div className="bg-[#d9fdd3] dark:bg-[#005c4b] p-1 rounded-lg rounded-tr-none max-w-[80%] shadow-sm transition-colors duration-300">
                                <div className="rounded overflow-hidden relative">
                                    <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                                         {/* Simple receipt visual */}
                                         <div className="w-12 h-16 bg-white/90 shadow-sm flex flex-col items-center justify-center gap-1 p-1">
                                            <div className="w-8 h-1 bg-black/20 rounded-full" />
                                            <div className="w-6 h-1 bg-black/10 rounded-full" />
                                            <div className="w-8 h-8 rounded-sm border border-black/10 mt-1" />
                                         </div>
                                    </div>
                                    <img src={receiptImg}alt="Receipt" className="w-48 h-auto object-cover opacity-80" />
                                </div>
                                <span className="text-[10px] text-gray-500 dark:text-[#8696a0] block text-right px-2 py-1 transition-colors duration-300">10:35 AM</span>
                            </div>
                        </div>
                        <div className="flex justify-start">
                            <div className="bg-white text-black dark:bg-[#202c33] dark:text-[#e9edef] p-2 px-3 rounded-lg rounded-tl-none max-w-[85%] text-sm shadow-sm transition-colors duration-300">
                                 Analyzing image... <br/>
                                 Found 2 items: <br/>
                                 1. Coffee - $4.50 (Business) <br/>
                                 2. Bagel - $3.00 (Business) <br/>
                                 <div className="h-px bg-black/5 dark:bg-white/10 my-2" />
                                 <strong>Total: $7.50</strong> logged! 🧾
                                <span className="text-[10px] text-gray-500 dark:text-[#8696a0] block text-right mt-1 transition-colors duration-300">10:36 AM</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
         </div>
      </div>

      {/* Input Area (Static) */}
      <div className="bg-white dark:bg-[#202c33] p-2 flex items-center gap-2 transition-colors duration-300">
        <div className="p-2 text-gray-500 dark:text-gray-400"><span className="text-xl">+</span></div>
         <div className="flex-1 bg-gray-100 dark:bg-[#2a3942] rounded-full h-9 px-4 flex items-center text-gray-500 dark:text-gray-400 text-sm transition-colors duration-300">
            Message
         </div>
         <div className="p-2 bg-[#00a884] rounded-full text-white">
            <Mic size={18} />
         </div>
      </div>
    </div>
  );
}
