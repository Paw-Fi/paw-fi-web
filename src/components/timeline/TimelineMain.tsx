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
  const hasActivities = Object.values(groupedActivities).some(group => group.length > 0);

  return (
    <main className="flex-1 p-6 md:p-10 overflow-y-auto">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 sticky top-0  dark:bg-slate-900/80 backdrop-blur-sm z-20 py-4"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Activity Timeline
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              A log of your financial journey.
            </p>
          </div>
          <div className="relative">
            <FontAwesomeIcon 
              icon={faSearch} 
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input 
              type="text" 
              placeholder="Search activities..." 
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="
                w-full md:w-64 dark:bg-slate-800 bg-slate-100 border-none rounded-lg 
                py-3 pl-12 pr-4 text-sm text-gray-900 dark:text-white
                focus:ring-2 focus:ring-blue-500
              "
            />
          </div>
        </div>
      </motion.header>

      <div className="relative">
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
            <div className="w-24 h-24 mx-auto mb-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
              No Activities Found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              {searchQuery 
                ? `No activities match "${searchQuery}".`
                : "Your timeline is empty. Start by setting a goal!"
              }
            </p>
          </motion.div>
        )}
      </div>
    </main>
  );
}