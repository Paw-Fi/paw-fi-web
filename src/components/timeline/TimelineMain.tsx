import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faPlus } from '@fortawesome/free-solid-svg-icons';
import { Activity } from '@/hooks/useUserActivities';
import { TimelineSection } from './TimelineSection';
import { TodaysActivitySection } from './TodaysActivitySection';

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
  selectedDate?: string | null;
  onClearDateFilter?: () => void;
  onLoadMoreActivities?: () => void;
  isLoadingMore?: boolean;
}

export function TimelineMain({ 
  groupedActivities, 
  searchQuery, 
  onSearchChange,
  selectedDate,
  onClearDateFilter,
  onLoadMoreActivities,
  isLoadingMore = false
}: TimelineMainProps) {
  const hasActivities = Object.values(groupedActivities).some(group => group.length > 0);

  return (
    <main className="flex-1 p-6 md:p-10 overflow-y-auto">

      <div className="relative">
        {/* Today's Activity Section - Always show */}
        <TodaysActivitySection activities={groupedActivities.today} />
        
        {hasActivities ? (
          <>
            {/* Remove the regular Today section since we have the dedicated one above */}
            
            {groupedActivities.yesterday.length > 0 && (
              <TimelineSection
                title="Yesterday"
                activities={groupedActivities.yesterday}
                index={0}
              />
            )}
            
            {groupedActivities.lastWeek.length > 0 && (
              <TimelineSection
                title="Last Week"
                activities={groupedActivities.lastWeek}
                index={1}
              />
            )}
            
            {groupedActivities.earlier.length > 0 && (
              <TimelineSection
                title="Earlier"
                activities={groupedActivities.earlier}
                index={2}
              />
            )}
            
            {/* Global Load More Button */}
            {onLoadMoreActivities && (
              <div className="mt-12 flex justify-center">
                <button
                  onClick={onLoadMoreActivities}
                  disabled={isLoadingMore}
                  className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
                >
                  {isLoadingMore ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Loading more activities...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                      Show more activity
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          /* Empty state is now handled by TodaysActivitySection when there are no activities at all */
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery 
                ? `No activities match "${searchQuery}".`
                : "No historical activities found."
              }
            </p>
          </div>
        )}
      </div>
    </main>
  );
}