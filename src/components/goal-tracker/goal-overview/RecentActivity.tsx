import { Link } from "@tanstack/react-router";
import { useUserActivities } from "@/hooks/useUserActivities";
import { ActivityList } from "@/components/shared/ActivityList";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faChartLine, faClock } from "@fortawesome/free-solid-svg-icons";
import { motion } from "framer-motion";

export function RecentActivity() {
  const { activities, isLoading } = useUserActivities();

  return (
    <motion.div 
      className="rounded-lg sm:rounded-xl md:rounded-2xl p-0 sm:p-4 md:p-5 lg:p-6 border border-white/20 dark:border-gray-700/50 shadow-lg sm:shadow-xl backdrop-blur-xl h-fit"
      style={{
        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(59, 130, 246, 0.03) 100%)",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.15)"
      }}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.2, ease: [0.25, 0.8, 0.5, 1] }}
    >
      {/* Header with Glass Effect - Mobile optimized */}
      <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-5 lg:mb-6">
        <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md sm:shadow-lg">
            <FontAwesomeIcon icon={faChartLine} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          </div>
          <motion.h3 
            className="text-base sm:text-lg md:text-title font-bold text-gray-900 dark:text-white leading-tight"
            style={{
              fontVariationSettings: "'wght' 600",
              fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
              lineHeight: "1.3"
            }}
          >
            Recent Activity
          </motion.h3>
        </div>
        
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse shadow-sm"></div>
          <span className="text-xs sm:text-xs text-green-600 dark:text-green-400 font-medium">Live</span>
        </div>
      </div>

      {/* Activity List Container - Mobile optimized spacing */}
      <div className="space-y-0.5 sm:space-y-1">
        <ActivityList activities={activities} isLoading={isLoading} limit={7} />
      </div>

      {/* Enhanced Footer with Action Link - Mobile responsive */}
      {activities && activities.length > 0 && (
        <motion.div 
          className="mt-3 sm:mt-4 md:mt-5 lg:mt-6 pt-2.5 sm:pt-3 md:pt-4 border-t border-gray-200/30 dark:border-gray-700/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          <Link 
            to="/dashboard/tracker"
            className="group flex items-center justify-center gap-2 sm:gap-2.5 w-full py-2.5 sm:py-3 px-3 sm:px-4 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm hover:bg-white/60 dark:hover:bg-gray-800/60 active:bg-white/70 dark:active:bg-gray-800/70 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-400 rounded-lg sm:rounded-xl font-medium transition-all duration-200 border border-gray-200/30 dark:border-gray-600/30 hover:border-blue-300/50 dark:hover:border-blue-400/50 touch-manipulation"
          >
            <span className="text-sm">View Full Timeline</span>
            <FontAwesomeIcon 
              icon={faArrowRight} 
              className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:translate-x-1 transition-transform duration-200" 
            />
          </Link>
        </motion.div>
      )}
    </motion.div>
  );
}