
import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { chatData } from './chat-data';

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
  const [isLoading, setIsLoading] = useState(false);
  const chatBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages]);

  const handleQuickResponseClick = (response: string) => {
    setMessages((prev) => [...prev, { text: response, type: 'user' }]);
    setIsLoading(true);
    setTimeout(() => {
      const answer = chatData.responses[response];
      setMessages((prev) => [...prev, { text: answer, type: 'bot' }]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="fixed bottom-28 right-8 bg-white w-96 h-[600px] rounded-lg shadow-2xl flex flex-col">
      <div className="flex items-center justify-between p-4 bg-gray-100 rounded-t-lg">
        <div>
          <h3 className="font-bold text-lg">Moneko Assistant</h3>
          <p className="text-xs text-gray-500">Conversation history is not saved</p>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
          <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
        </button>
      </div>
      <div ref={chatBodyRef} className="flex-1 p-4 overflow-y-auto">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
            <div
              className={`px-4 py-2 rounded-2xl max-w-xs ${msg.type === 'user' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-800'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="px-4 py-2 rounded-2xl bg-gray-200 text-gray-800">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce mr-1"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-75 mr-1"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-150"></div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="p-4 bg-gray-50 rounded-b-lg">
        <div className="grid grid-cols-1 gap-2">
          {Object.keys(chatData.responses).map((response) => (
            <button
              key={response}
              onClick={() => handleQuickResponseClick(response)}
              className="bg-white border border-gray-300 text-sm text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 truncate"
            >
              {response}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
