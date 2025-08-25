import { useGamification } from "@/hooks/use-gamification";
import { Star, Lightbulb, Coins, Shield, Rocket, ChevronRight, Trophy, Target, Crown, Gem, Infinity } from "lucide-react";

interface LevelReward {
    level: number;
    title: string;
    description: string;
    icon: any;
    reward: string;
    color: string;
  }
  
  // Level progression system
  export const LEVEL_REQUIREMENTS = [
    0, 1000, 2500, 5000, 10000, 17500, 27500, 40000, 55000, 75000, 100000, 130000, 165000, 205000, 250000, 300000
  ];
  
  export const LEVEL_REWARDS: LevelReward[] = [
    { level: 1, title: "Financial Newbie", description: "Welcome to your financial journey!", icon: Star, reward: "Welcome bonus: 50 XP", color: "from-green-400 to-green-600" },
    { level: 2, title: "Learning Sprout", description: "You're getting the hang of it!", icon: Lightbulb, reward: "Bonus daily quest unlock", color: "from-emerald-400 to-teal-600" },
    { level: 3, title: "Smart Saver", description: "Building great financial habits", icon: Coins, reward: "1 week premium access", color: "from-blue-400 to-blue-600" },
    { level: 4, title: "Budget Master", description: "Mastering your money flow", icon: Shield, reward: "Budgeting tools unlock", color: "from-cyan-400 to-blue-600" },
    { level: 5, title: "Investment Explorer", description: "Ready to grow your wealth", icon: Rocket, reward: "1 month premium access", color: "from-purple-400 to-purple-600" },
    { level: 6, title: "Market Analyst", description: "Understanding market dynamics", icon: ChevronRight, reward: "Market insights unlock", color: "from-indigo-400 to-purple-600" },
    { level: 7, title: "Risk Manager", description: "Balancing risk and reward", icon: Shield, reward: "Risk assessment tools", color: "from-violet-400 to-indigo-600" },
    { level: 8, title: "Portfolio Manager", description: "Managing money like a pro", icon: Trophy, reward: "Advanced course unlock", color: "from-indigo-400 to-indigo-600" },
    { level: 10, title: "Financial Strategist", description: "Planning long-term wealth", icon: Target, reward: "2 months premium access", color: "from-orange-400 to-red-500" },
    { level: 12, title: "Wealth Builder", description: "Creating lasting financial success", icon: Crown, reward: "3 months premium access", color: "from-yellow-400 to-orange-500" },
    { level: 15, title: "Financial Guru", description: "Master of financial wisdom", icon: Gem, reward: "1 year premium access", color: "from-pink-400 to-rose-500" },
    { level: 16, title: "Money Mastermind", description: "Ultimate financial mastery", icon: Infinity, reward: "Lifetime premium access", color: "from-rose-400 to-pink-600" }
  ];


  // Level progression calculations
  export const getCurrentLevelInfo = (xp: number) => {
    console.log("cu8rrent xp", xp)
    let level = 1;
    for (let i = LEVEL_REQUIREMENTS.length - 1; i >= 0; i--) {
      if (xp >= LEVEL_REQUIREMENTS[i]) {
        level = i + 1;
        break;
      }
    }
    
    const currentLevelXP = LEVEL_REQUIREMENTS[level - 1] || 0;
    const nextLevelXP = LEVEL_REQUIREMENTS[level] || LEVEL_REQUIREMENTS[LEVEL_REQUIREMENTS.length - 1];
    const progressInLevel = xp - currentLevelXP;
    const xpNeededForNext = nextLevelXP - xp;
    const progressPercentage = (progressInLevel / (nextLevelXP - currentLevelXP)) * 100;
    
    return {
      level,
      currentLevelXP,
      nextLevelXP,
      progressInLevel,
      xpNeededForNext,
      progressPercentage: Math.min(progressPercentage, 100),
      isMaxLevel: level >= LEVEL_REQUIREMENTS.length
    };
  };
