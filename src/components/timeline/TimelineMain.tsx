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

  // If a specific date is selected, show all filtered activities in a single section
  if (selectedDate) {
    const selectedDateObj = new Date(selectedDate);
    const isToday = selectedDateObj.toDateString() === new Date().toDateString();
    const isYesterday = selectedDateObj.toDateString() === new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    
    let dateTitle;
    if (isToday) {
      dateTitle = "Today";
    } else if (isYesterday) {
      dateTitle = "Yesterday";
    } else {
      dateTitle = selectedDateObj.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric',
        year: selectedDateObj.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
      });
    }

    const allSelectedDateActivities = [
      ...groupedActivities.today,
      ...groupedActivities.yesterday, 
      ...groupedActivities.lastWeek,
      ...groupedActivities.earlier
    ];

    return (
      <main className="flex-1 p-1 md:p-10 overflow-y-auto">
        <div className="relative">
          {allSelectedDateActivities.length > 0 ? (
            <TimelineSection
              title={dateTitle}
              activities={allSelectedDateActivities}
              index={0}
              defaultExpanded={true}
            />
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No activities on {dateTitle}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No activities were recorded for this date.
              </p>
              <button
                onClick={onClearDateFilter}
                className="px-4 py-2 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
              >
                View all activities
              </button>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-1 md:p-10 overflow-y-auto">

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