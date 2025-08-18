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
      className="rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 shadow-xl backdrop-blur-xl h-fit"
      style={{
        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(59, 130, 246, 0.03) 100%)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.15)"
      }}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.2, ease: [0.25, 0.8, 0.5, 1] }}
    >
      {/* Header with Glass Effect */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <FontAwesomeIcon icon={faChartLine} className="w-4 h-4 text-white" />
          </div>
          <motion.h3 
            className="text-title font-bold text-gray-900 dark:text-white"
            style={{
              fontVariationSettings: "'wght' 600",
              fontSize: "clamp(1.125rem, 2vw, 1.25rem)",
              lineHeight: "1.3"
            }}
          >
            Recent Activity
          </motion.h3>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-sm"></div>
          <span className="text-xs text-green-600 dark:text-green-400 font-medium">Live</span>
        </div>
      </div>

      {/* Activity List Container */}
      <div className="space-y-1">
        <ActivityList activities={activities} isLoading={isLoading} limit={7} />
      </div>

      {/* Enhanced Footer with Action Link */}
      {activities && activities.length > 0 && (
        <motion.div 
          className="mt-6 pt-4 border-t border-gray-200/30 dark:border-gray-700/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          <Link 
            to="/dashboard/timeline" 
            className="group flex items-center justify-center gap-2 w-full py-3 px-4 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm hover:bg-white/60 dark:hover:bg-gray-800/60 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-400 rounded-xl font-medium transition-all duration-200 border border-gray-200/30 dark:border-gray-600/30 hover:border-blue-300/50 dark:hover:border-blue-400/50"
          >
            <span className="text-sm">View Full Timeline</span>
            <FontAwesomeIcon 
              icon={faArrowRight} 
              className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-200" 
            />
          </Link>
        </motion.div>
      )}
    </motion.div>
  );
}