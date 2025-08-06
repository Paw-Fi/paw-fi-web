import { motion } from 'framer-motion';
import { Tooltip } from 'react-tooltip';
import { AI_ID, useAIChat } from '@/contexts/ai-chat-context';
import { OptimizedImage } from '@/components/seo/optimized-image';
import logo from '@/assets/images/icon.svg';
import { useRef, useImperativeHandle, forwardRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLightbulb } from '@fortawesome/free-solid-svg-icons';

interface ChatAgent {
  id: string;
  label: string;
  description: string;
  aiType:AI_ID;
  color: string;
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

export const RightSidebar = forwardRef<RightSidebarRef, RightSidebarProps>(({ className = '', isGuideHidden = false, showGuide }, ref) => {
  const { openChat } = useAIChat();
  
  // Create refs for each tooltip
  const tooltipRefs = useRef<{ [key: string]: any }>({});
  
  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    showTooltip: (agentId: AI_ID, message: string, place: 'left' | 'right' | 'top' | 'bottom' = 'left') => {
      const elementId = `ai-${agentId}`; // Maps to the actual agent.id values
      const tooltipRef = tooltipRefs.current[`chat-tooltip-${elementId}`];
      if (tooltipRef) {
        tooltipRef.open({
          anchorSelect: `#chat-agent-${elementId}`,
          content: message,
          place: place
        });
      }
    },
    hideTooltip: (agentId: AI_ID) => {
      const elementId = `ai-${agentId}`; // Maps to the actual agent.id values
      const tooltipRef = tooltipRefs.current[`chat-tooltip-${elementId}`];
      if (tooltipRef) {
        tooltipRef.close();
      }
    },
    hideAllTooltips: () => {
      Object.values(tooltipRefs.current).forEach(tooltipRef => {
        if (tooltipRef) {
          tooltipRef.close();
        }
      });
    }
  }));

  // Chat agents configuration
  const chatAgents: ChatAgent[] = [
    {
      id: 'ai-advisor',
      label: 'Financial Advisor',
      description: 'Get personalized investment and financial planning guidance',
      aiType: 'advisor',
      color: 'from-blue-500 to-blue-600',
      onClick: () => openChat('advisor')
    },
    {
      id: 'ai-tracker',
      label: 'Goal Tracker',
      description: 'Track and manage your financial goals with AI assistance',
      aiType: 'tracker',
      color: 'from-green-500 to-green-600',
      onClick: () => openChat('tracker')
    },
    {
      id: 'ai-educator',
      label: 'Financial Educator',
      description: 'Learn financial concepts and improve your financial literacy',
      aiType: 'educator',
      color: 'from-purple-500 to-purple-600',
      onClick: () => openChat('educator')
    }
  ];

  return (
    <>
      <motion.div
        className={`flex-shrink-0 w-16 ${className}`}
        initial={{ x: 64, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="h-full rounded-2xl border border-gray-100 dark:border-gray-700 bg-white/70 dark:bg-gray-800/80 shadow-sm">
          <div className="flex flex-col items-center py-6 space-y-4">
          
            {chatAgents.map((agent, index) => (
              <motion.div
                key={agent.id}
                className="relative"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 + (index * 0.1) }}
              >
                <motion.button
                  id={`chat-agent-${agent.id}`}
                  className={`flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${agent.color} shadow-sm hover:shadow-md transition-all duration-200`}
                  onClick={agent.onClick}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  data-tooltip-id={`chat-tooltip-${agent.id}`}
                  data-tooltip-content={agent.description}
                  data-tooltip-place="left"
                >
                  <div className="relative">
                    <OptimizedImage 
                      src={logo} 
                      alt={`${agent.label} Avatar`} 
                      className="h-6 w-6"
                    />                   
                  </div>
                </motion.button>

                {/* Tooltip */}
                <Tooltip
                  ref={(el) => {
                    if (el) {
                      tooltipRefs.current[`chat-tooltip-${agent.id}`] = el;
                    }
                  }}
                  id={`chat-tooltip-${agent.id}`}
                  imperativeModeOnly={false}
                  style={{
                    backgroundColor: 'rgb(17 24 39)',
                    color: 'rgb(243 244 246)',
                    borderRadius: '0.75rem',
                    padding: '0.75rem 1rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    maxWidth: '240px',
                    zIndex: 1000
                  }}
                  place="left"
                  offset={8}
                >
                  <div>
                    <div className="font-semibold text-white mb-1">
                      {agent.label}
                    </div>
                    <div className="text-gray-300 text-xs">
                      {agent.description}
                    </div>
                  </div>
                </Tooltip>
              </motion.div>
            ))}
              {/* Show Guide Button - Only visible when guide is hidden */}
              {isGuideHidden && showGuide && (
              <motion.button
                onClick={showGuide}
                className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 shadow-sm hover:shadow-md transition-all duration-200"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                data-tooltip-id="show-guide-tooltip"
                data-tooltip-content="Show setup guide to get started"
                data-tooltip-place="left"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <FontAwesomeIcon
                  className="h-6 w-6 text-white"
                  icon={faLightbulb}
                />
              </motion.button>
            )}

          </div>
        </div>
      </motion.div>

      {/* Show Guide Tooltip */}
      {isGuideHidden && showGuide && (
        <Tooltip
          id="show-guide-tooltip"
          style={{
            backgroundColor: 'rgb(17 24 39)',
            color: 'rgb(243 244 246)',
            borderRadius: '0.75rem',
            padding: '0.75rem 1rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            maxWidth: '240px',
            zIndex: 1000
          }}
          place="left"
          offset={8}
        >
          <div>
            <div className="font-semibold text-white mb-1">
              Setup Guide
            </div>
            <div className="text-gray-300 text-xs">
              Show setup guide to get started
            </div>
          </div>
        </Tooltip>
      )}
    </>
  );
});