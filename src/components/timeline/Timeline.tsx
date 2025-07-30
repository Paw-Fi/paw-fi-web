import { useState, useMemo } from 'react';
import { useUserActivities } from '@/hooks/useUserActivities';
import { TimelineMain } from './TimelineMain';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export function Timeline() {
  const [searchQuery, setSearchQuery] = useState('');
  const { activities, isLoading, error } = useUserActivities();

  const groupedActivities = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    let filtered = activities;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(activity => 
        activity.goalTitle?.toLowerCase().includes(query) ||
        activity.action.toLowerCase().includes(query)
      );
    }

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600 dark:text-slate-400">Loading your timeline...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center max-w-md p-8 bg-white dark:bg-slate-800 rounded-lg shadow-lg">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
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
    <div className="min-h-screen  dark:bg-slate-900">
      <TimelineMain 
        groupedActivities={groupedActivities}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
    </div>
  );
}