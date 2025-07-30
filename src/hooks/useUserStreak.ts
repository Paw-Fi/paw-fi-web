import { useMemo } from 'react'
import { useUserActivities } from './useUserActivities'

export function useUserStreak() {
  const { activities, isLoading, error } = useUserActivities()

  const streak = useMemo(() => {
    if (!activities.length) return 0

    // Group activities by date (YYYY-MM-DD format)
    const activitiesByDate = new Map<string, boolean>()
    
    activities.forEach(activity => {
      const date = new Date(activity.created_at).toDateString()
      activitiesByDate.set(date, true)
    })

    // Calculate streak starting from today
    let currentStreak = 0
    const today = new Date()
    
    // Check each day going backwards from today
    for (let i = 0; i < 365; i++) { // Check up to 365 days back
      const checkDate = new Date(today)
      checkDate.setDate(today.getDate() - i)
      const dateString = checkDate.toDateString()
      
      if (activitiesByDate.has(dateString)) {
        currentStreak++
      } else {
        // If no activity found for this day, break the streak
        break
      }
    }

    return currentStreak
  }, [activities])

  return {
    streak,
    isLoading,
    error
  }
}