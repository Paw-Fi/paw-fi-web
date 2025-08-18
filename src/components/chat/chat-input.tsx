import { useState, useRef, FormEvent, useEffect } from 'react';
import { motion } from 'framer-motion';
import TextareaAutosize from 'react-textarea-autosize';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';

import { Button } from '../ui/button';
import classNames from 'classnames';
import { Link } from '@tanstack/react-router';



interface ChatInputProps {
  onSendMessage: (content: string) => void;
  isLoading: boolean;
  placeholder?: string;
  isMaxedOut?: boolean;
  autoFocus?: boolean;
}

export function ChatInput({ onSendMessage, isLoading, isMaxedOut, autoFocus = true }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [previousLoadingState, setPreviousLoadingState] = useState(isLoading);
  
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  
  // Auto-focus input when loading state changes from true to false
  useEffect(() => {
    if (autoFocus && previousLoadingState && !isLoading && inputRef.current) {
      // Small delay to ensure DOM is updated
      const timeoutId = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
    setPreviousLoadingState(isLoading);
  }, [isLoading, previousLoadingState, autoFocus]);

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage('');
      inputRef.current?.focus();
    }
  };
  if(isMaxedOut)
  {
    return (
      <div className="my-2">
        <div className="flex items-center justify-center p-4 rounded-2xl border border-orange-300/50 bg-orange-50/80 dark:bg-orange-900/20 dark:border-orange-700/50">
          <div className="text-center">
            <p className="text-orange-800 dark:text-orange-200 mb-2">
              Conversation limit reached!
            </p>
            <Link 
              to="/pricing"
              className="inline-block px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-colors duration-200"
            >
              Upgrade to Premium
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="my-2">
      <form onSubmit={handleFormSubmit} className={classNames("flex items-center gap-2 sm:gap-3",
        {
          "cursor-not-allowed": isLoading,
        }
      )}>
        <div className="flex-grow relative h-min translate-y-1">
          <TextareaAutosize
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask Moneko anything..."
            className={classNames("w-full h-full resize-none rounded-2xl border border-slate-300/50 bg-white/80 dark:bg-slate-800/80 dark:border-slate-700/50 px-4 py-2.5 pr-24 text-sm text-slate-800 dark:text-slate-100 shadow-inner focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none transition-all duration-200",
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
            disabled={isLoading}
          />
        
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
