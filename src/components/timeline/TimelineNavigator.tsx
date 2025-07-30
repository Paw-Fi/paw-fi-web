import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';

export function TimelineNavigator() {
  // Visual timeline indicators
  const timeIndicators = [
    { label: 'Now', active: true },
    { label: 'Today', active: true },
    { label: 'Yesterday', active: true },
    { label: 'Week', active: false },
    { label: 'Month', active: false }
  ];

  const navigatorVariants = {
    hidden: { 
      opacity: 0, 
      x: 100,
      scale: 0.9
    },
    visible: { 
      opacity: 1, 
      x: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 20,
        delay: 1
      }
    }
  };


  return (
   createPortal( <motion.div 
    variants={navigatorVariants}
    initial="hidden"
    animate="visible"
    className="
      fixed right-2 top-[30vh] transform -translate-y-1/2 z-30
      bg-white/90 dark:bg-black/30 
      backdrop-blur-[20px] 
      border border-gray-200 dark:border-white/10 
      rounded-2xl p-1 shadow-lg dark:shadow-2xl
    "
  >
    <div className="flex flex-col items-center">

      {/* Time Indicators - Visual Only */}
      <div className="flex flex-col items-center space-y-3 h-64 justify-center">
        {timeIndicators.map((indicator) => (
          <div key={indicator.label} className="flex flex-col items-center">
            <div
              className={`
                h-1 rounded-full transition-all duration-200
                ${indicator.active 
                  ? 'w-5 bg-blue-500 dark:bg-indigo-500' 
                  : 'w-3 bg-gray-300 dark:bg-white/20'
                }
              `}
            />
            <span className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              {indicator.label}
            </span>
          </div>
        ))}
      </div>

      {/* Timeline Labels */}
      <div className="flex flex-col items-center mt-4 text-xs text-gray-500 dark:text-slate-400 space-y-2">
        <span className="text-center">3mo</span>
        <span className="text-center">ago</span>
      </div>
    </div>
  </motion.div>, document.body)
  );
}