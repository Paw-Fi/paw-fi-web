import { useMemo, useState } from 'react';
import { Activity } from '@/hooks/useUserActivities';

interface ActivityContributionGraphProps {
  activities: Activity[];
  onDateSelect: (date: string | null) => void;
  selectedDate?: string | null;
}

// Helper function to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper function to get days in current month
function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }
  
  return days;
}

// Helper function to calculate current streak and get streak dates
function calculateStreakInfo(activities: Activity[], today: Date): { streak: number; streakDates: Set<string> } {
  const activityDates = new Set(
    activities.map(activity => formatDate(new Date(activity.created_at)))
  );
  
  let streak = 0;
  const streakDates = new Set<string>();
  const currentDate = new Date(today);
  
  // Start from today and go backwards
  // If today doesn't have activity, start from yesterday
  if (!activityDates.has(formatDate(currentDate))) {
    currentDate.setDate(currentDate.getDate() - 1);
  }
  
  // Count consecutive days with activities going backwards
  while (activityDates.has(formatDate(currentDate))) {
    const dateStr = formatDate(currentDate);
    streak++;
    streakDates.add(dateStr);
    currentDate.setDate(currentDate.getDate() - 1);
  }
  
  return { streak, streakDates };
}

export function ActivityContributionGraph({ 
  activities, 
  onDateSelect, 
  selectedDate 
}: ActivityContributionGraphProps) {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [showYearPicker, setShowYearPicker] = useState(false);
  
  const { calendarData, streak, totalActivities, activeDays } = useMemo(() => {
    // Group activities by date
    const activityByDate = new Map<string, number>();
    
    activities.forEach(activity => {
      const date = formatDate(new Date(activity.created_at));
      activityByDate.set(date, (activityByDate.get(date) || 0) + 1);
    });

    // Get days in selected month
    const monthDays = getDaysInMonth(selectedYear, selectedMonth);
    
    // Calculate streak and get streak dates (always based on current date)
    const { streak: currentStreak, streakDates } = calculateStreakInfo(activities, today);
    
    // Filter activities for selected month to get active days count
    const selectedMonthActiveDays = monthDays.filter(day => 
      activityByDate.has(formatDate(day))
    ).length;
    
    return {
      calendarData: monthDays.map(date => ({
        date: formatDate(date),
        dayNumber: date.getDate(),
        hasActivity: activityByDate.has(formatDate(date)),
        count: activityByDate.get(formatDate(date)) || 0,
        isToday: formatDate(date) === formatDate(today),
        isSelected: formatDate(date) === selectedDate,
        isInStreak: streakDates.has(formatDate(date))
      })),
      streak: currentStreak,
      totalActivities: activities.length,
      activeDays: selectedMonthActiveDays
    };
  }, [activities, selectedYear, selectedMonth, selectedDate, today]);

  // Get month name for selected month/year
  const monthName = new Date(selectedYear, selectedMonth).toLocaleDateString('en-US', { month: 'long' });
  
  // Get first day of selected month to calculate padding
  const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
  const paddingDays = Array(firstDay).fill(null);
  
  // Navigation functions
  const goToPreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };
  
  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };
  
  const goToCurrentMonth = () => {
    setSelectedMonth(today.getMonth());
    setSelectedYear(today.getFullYear());
  };
  
  // Generate year options (current year ± 10 years)
  const yearOptions = Array.from({ length: 21 }, (_, i) => today.getFullYear() - 10 + i);

  return (
    <div className="p-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl border border-white/20 dark:border-slate-700/50 shadow-lg">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Previous month"
          >
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {monthName}
            </h3>
            <div className="relative">
              <button
                onClick={() => setShowYearPicker(!showYearPicker)}
                className="text-base font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                {selectedYear}
              </button>
              
              {showYearPicker && (
                <div className="absolute top-full mt-1 left-0 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {yearOptions.map((year) => (
                    <button
                      key={year}
                      onClick={() => {
                        setSelectedYear(year);
                        setShowYearPicker(false);
                      }}
                      className={`w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${
                        year === selectedYear 
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
          </div>
          
          <button
            onClick={goToNextMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Next month"
          >
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

          {/* Stats */}
      <div className="flex gap-2 items-center mb-3 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-3">
          <span>🔥 <strong className="text-orange-500">{streak}</strong> streak</span>
          <span><strong className="text-gray-900 dark:text-white">{activeDays}</strong> active</span>
        </div>
        {selectedDate && (
          <div className="flex items-center gap-2">
            <span className="text-blue-600 dark:text-blue-400 text-xs">
              {new Date(selectedDate).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric'
              })}
            </span>
            <button
              onClick={() => onDateSelect(null)}
              className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
            >
              Clear
            </button>
          </div>
        )}

{(selectedMonth !== today.getMonth() || selectedYear !== today.getFullYear()) && (
            <button
              onClick={goToCurrentMonth}
              className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
            >
              Today
            </button>
          )}
      </div>
        
      
      </div>

    
      
      <div className="calendar-container">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <div key={index} className="text-xs text-center text-gray-500 dark:text-gray-400 py-1 font-medium">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Padding days for first week */}
          {paddingDays.map((_, index) => (
            <div key={`padding-${index}`} className="w-8 h-8"></div>
          ))}
          
          {/* Calendar days */}
          {calendarData.map((day) => (
            <button
              key={day.date}
              onClick={() => {
                if (selectedDate === day.date) {
                  onDateSelect(null);
                } else {
                  onDateSelect(day.date);
                }
              }}
              className={`w-8 h-8 mx-auto rounded-md flex items-center justify-center text-xs font-medium transition-all duration-200 hover:scale-105 relative ${
                day.isSelected
                  ? 'bg-blue-500 text-white shadow-md'
                  : day.isToday
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500 ring-opacity-50'
                    : day.isInStreak
                      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50'
                      : day.hasActivity
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
                        : 'bg-gray-50 dark:bg-slate-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
              title={
                day.hasActivity 
                  ? `${day.count} activities on ${day.date}${day.isInStreak ? ' (streak day)' : ''}`
                  : `No activities on ${day.date}`
              }
            >
              {/* Activity indicator dot for top-right corner */}
              {day.hasActivity && !day.isInStreak && !day.isSelected && (
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white dark:border-slate-800"></div>
              )}
              
              {day.isInStreak ? (
                <div className="flex flex-col items-center -space-y-1">
                  <span className="text-xs">🔥</span>
                  <span className="text-xs leading-none">{day.dayNumber}</span>
                </div>
              ) : (
                <span>{day.dayNumber}</span>
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* Click outside to close year picker */}
      {showYearPicker && (
        <div 
          className="fixed inset-0 z-5" 
          onClick={() => setShowYearPicker(false)}
        />
      )}
    </div>
  );
}
