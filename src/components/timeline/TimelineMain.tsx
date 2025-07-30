import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { Activity } from '@/hooks/useUserActivities';
import { TimelineSection } from './TimelineSection';

interface GroupedActivities {
  today: Activity[];
  yesterday: Activity[];
  lastWeek: Activity[];
  earlier: Activity[];
}

interface TimelineMainProps {
  groupedActivities: GroupedActivities;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function TimelineMain({ 
  groupedActivities, 
  searchQuery, 
  onSearchChange 
}: TimelineMainProps) {
  const headerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
    }
  };

  const timelineVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    }
  };

  // Check if we have any activities
  const hasActivities = Object.values(groupedActivities).some(group => group.length > 0);

  return (
    <main className="flex-1 p-6 md:p-10 overflow-hidden relative">
      {/* Header */}
      <motion.header 
        variants={headerVariants}
        initial="hidden"
        animate="visible"
        className="mb-8"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Activity Timeline
            </h1>
            <p className="text-gray-600 dark:text-slate-400">
              Track your financial journey and celebrate your achievements
            </p>
          </div>
          
          {/* Search Bar */}
          <div className="relative max-w-md w-full lg:w-auto">
            <div className="
              flex items-center rounded-xl p-3 
              bg-white dark:bg-white/5 
              border border-gray-200 dark:border-white/10 
              focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-indigo-500
              focus-within:border-transparent
              transition-all duration-300
            ">
              <FontAwesomeIcon 
                icon={faSearch} 
                className="text-gray-400 dark:text-slate-400 mr-3" 
              />
              <input 
                type="text" 
                placeholder="Search activities..." 
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="
                  bg-transparent border-none outline-none text-sm w-full 
                  text-gray-900 dark:text-white 
                  placeholder-gray-500 dark:placeholder-slate-400
                "
              />
            </div>
          </div>
        </div>
      </motion.header>

      {/* Timeline Container */}
      <div className="relative">
        <motion.div
          variants={timelineVariants}
          initial="hidden"
          animate="visible"
          className="timeline-stack transform-gpu"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {hasActivities ? (
            <>
              {groupedActivities.today.length > 0 && (
                <TimelineSection
                  title="Today"
                  activities={groupedActivities.today}
                  index={0}
                />
              )}
              
              {groupedActivities.yesterday.length > 0 && (
                <TimelineSection
                  title="Yesterday"
                  activities={groupedActivities.yesterday}
                  index={1}
                />
              )}
              
              {groupedActivities.lastWeek.length > 0 && (
                <TimelineSection
                  title="Last Week"
                  activities={groupedActivities.lastWeek}
                  index={2}
                />
              )}
              
              {groupedActivities.earlier.length > 0 && (
                <TimelineSection
                  title="Earlier"
                  activities={groupedActivities.earlier}
                  index={3}
                />
              )}
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="w-20 h-20 mx-auto mb-6 bg-gray-200 dark:bg-slate-800/50 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-2">
                No activities found
              </h3>
              <p className="text-gray-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                {searchQuery 
                  ? `No activities match "${searchQuery}". Try adjusting your search.`
                  : "Start your financial journey by creating goals and tracking your progress."
                }
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </main>
  );
}