import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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
    content: "Saved 💸\n\nCategory: ☕️ Eating Out\nAmount: $4.50\n\nYou've spent $15.00 on coffee this week.",
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
  return (
    <div className="flex h-full flex-col bg-[#0b141a] text-white font-sans">
      {/* WhatsApp-style Header */}
      <div className="flex items-center gap-3 bg-[#202c33] px-4 py-3 shadow-sm">
        <Avatar className="h-10 w-10">
          <AvatarImage src="/logo192.png" />
          <AvatarFallback>M</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-base font-semibold text-[#e9edef]">Moneko</span>
          <span className="text-xs text-[#8696a0]">business account</span>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat p-4 space-y-4">
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.8, duration: 0.4 }}
            className={cn(
              "flex w-full",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm",
                message.role === "user"
                  ? "bg-[#005c4b] text-[#e9edef] rounded-tr-none"
                  : "bg-[#202c33] text-[#e9edef] rounded-tl-none"
              )}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div className={cn(
                  "text-[10px] mt-1 text-right",
                  message.role === "user" ? "text-[#8696a0]" : "text-[#8696a0]"
              )}>
                {message.timestamp}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Input Area (Visual only) */}
      <div className="bg-[#202c33] px-4 py-3 flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-[#2a3942] flex items-center justify-center">
            <span className="text-[#8696a0] text-lg">+</span>
        </div>
        <div className="flex-1 bg-[#2a3942] h-9 rounded-lg px-4 flex items-center text-[#8696a0] text-sm">
            Message...
        </div>
        <div className="h-8 w-8 rounded-full bg-[#00a884] flex items-center justify-center">
             <span className="text-white">🎙️</span>
        </div>
      </div>
    </div>
  );
}
