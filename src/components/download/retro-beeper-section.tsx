"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { TypewriterText } from "@/components/ui/TypewriterText";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Apple, Smartphone, Printer, Send, X, AlertCircle } from "lucide-react";

interface GeneratedCard {
  id: string;
  text: string;
  x: number;
  y: number;
  rotation: number;
  type: "text" | "receipt";
  platform?: "ios" | "android";
}

export function RetroBeeperSection() {
  const [inputText, setInputText] = useState("Pls select a platform");
  const [screenText, setScreenText] = useState("SELECT A PLATFORM...");
  const [cards, setCards] = useState<GeneratedCard[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSendText = () => {
    if (!inputText) return;
    
    setIsTyping(true);
    setScreenText(inputText.toUpperCase());
    
    // Simulate transmission delay then "print" card
    setTimeout(() => {
      spawnCard(inputText, "text");
      setInputText("");
      setIsTyping(false);
      // Reset screen after a while
      setTimeout(() => setScreenText("SELECT A PLATFORM..."), 3000);
    }, 1500);
  };

  const handleDownloadSelect = (platform: "ios" | "android") => {
    setIsTyping(true);
    const msg = platform === "ios" ? "FETCHING APP STORE..." : "FETCHING PLAY STORE...";
    setScreenText(msg);

    setTimeout(() => {
      spawnCard(
        platform === "ios" ? "https://apps.apple.com/app/moneko/id6753925279" : "https://play.google.com/store/apps/details?id=com.moneko.mobile",
        "receipt",
        platform
      );
      setScreenText("LINK PRINTED");
      setIsTyping(false);
      setTimeout(() => setScreenText("SELECT A PLATFORM..."), 3000);
    }, 2000);
  };

  const spawnCard = (text: string, type: "text" | "receipt", platform?: "ios" | "android") => {
    if (!containerRef.current) return;
    
    // Random position near the device but not covering it completely
    const container = containerRef.current.getBoundingClientRect();
    const x = (Math.random() - 0.5) * 300; // Increased spread
    const y = 200 + Math.random() * 50; // Spawn lower down to look like it fell out/ejected
    const rotation = (Math.random() - 0.5) * 20;

    const newCard: GeneratedCard = {
      id: Date.now().toString(),
      text,
      x,
      y,
      rotation,
      type,
      platform
    };

    setCards((prev) => [...prev, newCard]);
  };

  return (
    <section className="py-24 w-full relative overflow-hidden min-h-[800px] flex flex-col items-center justify-center select-none" ref={containerRef}>
      

      <div className="container relative z-10 max-w-5xl mx-auto flex flex-col items-center gap-12">
        <div className="text-center space-y-4">
          
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white font-mono">
            <span className="text-[#a8b343]">Moneko</span> download for iOS & Android
            </h1>
            <p className="text-neutral-400 max-w-xl mx-auto font-mono text-sm">             
            Choose your platform to get the latest Moneko app. Track expenses, organize budgets with Pockets, and keep shared spending in sync—fast.
            </p>
        </div>

        {/* The Device */}
        <div className="relative group z-20">
            {/* Device Body */}
            <div className="w-[320px] md:w-[400px] bg-gradient-to-b from-neutral-800 to-neutral-900 rounded-[2rem] p-6 pb-12 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)] border-4 border-neutral-800 relative z-20">
                
                {/* Branding */}
                <div className="flex justify-between items-center mb-4 px-2">
                    <div className="flex items-center gap-2">
                         <div className="w-8 h-1 bg-neutral-700/50 rounded-full"></div>
                         <div className="w-8 h-1 bg-neutral-700/50 rounded-full"></div>
                    </div>
                    <span className="font-bold text-neutral-500 text-xs tracking-widest italic">MONEKO</span>
                </div>

                {/* LCD Screen */}
                <div className="bg-[#9da63d] rounded-lg p-4 shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)] border-4 border-neutral-700/50 h-[100px] flex items-center justify-center relative overflow-hidden mb-8">
                     {/* LCD Grid Line overlay */}
                     <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '3px 3px' }}></div>
                     
                     <div className="font-mono text-xl md:text-2xl text-black/80 font-bold z-10 w-full text-center break-words leading-tight" style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.2)' }}>
                        <TypewriterText 
                            key={screenText} // Remount to restart animation
                            text={screenText} 
                            speed={20} 
                            showCursor={true}
                            cursorClassName="text-black/80 animate-pulse bg-black/80 w-[0.6em] h-[1em] inline-block align-middle ml-1"
                        />
                     </div>
                </div>

                {/* Controls */}
                <div className="grid grid-cols-3 gap-3 px-2">
                     <BeeperButton onClick={() => handleDownloadSelect("ios")} color="blue">
                        <svg viewBox="0 0 384 512" className="w-5 h-5 fill-current">
                            <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                        </svg>
                        <span className="text-[10px] mt-1 font-bold">iOS</span>
                     </BeeperButton>
                     
                     <BeeperButton onClick={handleSendText} isMain>
                         <div className="w-3 h-3 rounded-full bg-red-500 mb-1 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                         <span className="text-[10px] font-bold text-white">PAGE</span>
                     </BeeperButton>

                     <BeeperButton onClick={() => handleDownloadSelect("android")} color="green">
                        <svg viewBox="30 336.7 120.9 129.2" className="w-6 h-6">
                            <path fill="#FFD400" d="M119.2,421.2c15.3-8.4,27-14.8,28-15.3c3.2-1.7,6.5-6.2,0-9.7  c-2.1-1.1-13.4-7.3-28-15.3l-20.1,20.2L119.2,421.2z" />
                            <path fill="#FF3333" d="M99.1,401.1l-64.2,64.7c1.5,0.2,3.2-0.2,5.2-1.3  c4.2-2.3,48.8-26.7,79.1-43.3L99.1,401.1L99.1,401.1z" />
                            <path fill="#48FF48" d="M99.1,401.1l20.1-20.2c0,0-74.6-40.7-79.1-43.1  c-1.7-1-3.6-1.3-5.3-1L99.1,401.1z" />
                            <path fill="#3BCCFF" d="M99.1,401.1l-64.3-64.3c-2.6,0.6-4.8,2.9-4.8,7.6  c0,7.5,0,107.5,0,113.8c0,4.3,1.7,7.4,4.9,7.7L99.1,401.1z" />
                        </svg>
                        <span className="text-[10px] mt-1 font-bold">Playstore</span>
                     </BeeperButton>
                </div>
            </div>

            {/* Receipt Output Slot Animation */}
             <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-3/4 h-4 bg-neutral-950 rounded-b-xl z-10"></div>
        </div>
       

      </div>

      {/* Draggable Cards Layer - MOVED TO Z-40 to be ON TOP */}
      <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
         <div className="relative w-full h-full" ref={containerRef}>
            <AnimatePresence>
                {cards.map((card) => (
                    <DraggableCard key={card.id} card={card} onDelete={() => setCards(prev => prev.filter(c => c.id !== card.id))} />
                ))}
            </AnimatePresence>
         </div>
      </div>

    </section>
  );
}

function BeeperButton({ children, onClick, color = "gray", isMain }: { children: React.ReactNode, onClick: () => void, color?: "blue" | "green" | "gray", isMain?: boolean }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "group relative h-16 rounded-xl flex flex-col items-center justify-center transition-all active:scale-95 shadow-[0_4px_0_rgba(0,0,0,0.5),0_5px_10px_rgba(0,0,0,0.3)] active:shadow-none active:translate-y-[4px] border-t border-white/5",
                color === "gray" && "bg-neutral-700 hover:bg-neutral-600",
                color === "blue" && "bg-slate-700 hover:bg-slate-600 text-blue-400",
                color === "green" && "bg-slate-700 hover:bg-slate-600 text-green-400",
                isMain && "bg-neutral-800 border border-neutral-600 scale-105"
            )}
        >
            {children}
        </button>
    )
}

function DraggableCard({ card, onDelete }: { card: GeneratedCard, onDelete: () => void }) {
    return (
        <motion.div
            drag
            dragMomentum={false}
            initial={{ opacity: 0, y: 0, scale: 0.8, rotate: 0 }}
            animate={{ opacity: 1, y: card.y, x: card.x, rotate: card.rotation, scale: 1 }}
            className="absolute left-1/2 top-1/4 pointer-events-auto cursor-grab active:cursor-grabbing z-50 shadow-2xl"
        >
            {card.type === "text" ? (
                // Sticky Note Style
                <div className="w-[180px] h-[180px] bg-[#fef08a] text-black p-4 shadow-xl rotate-1 flex flex-col font-handwriting relative">
                     <button onClick={onDelete} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                     </button>
                    <div className="flex-1 flex items-center justify-center text-center font-bold font-mono text-lg break-words leading-tight">
                        {card.text}
                    </div>
                    <div className="text-[10px] text-neutral-500 text-right opacity-50 font-mono">Sent from Moneko</div>
                </div>
            ) : (
                // Receipt Style
                <div className="w-[240px] bg-white text-black p-6 shadow-xl flex flex-col font-mono relative border-b-4 border-dotted border-neutral-300 before:content-[''] before:absolute before:top-[-4px] before:left-0 before:right-0 before:h-[4px] before:bg-[radial-gradient(circle_at_10px_0,transparent_0,transparent_5px,white_5px)] before:bg-[length:20px_10px]">
                     <div className="text-center border-b-2 border-black pb-4 mb-4 border-dashed">
                        <h3 className="text-xl font-bold uppercase tracking-wider">Moneko</h3>
                        <p className="text-xs">OFFICIAL RECEIPT</p>
                     </div>
                     
                     <div className="space-y-2 mb-6 text-xs uppercase">
                        <div className="flex justify-between">
                            <span>ITEM:</span>
                            <span className="font-bold">APP DOWNLOAD</span>
                        </div>
                        <div className="flex justify-between">
                            <span>PLATFORM:</span>
                            <span className="font-bold">{card.platform}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>PRICE:</span>
                            <span className="font-bold">$0.00</span>
                        </div>
                     </div>

                     <a href={card.text} target="_blank" rel="noopener noreferrer" 
                        className="bg-black text-white py-3 px-4 text-center text-xs font-bold uppercase hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2">
                        <Printer className="w-3 h-3" />
                        DOWNLOAD NOW
                     </a>

                     <div className="mt-4 text-[10px] text-center text-neutral-400">
                        THANK YOU FOR CHOOSING MONEKO
                     </div>
                </div>
            )}
        </motion.div>
    )
}
