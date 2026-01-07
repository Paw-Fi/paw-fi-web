"use client";

import { useState, useEffect, useRef } from "react";
import { BentoGrid, BentoCard } from "@/components/ui/bento-grid";
import { OrbitingCircles } from "@/components/ui/orbiting-circles";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useInView } from "react-intersection-observer";
import { motion } from "framer-motion";
import {
  Zap,
  Wallet,
  Users,
  BrainCircuit,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import monekoIcon from "@/assets/images/logo/moneko.png"
import monekoAnimate from "@/assets/images/logo/moneko-avatar.gif"
import { getCurrencySymbolBasedOnTimeZone } from "@/utils/currency-symbols";
import ThreeMonekos from "@/assets/images/index/3-moneko.svg"
import lunchReceipt from "@/assets/images/index/lunch-receipt.jpeg";

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
  
  // Get currency symbol based on user's timezone
  const currencySymbol = getCurrencySymbolBasedOnTimeZone();
  
  // Conversation flow definition
  const conversationFlow: { delay: number; msg: Message }[] = [
      {
          delay: 300,
          msg: { role: "user", content: "", timestamp: "10:42 AM", imageSrc: lunchReceipt, imageAlt: "Lunch receipt" }
      },
      {
          delay: 1000,
          msg: { role: "assistant", content: `Got it! 🍽️ Logged to Food.`, timestamp: "10:42 AM", showTyping: true }
      },
      {
          delay: 1700,
          msg: { role: "assistant", content: "Do you want to see your total spending today?", timestamp: "10:42 AM", showTyping: true }
      },
      {
          delay: 2700,
          msg: { role: "user", content: "Yes please", timestamp: "10:43 AM" }
      },
      {
          delay: 3200, 
          msg: { role: "assistant", content: `You've spent ${currencySymbol}82.50 today across 3 transactions. 📉`, timestamp: "10:43 AM", showTyping: true }
      },
  ];

  useEffect(() => {
    if (inView) {
      // Reset messages when re-entering view for replayability
      setMessages([]);
      
      const timeouts: NodeJS.Timeout[] = [];

      conversationFlow.forEach(({ delay, msg }) => {
          const timeout = setTimeout(() => {
              setMessages((prev) => [...prev, msg]);
          }, delay);
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
    <div ref={ref} className="h-full w-full flex flex-col p-6 bg-[#efeae2] dark:bg-[#0b141a] relative overflow-hidden transition-colors duration-300">
      <div className="absolute inset-0 opacity-40 dark:opacity-5 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat pointer-events-none"  />
      
      <div 
        ref={scrollRef}
        className="flex-1 space-y-3 min-h-0 relative z-10 overflow-y-auto scrollbar-hide pb-20 pointer-events-none"
        style={{ scrollBehavior: 'smooth' }}
      >
        {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-2 ${msg.role === 'user' ? 'justify-end' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                {msg.role === 'assistant' && (
                    <Avatar className="size-8 flex-shrink-0 mt-1">
                        <AvatarImage src={monekoIcon} alt="Moneko AI" />
                        <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                )}
                
                <div 
                    className={`p-2 px-3 max-w-[85%] shadow-sm text-sm ${ 
                        msg.role === 'user' 
                            ? 'bg-[#d9fdd3] text-black dark:bg-[#005c4b] dark:text-[#e9edef] rounded-lg rounded-tr-none'
                            : 'bg-white text-black dark:bg-[#202c33] dark:text-[#e9edef] rounded-lg rounded-tl-none'
                    }`}
                >
                    {msg.imageSrc && (
                      <img
                        src={msg.imageSrc}
                        alt={msg.imageAlt ?? "Receipt"}
                        className="mb-1 w-full max-w-[220px] rounded-md border border-black/5 object-cover"
                        loading="lazy"
                      />
                    )}
                    {msg.content.length > 0 && (
                      msg.showTyping ? (
                        <TypingAnimation className="text-sm font-normal leading-normal tracking-normal" duration={10} startOnView={false}>
                          {msg.content}
                        </TypingAnimation>
                      ) : (
                        <p>{msg.content}</p>
                      )
                    )}
                    <span className="text-[10px] text-gray-500 dark:text-[#8696a0] block text-right mt-1 opacity-70">
                        {msg.timestamp}
                    </span>
                </div>

                {msg.role === 'user' && (
                     <Avatar className="size-8 flex-shrink-0 mt-1">
                        <AvatarImage src="https://randomuser.me/api/portraits/men/32.jpg" alt="User" />
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
      className="block h-2 w-2 rounded-full bg-primary shadow-sm shadow-primary/30"
    />
    <Badge
      aria-label={label}
      variant="outline"
      className="absolute left-full ml-2 rounded-full bg-card/80 backdrop-blur px-3 py-1 text-xs font-medium border border-border shadow-sm text-foreground"
    >
      {label}
    </Badge>
  </div>
);

const HouseholdOrbitVisual = () => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const motionSpeed = prefersReducedMotion ? 0 : 1; 
  
  return (
    <div className="relative h-full min-h-full w-full bg-gradient-to-br from-orange-50/50 to-amber-50/50 dark:from-orange-950/30 dark:to-amber-950/30 overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center top-12 scale-110">
        {/* Center: Home Icon */}
           <img src={ThreeMonekos} className="h-30 text-primary" />

        {motionSpeed > 0 && (
          <>
            {/* Inner Ring: People (Real Photos) */}
            <OrbitingCircles iconSize={40} radius={80} duration={30} path speed={motionSpeed}>
               <Avatar className="border-2 border-white shadow-sm">
                  <AvatarImage src="https://randomuser.me/api/portraits/women/44.jpg" />
               </Avatar>
               <Avatar className="border-2 border-white shadow-sm">
                  <AvatarImage src="https://randomuser.me/api/portraits/men/32.jpg" />
               </Avatar>
            </OrbitingCircles>

            {/* Outer Ring: Categories */}
            <OrbitingCircles iconSize={10} radius={130} duration={40} reverse path speed={motionSpeed}>
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
  const currencySymbol = getCurrencySymbolBasedOnTimeZone();
  const prefersReducedMotion = usePrefersReducedMotion();

  // Sine-wave animation inspired by Flutter painter
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion) return;
    let raf = 0;
    const tick = () => {
      setPhase((p) => (p + 0.02) % (Math.PI * 2));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [prefersReducedMotion]);

  const buildWavePath = (amplitude: number, phaseOffset: number, baseline = 80) => {
    const W = 200; // viewBox width
    const H = 100; // viewBox height
    const L = W * 0.9; // wavelength
    let d = `M 0 ${baseline}`;
    for (let x = 0; x <= W; x += 2) {
      const y = baseline + amplitude * Math.sin(((2 * Math.PI) / L) * x + phase + phaseOffset);
      d += ` L ${x} ${y}`;
    }
    d += ` V ${H} H 0 Z`;
    return d;
  };

  // Mock Pocket Data
  const pockets = [
    { name: "Food", total: 500, spent: 320, color: "#f97316" }, // Orange
    { name: "Travel", total: 200, spent: 150, color: "#3b82f6" }, // Blue
    { name: "Fun", total: 100, spent: 40, color: "#a855f7" }, // Purple
    { name: "Bills", total: 400, spent: 380, color: "#ef4444" }, // Red
    { name: "Health", total: 150, spent: 20, color: "#10b981" }, // Green
  ];

  return (
    <div className="h-full min-h-full w-full p-6 flex flex-col justify-center bg-gradient-to-br from-pink-50/50 to-rose-50/50 dark:from-pink-950/30 dark:to-rose-950/30">
        <div className="flex gap-4 items-end justify-center h-[180px]">
            {pockets.map((pocket, i) => {
                const percent = Math.min((pocket.spent / pocket.total) * 100, 100);
                const showWave = !prefersReducedMotion && percent > 3;
                const amplitudeScale = Math.max(0.65, Math.min(1, percent / 100 + 0.25));
                
                return (
                    <div key={pocket.name} className="flex flex-col items-center gap-2 group">
                        {/* Glass Container */}
                        <div className="relative w-12 h-24 sm:w-16 sm:h-32 rounded-2xl bg-white/20 dark:bg-white/5 border border-white/30 dark:border-white/10 backdrop-blur-sm overflow-hidden shadow-sm">
                            {/* Liquid Fill */}
                            <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: `${percent}%` }}
                                transition={{ duration: 1.5, delay: i * 0.2, type: "spring", bounce: 0.2 }}
                                className="absolute bottom-0 left-0 w-full"
                                style={{ backgroundColor: pocket.color, minHeight: '2px' }}
                            >
                                    {/* Double Wave Animation */}
                                    {showWave && (
                                        <div className="absolute top-0 -translate-y-full left-0 w-full h-6 sm:h-8 overflow-hidden pointer-events-none">
                                            {/* Back Wave strip */}
                                            <div className="absolute inset-0 opacity-40">
                                                <svg
                                                    viewBox="0 0 200 100"
                                                    preserveAspectRatio="none"
                                                    className="absolute inset-0 w-full h-full"
                                                >
                                                    <path d={buildWavePath(6 * amplitudeScale, 0, 85)} fill={pocket.color} />
                                                </svg>
                                            </div>
                                            {/* Front Wave strip */}
                                            <div className="absolute inset-0">
                                                <svg
                                                    viewBox="0 0 200 100"
                                                    preserveAspectRatio="none"
                                                    className="absolute inset-0 w-full h-full"
                                                >
                                                    <path d={buildWavePath(8 * amplitudeScale, Math.PI * 0.8, 90)} fill={pocket.color} />
                                                </svg>
                                            </div>
                                        </div>
                                    )}
                            </motion.div>
                        </div>
                        
                        {/* Labels */}
                        <div className="text-center">
                            <p className="text-[10px] sm:text-xs font-semibold text-foreground">{pocket.name}</p>
                            <p className="text-[9px] sm:text-[10px] text-muted-foreground">{currencySymbol}{pocket.spent}</p>
                        </div>
                    </div>
                )
            })}
        </div>
        <style jsx global>{`
            @keyframes wave {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
            }
        `}</style>
    </div>
  );
};

// --- Component 4: Insights Chat (Corrected Query) ---
const InsightsVisual = () => {
    const { ref, inView } = useInView({ threshold: 0.3, triggerOnce: true });
    const [step, setStep] = useState(0);
    
    // Get currency symbol based on user's timezone
    const currencySymbol = getCurrencySymbolBasedOnTimeZone();
  
    useEffect(() => {
      if (inView) {
        setTimeout(() => setStep(1), 1000); 
        setTimeout(() => setStep(2), 2500); 
      }
    }, [inView]);
  
    return (
      <div ref={ref} className="h-full min-h-full w-full flex flex-col p-6 bg-gradient-to-br from-cyan-50/50 to-blue-50/50 dark:from-cyan-950/30 dark:to-blue-950/30">
         <div className="flex-1 space-y-4">
             {/* Question */}
             <div className="flex items-start gap-3 justify-end">
                <div className="bg-card p-3 rounded-2xl rounded-tr-sm shadow-sm max-w-[85%]">
                    <p className="text-sm text-foreground">Can I buy a {currencySymbol}2,000 laptop before Jan 2, 2026?</p>
                </div>
            </div>

            {/* Answer */}
            {step >= 1 && (
                <div className="flex items-start gap-3">
                     <img src={monekoAnimate} className="size-8 rounded-full" alt="AI" />
                     <div className="bg-primary text-primary-foreground dark:text-white p-3 rounded-2xl rounded-tl-sm shadow-sm max-w-[90%]">
                        <p className="text-sm">
                            Yes! Based on your current savings rate of {currencySymbol}400/mo, you'll reach {currencySymbol}2,000 by <span className="font-bold underline">December 15th</span>.
                        </p>
                     </div>
                </div>
            )}

            {/* Visual Aid */}
            {step >= 2 && (
                <div className="ml-11 bg-card/80 backdrop-blur-sm p-4 rounded-xl border border-border/50 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-xs text-muted-foreground">Projected Savings</span>
                        <span className="text-sm font-bold text-primary">{currencySymbol}2,400</span>
                    </div>
                     {/* Simple bar visual */}
                    <div className="flex gap-1 h-12 items-end">
                        <div className="w-1/4 bg-primary/20 h-[40%] rounded-t-sm"></div>
                        <div className="w-1/4 bg-primary/40 h-[60%] rounded-t-sm"></div>
                        <div className="w-1/4 bg-primary/60 h-[80%] rounded-t-sm"></div>
                        <div className="w-1/4 bg-primary h-full rounded-t-sm relative">
                             <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-1.5 py-0.5 rounded">Goal</div>
                        </div>
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
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
    description: "Update expenses via text, voice, image, PDF, or Excel. No app needed.",
    href: "/features/whatsapp-assistant",
    cta: "Chat on WhatsApp",
    className: "col-span-1 lg:col-span-1 lg:row-span-2 min-h-[500px] lg:min-h-[300px]", 
    component: <WhatsAppVisual />,
  },
  {
    Icon: Wallet,
    name: "Pockets System",
    description: "Envelope budgeting designed for modern life. Give every dollar a job.",
    href: "/features/pockets-system",
    cta: "Learn about pockets",
    className: "col-span-1 lg:col-span-1 min-h-[300px] lg:min-h-[200px]",
    component: <PocketsLiquidVisual />,
  },
  {
    Icon: Users,
    name: "Household Mode",
    description: "Manage joint finances without the headache. Switch between personal and shared views.",
    href: "/features/household-mode",
    cta: "Explore households",
    className: "col-span-1 lg:col-span-1 min-h-[300px] lg:min-h-[200px]",
    component: <HouseholdOrbitVisual />,
  },
  {
    Icon: BrainCircuit,
    name: "AI Insights",
    description: "Ask \"Can I buy X by Y date?\" and get instant, data-backed answers.",
    href: "/features/ai-insights",
    cta: "Ask Moneko",
    className: "col-span-1 lg:col-span-2 min-h-[400px] lg:min-h-[250px]", 
    component: <InsightsVisual />,
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20">
        <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center mb-12">
                 <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-4 text-foreground">
                    Everything you need to master your money
                 </h2>
                 <p className="text-muted-foreground text-lg max-w-[800px] mx-auto">
                     Moneko combines powerful financial tools with the simplicity of a chat app.
                 </p>
            </div>
            <BentoGrid className="max-w-5xl mx-auto auto-rows-auto lg:auto-rows-[20rem]">
                {features.map((feature) => (
                <BentoCard key={feature.name} {...feature} />
                ))}
            </BentoGrid>
        </div>
    </section>
  );
}