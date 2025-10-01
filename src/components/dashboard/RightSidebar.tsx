import { motion } from 'framer-motion';
import { AI_ID, useAIChat } from '@/contexts/ai-chat-context';
import { OptimizedImage } from '@/components/seo/optimized-image';
import { useImperativeHandle, forwardRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLightbulb } from '@fortawesome/free-solid-svg-icons';
import monekoLogo from '@/assets/images/logo/moneko.png';
import finniLogo from '@/assets/images/logo/finni.png';
import { Button } from '@/components/ui/button';
import { FloatingGuidanceBubble } from '@/components/ui/FloatingGuidanceBubble';

interface ChatAgent {
  id: string;
  label: string;
  description: string;
  aiType: AI_ID;
  icon?: any; // FontAwesome icon
  onClick: () => void;
}

interface RightSidebarProps {
  className?: string;
  isGuideHidden?: boolean;
  showGuide?: () => void;
}

export interface RightSidebarRef {
  showTooltip: (agentId: AI_ID, message: string, place?: 'left' | 'right' | 'top' | 'bottom') => void;
  hideTooltip: (agentId: AI_ID) => void;
  hideAllTooltips: () => void;
}

// Static chat agents configuration to prevent recreation
const CHAT_AGENTS_DATA = [
  {
    id: 'ai-advisor',
    label: 'Financial Advisor',
    description: 'Get personalized investment and financial planning guidance with Moneko',
    aiType: 'advisor' as AI_ID,
    icon: monekoLogo
  },   
  {
    id: 'ai-educator',
    label: 'Financial Educator',
    description: 'Learn personal finance with your AI educator Finni',
    icon: finniLogo,
    aiType: 'educator' as AI_ID
  }
];

export const RightSidebar = forwardRef<RightSidebarRef, RightSidebarProps>(({ className = '', isGuideHidden = false, showGuide }, ref) => {
  const { openChat } = useAIChat();
  const [activeBubble, setActiveBubble] = useState<{
    agentId: AI_ID;
    message: string;
  } | null>(null);

  const hideGuidance = () => {
    setActiveBubble(null);
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    showTooltip: (agentId: AI_ID, message: string, place: 'left' | 'right' | 'top' | 'bottom' = 'left') => {
      setActiveBubble({ agentId, message });
    },
    hideTooltip: (agentId: AI_ID) => {
      // Only hide if it's the same agent
      if (activeBubble?.agentId === agentId) {
        hideGuidance();
      }
    },
    hideAllTooltips: () => {
      hideGuidance();
    }
  }), [activeBubble]);

  return (
    <>
      <motion.div
        className={`flex-shrink-0 w-16 ${className}`}
        initial={{ x: 64, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="h-full rounded-2xl border border-border bg-moneko-background shadow-sm">
          <div className="flex flex-col items-center py-6 space-y-4">
            {CHAT_AGENTS_DATA.map((agent, index) => (
              <motion.div
                key={agent.id}
                className="relative"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 + (index * 0.1) }}
              >
                <Button
                  id={`chat-agent-${agent.id}`}
                  variant="ghost"
                  size="icon"
                  className="size-10 shadow-sm hover:shadow-md transition-all duration-200 rounded-full cursor-pointer"
                  onClick={() => openChat(agent.aiType)}
                  asChild
                >
               
                    <div className="relative flex items-center justify-center">
                      {agent.icon && (
                         <OptimizedImage 
                         src={agent.icon} 
                         alt={`${agent.label} Avatar`} 
                         className="size-10"
                       />
                      )}                   
                    </div>
                </Button>
              </motion.div>
            ))}

            {/* Show Guide Button - Only visible when guide is hidden */}
            {isGuideHidden && showGuide && (
              <Button
                onClick={showGuide}
                size="icon"
                className="size-10 rounded-full cursor-pointer bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 shadow-sm hover:shadow-md transition-all duration-200"
                asChild
              >
                <div               
                  className="flex items-center justify-center"
                >
                  <FontAwesomeIcon
                    className="h-6 w-6 text-white"
                    icon={faLightbulb}
                  />
                </div>
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Floating Guidance Bubble */}
      {activeBubble && (
        <FloatingGuidanceBubble
          agentId={activeBubble.agentId}
          message={activeBubble.message}
          isVisible={!!activeBubble}
          onClose={hideGuidance}
          onClick={() => {
            openChat(activeBubble.agentId);
            hideGuidance();
          }}
          position={{
            bottom: '120px',
            right: '80px'
          }}
          autoHideDelay={15000} // 15 seconds
        />
      )}
    </>
  );
});