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
  agentName:string;
}

export function ChatInput({ onSendMessage, isLoading, isMaxedOut,agentName, autoFocus = true }: ChatInputProps) {
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
        <div className="flex items-center justify-center p-3 sm:p-4 rounded-2xl border bg-subtle-background">
          <div className="text-center">
            <p className="text-muted-foreground-color mb-2 text-sm sm:text-base">
              Conversation limit reached!
            </p>
            <Link 
              to="/pricing"
              className="inline-block px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors duration-200 touch-manipulation"
            >
              Upgrade to Premium
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="my-0 sm:my-2">
      <form onSubmit={handleFormSubmit} className={classNames("flex items-end gap-2 sm:gap-3",
        {
          "cursor-not-allowed": isLoading,
        }
      )}>
        <div className="flex-grow relative h-min translate-y-1">
          <TextareaAutosize
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Ask ${agentName} anything...`}
            className={classNames("w-full h-full resize-none rounded-2xl border bg-card px-3 sm:px-4 py-2.5 sm:py-2.5 pr-4 sm:pr-6 text-mobile-base sm:text-base text-foreground shadow-inner focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary focus:outline-none transition-all duration-200 touch-manipulation",
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
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button
            type="submit"
            size="icon"
            disabled={!message.trim() || isLoading}
            className={classNames("flex shrink-0 items-center justify-center rounded-full shadow-sm hover:shadow-md transition-all duration-200 touch-manipulation h-10 w-10 sm:h-10 sm:w-10",
            {
              "opacity-50 cursor-not-allowed": isLoading
            }
            )}
          >
            <FontAwesomeIcon icon={faPaperPlane} className="text-sm sm:text-base" />
          </Button>
        </motion.div>
      </form>

    </div>
  );
}
