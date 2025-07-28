
import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faPaperPlane, faUser, faShieldAlt } from '@fortawesome/free-solid-svg-icons';
import { chatData } from './chat-data';
import { FinancialAdvisorChatInterface } from '../chat/financial-advisor-chat-interface';

interface ChatPopupProps {
  onClose: () => void;
}

export const ChatPopup: React.FC<ChatPopupProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<{ text: string; type: 'user' | 'bot' }[]>([
    {
      text: chatData.greeting,
      type: 'bot',
    },
  ]);
  const chatBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages]);


  return (
    <div className="fixed bottom-28 right-8 bg-white/95 backdrop-blur-xl w-[90vw] lg:w-[40vw] h-[600px] lg:h-[80vh] rounded-3xl shadow-2xl border border-purple-200/50 flex flex-col overflow-hidden will-change-transform">
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.1),transparent_50%)]"></div>
        
        <div className="flex items-center space-x-3 relative z-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg">
            <FontAwesomeIcon icon={faUser} className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-lg text-white">AI Financial Advisor</h3>
              <div className="flex items-center space-x-1 px-2 py-1 bg-white/20 rounded-full">
                <FontAwesomeIcon icon={faShieldAlt} className="h-3 w-3 text-green-300" />
                <span className="text-xs text-green-300 font-medium">Verified</span>
              </div>
            </div>
            <p className="text-sm text-purple-100 opacity-90">Your personal finance expert • Always here to help</p>
          </div>
        </div>
        
        <button 
          onClick={onClose} 
          className="relative z-10 flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-white hover:bg-white/30 transition-colors duration-200 backdrop-blur-sm"
        >
          <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
        </button>
      </div>
     <FinancialAdvisorChatInterface/>
    </div>
  );
};
