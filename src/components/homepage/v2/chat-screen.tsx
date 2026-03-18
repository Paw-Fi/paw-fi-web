import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useReducedVisualEffects } from "@/hooks/use-reduced-visual-effects";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const messages: Message[] = [
  {
    id: "1",
    role: "user",
    content: "Coffee 4.50",
    timestamp: "9:41 AM",
  },
  {
    id: "2",
    role: "assistant",
    content:
      "Saved 💸\n\nCategory: ☕️ Eating Out\nAmount: $4.50\n\nYou've spent $15.00 on coffee this week.",
    timestamp: "9:41 AM",
  },
  {
    id: "3",
    role: "user",
    content: "How much left for Groceries?",
    timestamp: "10:23 AM",
  },
  {
    id: "4",
    role: "assistant",
    content: "You have $124.50 left in 🛒 Groceries pocket (75% remaining).",
    timestamp: "10:23 AM",
  },
];

export function ChatScreen() {
  const reducedVisualEffects = useReducedVisualEffects();

  return (
    <div className="flex h-full flex-col bg-[#0b141a] font-sans text-white">
      {/* WhatsApp-style Header */}
      <div className="flex items-center gap-3 bg-[#202c33] px-4 py-3 shadow-sm">
        <Avatar className="h-10 w-10">
          <AvatarImage src="/logo192.webp" alt="Moneko logo" />
          <AvatarFallback>M</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-base font-semibold text-[#e9edef]">Moneko</span>
          <span className="text-xs text-[#8696a0]">business account</span>
        </div>
      </div>

      {/* Chat Area */}
      <div
        className="flex-1 space-y-4 overflow-y-auto bg-[#0f1a21] p-4"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)",
          backgroundSize: "14px 14px",
        }}
      >
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={reducedVisualEffects ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: reducedVisualEffects ? 0 : index * 0.8,
              duration: reducedVisualEffects ? 0.2 : 0.4,
            }}
            className={cn(
              "flex w-full",
              message.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm",
                message.role === "user"
                  ? "rounded-tr-none bg-[#005c4b] text-[#e9edef]"
                  : "rounded-tl-none bg-[#202c33] text-[#e9edef]",
              )}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div
                className={cn(
                  "mt-1 text-right text-[10px]",
                  message.role === "user" ? "text-[#8696a0]" : "text-[#8696a0]",
                )}
              >
                {message.timestamp}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Input Area (Visual only) */}
      <div className="flex items-center gap-3 bg-[#202c33] px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2a3942]">
          <span className="text-lg text-[#8696a0]">+</span>
        </div>
        <div className="flex h-9 flex-1 items-center rounded-lg bg-[#2a3942] px-4 text-sm text-[#8696a0]">
          Message...
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00a884]">
          <span className="text-white">🎙️</span>
        </div>
      </div>
    </div>
  );
}
