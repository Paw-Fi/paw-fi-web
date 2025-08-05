import { motion } from 'framer-motion';
import { Tooltip } from 'react-tooltip';
import { useAIChat } from '@/contexts/ai-chat-context';
import { OptimizedImage } from '@/components/seo/optimized-image';
import logo from '@/assets/images/icon.svg';

interface ChatAgent {
  id: string;
  label: string;
  description: string;
  aiType: 'advisor' | 'tracker' | 'educator';
  color: string;
  onClick: () => void;
}

interface RightSidebarProps {
  className?: string;
}

export const RightSidebar = ({ className = '' }: RightSidebarProps) => {
  const { openChat } = useAIChat();

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
                  id={`chat-tooltip-${agent.id}`}
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
          </div>
        </div>
      </motion.div>
    </>
  );
};