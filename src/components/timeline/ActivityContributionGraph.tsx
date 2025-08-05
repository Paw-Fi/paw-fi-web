import { useMemo, useRef, useEffect } from 'react';
import { ActivityCalendar } from 'react-activity-calendar';
import { Activity } from '@/hooks/useUserActivities';

interface ActivityData {
  date: string;
  count: number;
  level: number;
}

interface ActivityContributionGraphProps {
  activities: Activity[];
  onDateSelect: (date: string | null) => void;
  selectedDate?: string | null;
}

// Helper function to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper function to get activity level based on count
function getActivityLevel(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4; // 6+ activities
}

// Helper function to generate date range for the last 365 days
function generateDateRange(): string[] {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = 364; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    dates.push(formatDate(date));
  }
  
  return dates;
}

export function ActivityContributionGraph({ 
  activities, 
  onDateSelect, 
  selectedDate 
}: ActivityContributionGraphProps) {
  const calendarRef = useRef<HTMLDivElement>(null);
  
  const calendarData = useMemo(() => {
    // Group activities by date
    const activityByDate = new Map<string, number>();
    
    activities.forEach(activity => {
      const date = formatDate(new Date(activity.created_at));
      activityByDate.set(date, (activityByDate.get(date) || 0) + 1);
    });

    // Generate data for the last 365 days
    const dateRange = generateDateRange();
    
    return dateRange.map(date => ({
      date,
      count: activityByDate.get(date) || 0,
      level: getActivityLevel(activityByDate.get(date) || 0),
    }));
  }, [activities]);

  // Handle clicks on calendar blocks using event delegation
  useEffect(() => {
    const calendarElement = calendarRef.current;
    if (!calendarElement) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const rect = target.closest('[data-date]') as HTMLElement;
      
      if (rect && rect.dataset.date) {
        const clickedDate = rect.dataset.date;
        // If clicking the same date, deselect it
        if (selectedDate === clickedDate) {
          onDateSelect(null);
        } else {
          onDateSelect(clickedDate);
        }
      }
    };

    calendarElement.addEventListener('click', handleClick);
    return () => {
      calendarElement.removeEventListener('click', handleClick);
    };
  }, [selectedDate, onDateSelect]);

  const totalActivities = activities.length;
  const activeDays = calendarData.filter(day => day.count > 0).length;

  return (
    <div className="p-6 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-slate-700/50 shadow-lg">
      <div className="s">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Activity Overview
        </h2>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span>
            <strong className="text-gray-900 dark:text-white">{totalActivities}</strong> activities in the last year
          </span>
          <span>
            <strong className="text-gray-900 dark:text-white">{activeDays}</strong> active days
          </span>
          {selectedDate && (
            <span className="text-blue-600 dark:text-blue-400">
              Filtered by: <strong>{selectedDate}</strong>
              <button
                onClick={() => onDateSelect(null)}
                className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
              >
                Clear
              </button>
            </span>
          )}
        </div>
      </div>
      
      <div className="overflow-x-auto" ref={calendarRef}>
        <ActivityCalendar
          data={calendarData}
          theme={{
            light: [
              'hsl(0, 0%, 92%)',
              'hsl(142, 52%, 96%)',
              'hsl(142, 52%, 85%)',
              'hsl(142, 52%, 70%)',
              'hsl(142, 52%, 50%)',
            ],
            dark: [
              'hsl(215, 28%, 17%)',
              'hsl(142, 52%, 20%)',
              'hsl(142, 52%, 30%)',
              'hsl(142, 52%, 40%)',
              'hsl(142, 52%, 50%)',
            ],
          }}
          labels={{
            months: [
              'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
            ],
            weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            totalCount: '{{count}} activities in {{year}}',
            legend: {
              less: 'Less',
              more: 'More'
            }
          }}
          showWeekdayLabels
          blockSize={12}
          blockMargin={3}
          fontSize={12}
          style={{
            color: 'inherit',
          }}
        />
      </div>      
    
    </div>
  );
}
