import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';

interface GamificationData {
  streak: number;
  xp: number;
  level: number;
  lastVisit: string;
  completedQuests: string[];
  achievements: string[];
  dailyQuestDate: string;
}

interface Quest {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  completed: boolean;
}

const DEFAULT_GAMIFICATION_DATA: GamificationData = {
  streak: 0,
  xp: 0,
  level: 1,
  lastVisit: '',
  completedQuests: [],
  achievements: [],
  dailyQuestDate: '',
};

export function useGamification() {
  const { user } = useAuth();
  const [gamificationData, setGamificationData] = useState<GamificationData>(DEFAULT_GAMIFICATION_DATA);
  const [isLoading, setIsLoading] = useState(true);

  // Get storage key for user-specific data
  const getStorageKey = () => `gamification_${user?.id || 'guest'}`;

  // Load gamification data from localStorage
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const savedData = localStorage.getItem(getStorageKey());
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setGamificationData(parsedData);
      } catch (error) {
        console.error('Error parsing gamification data:', error);
      }
    }
    setIsLoading(false);
  }, [user]);

  // Save gamification data to localStorage
  const saveData = (data: GamificationData) => {
    if (!user) return;
    localStorage.setItem(getStorageKey(), JSON.stringify(data));
    setGamificationData(data);
  };

  // Check and update streak
  const checkStreak = () => {
    const today = new Date().toDateString();
    const lastVisit = new Date(gamificationData.lastVisit || '').toDateString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

    let newStreak = gamificationData.streak;

    if (lastVisit === today) {
      // Already visited today, no change
      return gamificationData;
    } else if (lastVisit === yesterday) {
      // Visited yesterday, increment streak
      newStreak = gamificationData.streak + 1;
    } else if (lastVisit && lastVisit !== yesterday) {
      // Missed a day, reset streak
      newStreak = 1;
    } else {
      // First visit
      newStreak = 1;
    }

    const updatedData = {
      ...gamificationData,
      streak: newStreak,
      lastVisit: today,
    };

    saveData(updatedData);
    return updatedData;
  };

  // Add XP and check for level up
  const addXP = (amount: number) => {
    const newXP = gamificationData.xp + amount;
    const newLevel = Math.floor(newXP / 500) + 1; // Level up every 500 XP
    
    const updatedData = {
      ...gamificationData,
      xp: newXP,
      level: newLevel,
    };

    saveData(updatedData);

    // Show level up notification if applicable
    if (newLevel > gamificationData.level) {
      // TODO: Show level up toast/modal
      console.log(`Level up! You are now level ${newLevel}`);
    }

    return updatedData;
  };

  // Complete a quest
  const completeQuest = (questId: string, xpReward: number) => {
    const today = new Date().toDateString();
    
    // Reset daily quests if it's a new day
    let completedQuests = gamificationData.completedQuests;
    if (gamificationData.dailyQuestDate !== today) {
      completedQuests = [];
    }

    if (completedQuests.includes(questId)) {
      return gamificationData; // Already completed
    }

    const updatedQuests = [...completedQuests, questId];
    
    const updatedData = {
      ...gamificationData,
      completedQuests: updatedQuests,
      dailyQuestDate: today,
    };

    saveData(updatedData);
    
    // Add XP reward
    if (xpReward > 0) {
      return addXP(xpReward);
    }

    return updatedData;
  };

  // Unlock achievement
  const unlockAchievement = (achievementId: string) => {
    if (gamificationData.achievements.includes(achievementId)) {
      return gamificationData; // Already unlocked
    }

    const updatedData = {
      ...gamificationData,
      achievements: [...gamificationData.achievements, achievementId],
    };

    saveData(updatedData);
    // TODO: Show achievement unlock notification
    console.log(`Achievement unlocked: ${achievementId}`);

    return updatedData;
  };

  // Get daily quests status
  const getDailyQuests = (): Quest[] => {
    const today = new Date().toDateString();
    const isNewDay = gamificationData.dailyQuestDate !== today;
    
    const baseQuests: Quest[] = [
      {
        id: 'answer-question',
        title: 'Answer the Question of the Day',
        description: 'Test your financial knowledge',
        xpReward: 25,
        completed: isNewDay ? false : gamificationData.completedQuests.includes('answer-question'),
      },
      {
        id: 'earn-xp',
        title: 'Earn 50 XP',
        description: 'Complete lessons or use tools',
        xpReward: 0,
        completed: false, // This would be checked against daily XP gained
      },
      {
        id: 'practice-session',
        title: 'Complete one lesson or practice',
        description: 'Keep learning and growing',
        xpReward: 30,
        completed: isNewDay ? false : gamificationData.completedQuests.includes('practice-session'),
      },
    ];

    return baseQuests;
  };

  // Check achievements based on current data
  const checkAchievements = () => {
    const achievementsToUnlock: string[] = [];

    // Streak achievements
    if (gamificationData.streak >= 5 && !gamificationData.achievements.includes('streak-starter')) {
      achievementsToUnlock.push('streak-starter');
    }
    if (gamificationData.streak >= 7 && !gamificationData.achievements.includes('perfect-week')) {
      achievementsToUnlock.push('perfect-week');
    }
    if (gamificationData.streak >= 30 && !gamificationData.achievements.includes('consistency-king')) {
      achievementsToUnlock.push('consistency-king');
    }

    // XP achievements
    if (gamificationData.xp >= 1000 && !gamificationData.achievements.includes('knowledge-seeker')) {
      achievementsToUnlock.push('knowledge-seeker');
    }
    if (gamificationData.xp >= 5000 && !gamificationData.achievements.includes('financial-expert')) {
      achievementsToUnlock.push('financial-expert');
    }

    // Level achievements
    if (gamificationData.level >= 5 && !gamificationData.achievements.includes('rising-star')) {
      achievementsToUnlock.push('rising-star');
    }

    // Unlock new achievements
    achievementsToUnlock.forEach(unlockAchievement);
  };

  // Initialize streak check on load
  useEffect(() => {
    if (!isLoading && user) {
      checkStreak();
      checkAchievements();
    }
  }, [isLoading, user]);

  return {
    gamificationData,
    isLoading,
    addXP,
    completeQuest,
    unlockAchievement,
    getDailyQuests,
    checkStreak,
    checkAchievements,
  };
}