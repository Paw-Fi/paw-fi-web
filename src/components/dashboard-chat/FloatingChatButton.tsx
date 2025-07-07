import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCommentDots } from "@fortawesome/free-solid-svg-icons";
import { ChatPopup } from "./ChatPopup";
import { createPortal } from "react-dom";



export const FloatingChatButton = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
   createPortal
   ( <>
    <button
      onClick={() => setIsChatOpen(true)}
      className="fixed bottom-8 right-8 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      aria-label="Open chat"
    >
      <FontAwesomeIcon icon={faCommentDots} className="h-8 w-8" />
    </button>

    {isChatOpen && <ChatPopup onClose={() => setIsChatOpen(false)} />}
  </>, document.body)
  );
};
