import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import TypewriterText from "./TypewriterText";
import monekoIconGif from "@/assets/images/logo/moneko.png";

export type AdvisorTone =
  | "congratulatory"
  | "encouraging"
  | "motivational"
  | "reassuring"
  | "informative";

export interface AdvisorMessage {
  message: string;
  tone: AdvisorTone;
}

interface MonekoAdvisorMessageProps {
  message: AdvisorMessage;
  showMessage: boolean;
  typewriterSpeed?: number;
  className?: string;
  transparentBackground?: boolean;
}

export const MonekoAdvisorMessage: React.FC<MonekoAdvisorMessageProps> = ({
  message,
  showMessage,
  typewriterSpeed = 25,
  className = "",
  transparentBackground = false,
}) => {
  const [isTypewriterActive, setIsTypewriterActive] = useState(false);

  if (!showMessage || !message.message) return null;

  const getToneBadge = (tone: AdvisorTone) => {
    switch (tone) {
      case "congratulatory":
        return { text: "🎉 Excellent!", classes: "bg-success/10 text-success" };
      case "encouraging":
        return {
          text: "💪 Great Progress!",
          classes: "bg-primary/10 text-primary",
        };
      case "motivational":
        return {
          text: "🚀 Keep Going!",
          classes: "bg-primary/10 text-primary",
        };
      case "reassuring":
        return { text: "🤝 I'm Here!", classes: "bg-warning/10 text-warning" };
      case "informative":
        return {
          text: "💡 Good to Know!",
          classes: "bg-primary/10 text-primary",
        };
      default:
        return { text: "✨ Moneko", classes: "bg-primary/10 text-primary" };
    }
  };

  const badge = getToneBadge(message.tone);

  // Handle typewriter animation state
  const handleTypewriterComplete = () => {
    setIsTypewriterActive(false);
  };

  // Start typewriter animation after the delay (300ms default delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTypewriterActive(true);
    }, 300); // This should match the delay prop passed to TypewriterText

    return () => clearTimeout(timer);
  }, [message.message]); // Reset when message changes

  // Choose avatar based on typewriter state
  const avatarSrc = monekoIconGif;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className={`${transparentBackground ? "" : "bg-subtle-background rounded-xl border p-6 shadow-sm"} ${className}`}
    >
      <div className="flex items-start gap-4">
        {/* Moneko Avatar */}
        <div className="flex-shrink-0">
          <div className="bg-primary h-12 w-12 rounded-full p-1 shadow-sm">
            <img
              src={avatarSrc}
              alt="Moneko AI"
              className="bg-card h-full w-full rounded-full object-cover"
            />
          </div>
        </div>

        {/* Message Content */}
        <div className="min-w-0 flex-1">
          <div className="bg-card relative rounded-xl border p-4 shadow-sm">
            {/* Speech bubble tail (token-friendly) */}
            <div className="bg-card absolute top-5 -left-1.5 h-3 w-3 rotate-45 border"></div>

            <div className="mb-3 flex items-center gap-3">
              <h4 className="text-foreground font-semibold">Moneko</h4>
              <span
                className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-medium ${badge.classes}`}
              >
                {badge.text}
              </span>
            </div>

            {message.message && (
              <TypewriterText
                text={`${message.message}`}
                speed={typewriterSpeed}
                delay={300}
                className="text-muted-foreground-color text-sm leading-relaxed"
                showCursor={true}
                cursorClassName="animate-pulse text-primary"
                onComplete={handleTypewriterComplete}
              />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MonekoAdvisorMessage;
