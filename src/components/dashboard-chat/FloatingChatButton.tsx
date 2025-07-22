import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCommentDots, faUser, faTimes } from "@fortawesome/free-solid-svg-icons";
import { ChatPopup } from "./ChatPopup";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import monekoIcon from "@assets/images/icon.svg";

export const FloatingChatButton = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
   createPortal
   ( <>
    <div className="fixed bottom-8 right-8 flex items-end space-x-3 z-50">
      {/* Tooltip Label */}
      <motion.div
        initial={{ opacity: 0, x: 10, scale: 0.8 }}
        animate={{ 
          opacity: isHovered ? 1 : 0, 
          x: isHovered ? 0 : 10,
          scale: isHovered ? 1 : 0.8
        }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="mb-2 px-3 py-2 bg-white/90 backdrop-blur-xl border border-purple-200/50 rounded-xl shadow-lg"
      >
        <div className="flex items-center space-x-2 text-sm font-semibold text-gray-800">
          <FontAwesomeIcon icon={faUser} className="h-3 w-3 text-primary" />
          <span>Financial Advisor</span>
        </div>
        <div className="text-xs text-gray-600 mt-0.5">Ask me anything!</div>
      </motion.div>

      {/* Chat Button */}
      <motion.button
        onClick={() => setIsChatOpen(isChatOpen ? false : true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xl hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/50 focus:ring-offset-2 transition-all duration-200 hover:from-purple-700 hover:to-pink-700"
        aria-label="Chat with Financial Advisor"
        whileHover={{ scale: isChatOpen ? 0.95 : 1.1, y: -2 }}
        whileTap={{ scale: 0.85 }}
        transition={{ 
          type: "spring", 
          damping: 20, 
          stiffness: 300,
          rotate: { duration: 0.3, ease: "easeInOut" }
        }}
      >
        {/* Pulse effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 animate-pulse opacity-75"></div>
        
        {/* Icon with morphing transition */}
        <motion.div
          className="relative z-10"
          animate={{ rotate: isChatOpen ? 0 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            initial={false}
            animate={{ 
              opacity: isChatOpen ? 0 : 1,
              scale: isChatOpen ? 0.8 : 1,
            }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <FontAwesomeIcon icon={faCommentDots} className="h-7 w-7" />
          </motion.div>
          <motion.div
            initial={false}
            animate={{ 
              opacity: isChatOpen ? 1 : 0,
              scale: isChatOpen ? 1 : 0.8,
            }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <FontAwesomeIcon icon={faTimes} className="h-6 w-6" />
          </motion.div>
        </motion.div>
        
        {/* Small advisor indicator */}
        <div className="absolute -top-1 -right-1 h-5 w-5 bg-white/70 rounded-full flex items-center justify-center shadow-lg">
          <img src={monekoIcon} alt="Moneko Icon" className="h-4 w-4" />
        </div>
      </motion.button>
    </div>

    {/* Chat Popup with smooth transition */}
    <motion.div
      initial={{ opacity: 0, scale: 0.3, y: 20 }}
      animate={{ 
        opacity: isChatOpen ? 1 : 0,
        scale: isChatOpen ? 1 : 0.3,
        y: isChatOpen ? 0 : 20
      }}
      exit={{ opacity: 0, scale: 0.3, y: 20 }}
      transition={{
        type: "spring",
        damping: 25,
        stiffness: 300,
        mass: 0.8,
        opacity: { duration: 0.2 },
        scale: { 
          type: "spring",
          damping: 20,
          stiffness: 400,
          mass: 0.6,
          restDelta: 0.001
        }
      }}
      style={{
        transformOrigin: "bottom right",
        pointerEvents: isChatOpen ? "auto" : "none"
      }}
    >
      {isChatOpen && <ChatPopup onClose={() => setIsChatOpen(false)} />}
    </motion.div>
  </>, document.body)
  );
};
