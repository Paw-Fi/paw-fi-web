import React, { useState, useRef, FormEvent } from 'react';
import { motion } from 'framer-motion';
import TextareaAutosize from 'react-textarea-autosize';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagicWandSparkles, faPaperPlane } from '@fortawesome/free-solid-svg-icons';

import { Button } from '../ui/button';
import classNames from 'classnames';



interface ChatInputProps {
  onSendMessage: (content: string) => void;
  isLoading: boolean;
  onOpenVoiceModal: () => void;
}

export function ChatInput({ onSendMessage, isLoading, onOpenVoiceModal }: ChatInputProps) {
  const [message, setMessage] = useState('');
  
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="my-2">
      <form onSubmit={handleFormSubmit} className={classNames("flex items-center gap-2 sm:gap-3",
        {
          "cursor-not-allowed": isLoading,
        }
      )}>
        <div className="flex-grow relative">
          <TextareaAutosize
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask Moneko anything..."
            className={classNames("w-full resize-none rounded-2xl border border-slate-300/50 bg-white/80 dark:bg-slate-800/80 dark:border-slate-700/50 px-4 py-2.5 pr-24 text-sm text-slate-800 dark:text-slate-100 shadow-inner focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none transition-all duration-200",
              {
                "cursor-not-allowed": isLoading,
                "opacity-50": isLoading,
              }
            )}
            minRows={1}
            maxRows={6}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleFormSubmit(e as any);
              }
            }}
            disabled={isLoading}          />
        
        </div>
        {/* <motion.div whileTap={{ scale: 0.9 }}>
          <Button
            variant="primary"
            disabled={isLoading}
            onClick={onOpenVoiceModal}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 p-0 text-white shadow-lg shadow-purple-500/30 transition-all duration-300 ease-in-out hover:shadow-xl hover:shadow-purple-500/50 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-white/50 disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-600"
          >
           <FontAwesomeIcon icon={faMagicWandSparkles} />
          </Button>
        </motion.div> */}
        <motion.div whileTap={{ scale: 0.9 }}>
          <Button
            type="submit"
            variant="primary"
            disabled={!message.trim() || isLoading}
            className={classNames("flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br  p-0 text-white shadow-lg shadow-purple-500/30 transition-all duration-300 ease-in-out hover:shadow-xl hover:shadow-purple-500/50 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-white/50 disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-600",
            {
              "from-purple-500 to-indigo-600": !isLoading,
              "from-gray-200 to-gray-300": isLoading,

            }
            )}
          >
                     <FontAwesomeIcon icon={faPaperPlane} />

          </Button>
        </motion.div>
      </form>
      
    </div>
  );
}
