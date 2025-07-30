import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useUserActivities } from '@/hooks/useUserActivities';
import { TimelineMain } from './TimelineMain';
import { TimelineNavigator } from './TimelineNavigator';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export function Timeline() {
  const [searchQuery, setSearchQuery] = useState('');
  
  const { activities, isLoading, error } = useUserActivities();

  // Group activities by time periods
  const groupedActivities = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    let filtered = activities;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(activity => 
        activity.goalTitle?.toLowerCase().includes(query) ||
        activity.action.toLowerCase().includes(query)
      );
    }

    // Group by time periods
    const groups = {
      today: filtered.filter(activity => new Date(activity.created_at) >= today),
      yesterday: filtered.filter(activity => {
        const date = new Date(activity.created_at);
        return date >= yesterday && date < today;
      }),
      lastWeek: filtered.filter(activity => {
        const date = new Date(activity.created_at);
        return date >= weekAgo && date < yesterday;
      }),
      earlier: filtered.filter(activity => new Date(activity.created_at) < weekAgo)
    };

    return groups;
  }, [activities, searchQuery]);

  // Background glow elements
  const backgroundElements = (
    <>
      <motion.div 
        className="fixed top-20 left-20 w-32 h-32 bg-blue-200/20 dark:bg-indigo-500/20 rounded-full blur-3xl"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="fixed bottom-40 right-20 w-32 h-32 bg-purple-200/20 dark:bg-indigo-500/20 rounded-full blur-3xl"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
    </>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600 dark:text-slate-400">Loading your timeline...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
            Unable to load timeline
          </h2>
          <p className="text-gray-600 dark:text-slate-400">
            There was an error loading your activity data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen relative">
      {backgroundElements}
      
      <TimelineMain 
        groupedActivities={groupedActivities}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <TimelineNavigator />
    </div>
  );
}