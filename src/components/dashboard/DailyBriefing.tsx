"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFire,
  faCheckCircle,
  faTimesCircle,
  faBolt,
  faArrowRight,
  faQuestionCircle,
  faTrophy,
  faLightbulb,
  faCoins,
  faBullseye,
  faPenToSquare,
  faPaperPlane,
  faThumbsUp,
  faStar,
  faGift,
  faCrown,
  faGem,
  faRocket,
  faShield,
  faMedal,
  faTreeCity,
  faLock,
  faUnlock,
  faChevronRight,
  faCalendar,
  faInfinity,
  faChevronDown,
  faChevronUp,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { Link } from '@tanstack/react-router';
import { useAuth } from '@/contexts/auth-context';
import { useGamification } from '@/hooks/use-gamification';

interface DailyBriefingProps {
  onCompleteQuest?: (questId: string) => void;
  userProgress?: {
    streak: number;
    xp: number;
    level: number;
    completedQuests: string[];
  };
}

interface Quest {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  completed: boolean;
  action?: {
    type: 'link' | 'modal';
    path?: string;
    component?: string;
  };
}

interface QuestionOfDay {
  id: string;
  question: string;
  type: 'multiple-choice' | 'yes-no' | 'reflection';
  options?: string[];
  correctAnswer?: number;
  explanation?: string;
}

interface LevelReward {
  level: number;
  title: string;
  description: string;
  icon: any;
  reward: string;
  color: string;
}

// Level progression system
const LEVEL_REQUIREMENTS = [
  0, 100, 250, 500, 1000, 1750, 2750, 4000, 5500, 7500, 10000, 13000, 16500, 20500, 25000, 30000
];

const LEVEL_REWARDS: LevelReward[] = [
  { level: 1, title: "Financial Newbie", description: "Welcome to your financial journey!", icon: faStar, reward: "Welcome bonus: 50 XP", color: "from-green-400 to-green-600" },
  { level: 2, title: "Learning Sprout", description: "You're getting the hang of it!", icon: faLightbulb, reward: "Bonus daily quest unlock", color: "from-emerald-400 to-teal-600" },
  { level: 3, title: "Smart Saver", description: "Building great financial habits", icon: faCoins, reward: "1 week premium access", color: "from-blue-400 to-blue-600" },
  { level: 4, title: "Budget Master", description: "Mastering your money flow", icon: faShield, reward: "Budgeting tools unlock", color: "from-cyan-400 to-blue-600" },
  { level: 5, title: "Investment Explorer", description: "Ready to grow your wealth", icon: faRocket, reward: "1 month premium access", color: "from-purple-400 to-purple-600" },
  { level: 6, title: "Market Analyst", description: "Understanding market dynamics", icon: faChevronRight, reward: "Market insights unlock", color: "from-indigo-400 to-purple-600" },
  { level: 7, title: "Risk Manager", description: "Balancing risk and reward", icon: faShield, reward: "Risk assessment tools", color: "from-violet-400 to-indigo-600" },
  { level: 8, title: "Portfolio Manager", description: "Managing money like a pro", icon: faTrophy, reward: "Advanced course unlock", color: "from-indigo-400 to-indigo-600" },
  { level: 10, title: "Financial Strategist", description: "Planning long-term wealth", icon: faBullseye, reward: "2 months premium access", color: "from-orange-400 to-red-500" },
  { level: 12, title: "Wealth Builder", description: "Creating lasting financial success", icon: faCrown, reward: "3 months premium access", color: "from-yellow-400 to-orange-500" },
  { level: 15, title: "Financial Guru", description: "Master of financial wisdom", icon: faGem, reward: "1 year premium access", color: "from-pink-400 to-rose-500" },
  { level: 16, title: "Money Mastermind", description: "Ultimate financial mastery", icon: faInfinity, reward: "Lifetime premium access", color: "from-rose-400 to-pink-600" }
];

export function DailyBriefing({ onCompleteQuest, userProgress }: DailyBriefingProps) {
  const { user } = useAuth();
  const { gamificationData, completeQuest, getDailyQuests, isLoading } = useGamification();
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [questionAnswered, setQuestionAnswered] = useState(false);
  
  // Diary functionality
  const [diaryEntry, setDiaryEntry] = useState('');
  const [diarySubmitted, setDiarySubmitted] = useState(false);
  const [diaryFeedback, setDiaryFeedback] = useState('');
  const [diaryCategory, setDiaryCategory] = useState<'saving' | 'spending' | 'investing' | 'learning' | null>(null);
  
  // Rewards modal state
  const [showRewardsModal, setShowRewardsModal] = useState(false);

  // Use real gamification data
  const currentStreak = gamificationData.streak;
  const currentXP = gamificationData.xp;

  // Level progression calculations
  const getCurrentLevelInfo = (xp: number) => {
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

  const levelInfo = getCurrentLevelInfo(currentXP);
  const currentLevelReward = LEVEL_REWARDS.find(r => r.level === levelInfo.level);
  const nextLevelReward = LEVEL_REWARDS.find(r => r.level === levelInfo.level + 1);

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.user_metadata?.full_name?.split(' ')[0] || 'there';
    
    if (hour < 12) return `Good morning, ${name}!`;
    if (hour < 17) return `Good afternoon, ${name}!`;
    return `Good evening, ${name}!`;
  };

  // Sample Question of the Day (would be AI-generated based on user progress)
  const questionOfDay: QuestionOfDay = {
    id: 'qod-001',
    question: "What's the most important factor when choosing an ETF for long-term investing?",
    type: 'multiple-choice',
    options: [
      'Past performance',
      'Expense ratio',
      'Brand name',
      'Daily trading volume'
    ],
    correctAnswer: 1,
    explanation: "Expense ratio is crucial for long-term investing because even small fees compound significantly over time, reducing your overall returns."
  };

  // Get daily quests from gamification hook
  const dailyQuests = getDailyQuests().map(quest => ({
    ...quest,
    action: quest.id !== 'answer-question' ? {
      type: 'link' as const,
      path: '/dashboard/learning'
    } : undefined
  }));

  // AI-powered next step recommendation
  const nextStepRecommendation = {
    title: "Continue Your Investing Journey",
    description: "You explored the Compound Interest Calculator yesterday. Ready for a 5-minute lesson on understanding risk vs. return?",
    action: {
      type: 'link' as const,
      path: '/dashboard/learning',
      buttonText: 'Start Lesson'
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
    setShowAnswer(true);
    setQuestionAnswered(true);
    
    // Award XP for answering (regardless of correctness)
    completeQuest('answer-question', 25);
    
    // Legacy callback support
    if (onCompleteQuest) {
      onCompleteQuest('answer-question');
    }
  };

  const handleDiarySubmit = () => {
    if (!diaryEntry.trim()) return;
    
    setDiarySubmitted(true);
    
    // Generate contextual feedback based on entry content
    const entry = diaryEntry.toLowerCase();
    let feedback = '';
    let category: 'saving' | 'spending' | 'investing' | 'learning' | null = null;
    
    if (entry.includes('saved') || entry.includes('save') || entry.includes('emergency fund')) {
      feedback = "Great job building your savings! Every dollar saved brings you closer to financial security. 🎯";
      category = 'saving';
    } else if (entry.includes('spent') || entry.includes('bought') || entry.includes('purchase')) {
      feedback = "Thanks for tracking your spending! Being mindful of expenses is key to reaching your goals. 💡";
      category = 'spending';
    } else if (entry.includes('invest') || entry.includes('stock') || entry.includes('portfolio') || entry.includes('ETF')) {
      feedback = "Excellent! Investing consistently is one of the best paths to long-term wealth building. 📈";
      category = 'investing';
    } else if (entry.includes('learn') || entry.includes('read') || entry.includes('lesson') || entry.includes('course')) {
      feedback = "Knowledge is your best investment! Keep learning and growing your financial literacy. 📚";
      category = 'learning';
    } else {
      feedback = "Thanks for sharing your progress! Reflecting on your financial journey helps build better habits. ⭐";
    }
    
    setDiaryFeedback(feedback);
    setDiaryCategory(category);
    
    // Award XP for diary entry
    completeQuest('daily-reflection', 15);
  };

  const completedQuests = dailyQuests.filter(quest => quest.completed).length;
  const totalQuests = dailyQuests.length;

  return (
    <div className="space-y-8">
      {/* Hero Header with Level Progression */}
      <motion.div
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-8 shadow-2xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/2 h-96 w-96 rounded-full bg-gradient-to-br from-purple-400/20 to-pink-400/20 blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-1/2 -left-1/2 h-96 w-96 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-3xl animate-pulse delay-1000"></div>
        </div>
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Greeting and Level Info */}
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                  {getGreeting()}
                </h1>
                <p className="text-purple-200 text-lg">
                  Your daily financial mastery dashboard
                </p>
              </div>
              
              {/* Current Level Badge */}
              {currentLevelReward && (
                <motion.div
                  className="group relative inline-flex items-center gap-3 px-6 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl cursor-pointer"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${currentLevelReward.color}`}>
                    <FontAwesomeIcon icon={currentLevelReward.icon} className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-semibold">Level {levelInfo.level}</div>
                    <div className="text-purple-200 text-sm">{currentLevelReward.title}</div>
                  </div>
                  
                  {/* Detailed hover tooltip */}
                  <motion.div
                    className="absolute top-full left-0 mt-2 p-4 bg-gray-900/95 backdrop-blur-xl border border-gray-700 rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto z-50 min-w-80"
                    initial={{ opacity: 0, y: 10 }}
                    whileHover={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="text-white font-semibold mb-2">Level {levelInfo.level} Details</div>
                    <div className="text-gray-300 text-sm mb-3">{currentLevelReward.description}</div>
                    <div className="text-green-400 text-sm font-medium">✨ {currentLevelReward.reward}</div>
                  </motion.div>
                </motion.div>
              )}
            </div>
            
            {/* Streak and Stats */}
            <div className="flex gap-4">
              <motion.div
                className="group relative px-6 py-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl cursor-pointer"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-orange-400 to-red-500">
                    <FontAwesomeIcon icon={faFire} className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{currentStreak}</div>
                    <div className="text-orange-200 text-sm">day streak</div>
                  </div>
                </div>
                
                {/* Streak tooltip */}
                <motion.div
                  className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 p-3 bg-gray-900/95 backdrop-blur-xl border border-gray-700 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto z-50 whitespace-nowrap"
                  initial={{ opacity: 0, y: 10 }}
                  whileHover={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-orange-400 font-semibold text-sm">Keep it burning! 🔥</div>
                  <div className="text-gray-300 text-xs">Daily learning streak</div>
                </motion.div>
              </motion.div>
            </div>
          </div>
          
          {/* XP Progress Bar */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between text-white/90">
              <span className="text-sm font-medium">
                {levelInfo.progressInLevel.toLocaleString()} / {(levelInfo.nextLevelXP - levelInfo.currentLevelXP).toLocaleString()} XP
              </span>
              {!levelInfo.isMaxLevel && (
                <span className="text-sm">
                  {levelInfo.xpNeededForNext.toLocaleString()} XP to level {levelInfo.level + 1}
                </span>
              )}
            </div>
            
            <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full relative"
                style={{ width: `${levelInfo.progressPercentage}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${levelInfo.progressPercentage}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20 animate-pulse"></div>
              </motion.div>
            </div>
            
            {/* Next Level Reward Preview & Rewards Button */}
            <div className="flex items-center justify-between">
              {nextLevelReward && (
                <motion.div
                  className="flex items-center gap-3 text-purple-200 text-sm"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                >
                  <FontAwesomeIcon icon={faGift} className="h-4 w-4" />
                  <span>Next reward: {nextLevelReward.reward} at Level {nextLevelReward.level}</span>
                </motion.div>
              )}
              
              <motion.button
                onClick={() => setShowRewardsModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white text-sm font-medium transition-all duration-200"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FontAwesomeIcon icon={faTrophy} className="h-4 w-4" />
                <span>View All Rewards</span>
                <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
      {/* Modern Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Question of the Day - Modern Design */}
        <motion.div 
          className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl border border-purple-200/50 p-6 shadow-lg hover:shadow-2xl transition-all duration-300"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          whileHover={{ y: -4 }}
        >
          {/* Gradient accent */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
          
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
              <FontAwesomeIcon icon={faQuestionCircle} className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Daily Challenge</h3>
              <p className="text-gray-600 text-sm">Test your financial knowledge</p>
            </div>
          </div>
          
          <p className="text-gray-800 mb-6 leading-relaxed font-medium">{questionOfDay.question}</p>
          
          <div className="space-y-3">
            {questionOfDay.options?.map((option, index) => (
              <motion.button
                key={index}
                onClick={() => !showAnswer && handleAnswerSelect(index)}
                className={`group/option w-full text-left p-4 rounded-xl border-2 transition-all duration-300 ${
                  showAnswer
                    ? index === questionOfDay.correctAnswer
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 text-green-900 shadow-md'
                      : selectedAnswer === index && index !== questionOfDay.correctAnswer
                      ? 'bg-gradient-to-r from-red-50 to-rose-50 border-red-300 text-red-900 shadow-md'
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                    : selectedAnswer === index
                    ? 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-300 text-purple-900 shadow-md'
                    : 'bg-white border-gray-200 text-gray-800 hover:border-purple-300 hover:bg-purple-50/50'
                } ${showAnswer ? 'cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}`}
                disabled={showAnswer}
                whileHover={!showAnswer ? { scale: 1.01, x: 4 } : {}}
                whileTap={!showAnswer ? { scale: 0.99 } : {}}
              >
                <div className="flex items-center gap-3">
                  {showAnswer && (
                    <div className={`p-1.5 rounded-full ${
                      index === questionOfDay.correctAnswer 
                        ? 'bg-green-500' 
                        : selectedAnswer === index 
                        ? 'bg-red-500' 
                        : 'bg-gray-400'
                    }`}>
                      <FontAwesomeIcon 
                        icon={index === questionOfDay.correctAnswer ? faCheckCircle : faTimesCircle} 
                        className="h-3 w-3 text-white"
                      />
                    </div>
                  )}
                  <span className="font-medium">{option}</span>
                </div>
              </motion.button>
            ))}
          </div>
          
          {showAnswer && questionOfDay.explanation && (
            <motion.div 
              className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500">
                  <FontAwesomeIcon icon={faLightbulb} className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-blue-900 mb-1">Explanation</div>
                  <p className="text-sm text-blue-800 leading-relaxed">{questionOfDay.explanation}</p>
                </div>
              </div>
            </motion.div>
          )}
          
          {questionAnswered && (
            <motion.div 
              className="mt-4 flex items-center justify-between p-3 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl border border-green-200"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <div className="flex items-center gap-2 text-green-700">
                <FontAwesomeIcon icon={faCoins} className="h-4 w-4" />
                <span className="font-semibold text-sm">+25 XP earned!</span>
              </div>
              <div className="flex items-center gap-1 text-green-600">
                <FontAwesomeIcon icon={faStar} className="h-3 w-3" />
                <span className="text-xs">Great job!</span>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* AI-Powered Next Step */}
        <motion.div 
          className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl border border-purple-200/50 p-6 shadow-lg hover:shadow-2xl transition-all duration-300"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          whileHover={{ y: -4 }}
        >
          {/* Gradient accent */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
          
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg">
              <FontAwesomeIcon icon={faRocket} className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">AI Recommendation</h3>
              <p className="text-gray-600 text-sm">Personalized next step</p>
            </div>
          </div>
          
          <h4 className="text-lg font-bold text-gray-900 mb-3">{nextStepRecommendation.title}</h4>
          <p className="text-gray-700 mb-6 leading-relaxed">{nextStepRecommendation.description}</p>
          
          <Link to={nextStepRecommendation.action.path}>
            <motion.button
              className="w-full group/btn relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 p-4 text-white font-semibold shadow-lg transition-all duration-300 hover:shadow-xl"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-700 to-pink-700 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-center gap-3">
                <FontAwesomeIcon icon={faBolt} className="h-4 w-4" />
                <span>{nextStepRecommendation.action.buttonText}</span>
                <FontAwesomeIcon 
                  icon={faArrowRight} 
                  className="h-4 w-4 transform group-hover/btn:translate-x-1 transition-transform duration-300" 
                />
              </div>
            </motion.button>
          </Link>
        </motion.div>
      </div>

      {/* Financial Progress Diary - Modern Design */}
      <motion.div 
        className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl border border-green-200/50 p-6 shadow-lg hover:shadow-2xl transition-all duration-300"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        {/* Gradient accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-teal-500"></div>
        
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-green-500 to-teal-600 shadow-lg">
            <FontAwesomeIcon icon={faPenToSquare} className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Progress Journal</h3>
            <p className="text-gray-600 text-sm">Document your financial wins</p>
          </div>
        </div>
        
        <p className="text-gray-700 mb-6 leading-relaxed">
          Share your financial journey today! Track savings, spending, investments, or learning milestones.
        </p>
        
        {!diarySubmitted ? (
          <div className="space-y-6">
            <div className="relative">
              <textarea
                value={diaryEntry}
                onChange={(e) => setDiaryEntry(e.target.value)}
                placeholder="e.g., 'Saved $50 by meal prepping' • 'Invested $200 in S&P 500' • 'Completed lesson on compound interest'"
                className="w-full px-5 py-4 bg-white/50 border-2 border-gray-200 rounded-xl resize-none focus:outline-none focus:border-green-400 focus:bg-white transition-all duration-300 text-sm font-medium shadow-inner"
                rows={4}
                maxLength={200}
              />
              <div className="absolute bottom-3 right-3 px-2 py-1 bg-gray-100 rounded-lg text-xs text-gray-500 font-medium">
                {diaryEntry.length}/200
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-600 font-medium mb-1">Quick templates:</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { text: "Saving", example: "Saved $25 by bringing lunch to work today", color: "from-green-400 to-green-500" },
                    { text: "Spending", example: "Spent $40 on groceries for the week", color: "from-blue-400 to-blue-500" },
                    { text: "Investing", example: "Invested $100 in my index fund today", color: "from-purple-400 to-purple-500" }
                  ].map((template) => (
                    <motion.button
                      key={template.text}
                      onClick={() => setDiaryEntry(template.example)}
                      className={`px-3 py-1.5 text-xs font-medium text-white rounded-lg bg-gradient-to-r ${template.color} shadow-md hover:shadow-lg transition-all duration-200`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {template.text}
                    </motion.button>
                  ))}
                </div>
              </div>
              
              <motion.button
                onClick={handleDiarySubmit}
                disabled={!diaryEntry.trim()}
                className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                  diaryEntry.trim()
                    ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white hover:from-green-700 hover:to-teal-700 shadow-lg hover:shadow-xl'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                whileHover={diaryEntry.trim() ? { scale: 1.02 } : {}}
                whileTap={diaryEntry.trim() ? { scale: 0.98 } : {}}
              >
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faPaperPlane} className="h-4 w-4" />
                  Share Progress
                </div>
              </motion.button>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="space-y-4"
          >
            <div className="relative p-5 bg-gradient-to-r from-green-50 to-teal-50 border-2 border-green-200 rounded-xl">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-teal-600">
                  <FontAwesomeIcon icon={faThumbsUp} className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-green-900 mb-2">Today's Achievement</div>
                  <p className="text-gray-800 font-medium italic mb-3 p-3 bg-white/60 rounded-lg border border-green-200">
                    "{diaryEntry}"
                  </p>
                  <p className="text-green-700 font-medium">{diaryFeedback}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 text-green-600">
                <div className="p-1.5 rounded-lg bg-green-100">
                  <FontAwesomeIcon icon={faCoins} className="h-4 w-4" />
                </div>
                <span className="font-bold text-sm">+15 XP earned!</span>
              </div>
              
              <motion.button
                onClick={() => {
                  setDiarySubmitted(false);
                  setDiaryEntry('');
                  setDiaryFeedback('');
                  setDiaryCategory(null);
                }}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium hover:bg-gray-100 px-3 py-1 rounded-lg transition-all duration-200"
                whileHover={{ scale: 1.05 }}
              >
                Add another entry
              </motion.button>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Learning Tree - Daily Quests Redesigned */}
      <motion.div 
        className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl border border-indigo-200/50 p-6 shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        {/* Gradient accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
              <FontAwesomeIcon icon={faTreeCity} className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Learning Tree</h3>
              <p className="text-gray-600 text-sm">Complete your daily growth path</p>
            </div>
          </div>
          
          <div className="px-4 py-2 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-xl border border-indigo-200">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faTrophy} className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-bold text-indigo-900">
                {completedQuests}/{totalQuests} completed
              </span>
            </div>
          </div>
        </div>
        
        {/* Quest Tree Layout */}
        <div className="relative">
          {/* Connection lines background */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
            <defs>
              <linearGradient id="questLine" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgb(99 102 241)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="rgb(147 51 234)" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            {dailyQuests.map((_, index) => (
              index < dailyQuests.length - 1 && (
                <line
                  key={index}
                  x1={`${((index % 3) * 33.33 + 16.67)}%`}
                  y1={`${Math.floor(index / 3) * 120 + 60}px`}
                  x2={`${(((index + 1) % 3) * 33.33 + 16.67)}%`}
                  y2={`${Math.floor((index + 1) / 3) * 120 + 60}px`}
                  stroke="url(#questLine)"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                />
              )
            ))}
          </svg>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative" style={{ zIndex: 1 }}>
            {dailyQuests.map((quest, index) => (
              <motion.div
                key={quest.id}
                className={`group relative p-5 rounded-2xl border-2 transition-all duration-300 ${
                  quest.completed 
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 shadow-lg' 
                    : 'bg-white border-indigo-200 hover:border-indigo-300 hover:shadow-lg hover:-translate-y-1'
                }`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.6 + (index * 0.1) }}
                whileHover={!quest.completed ? { scale: 1.02 } : {}}
              >
                {/* Quest completion indicator */}
                <div className="absolute -top-3 -right-3">
                  <div className={`p-2 rounded-full shadow-lg ${
                    quest.completed 
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                      : 'bg-gradient-to-br from-gray-300 to-gray-400'
                  }`}>
                    <FontAwesomeIcon 
                      icon={quest.completed ? faCheckCircle : faCircle} 
                      className="h-4 w-4 text-white"
                    />
                  </div>
                </div>
                
                {/* XP Badge */}
                {quest.xpReward > 0 && (
                  <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold ${
                    quest.completed 
                      ? 'bg-green-200 text-green-800' 
                      : 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white shadow-md'
                  }`}>
                    +{quest.xpReward} XP
                  </div>
                )}
                
                <div className="pt-2">
                  <h4 className={`text-lg font-bold mb-2 ${
                    quest.completed ? 'text-green-900' : 'text-gray-900'
                  }`}>
                    {quest.title}
                  </h4>
                  <p className={`text-sm leading-relaxed mb-4 ${
                    quest.completed ? 'text-green-700' : 'text-gray-700'
                  }`}>
                    {quest.description}
                  </p>
                  
                  {quest.action && !quest.completed && (
                    <Link to={quest.action.path || '#'}>
                      <motion.button
                        className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <FontAwesomeIcon icon={faRocket} className="h-3 w-3" />
                          Take Action
                        </div>
                      </motion.button>
                    </Link>
                  )}
                  
                  {quest.completed && (
                    <div className="flex items-center justify-center p-2 bg-green-200/50 rounded-xl">
                      <span className="text-sm font-semibold text-green-800">✨ Completed!</span>
                    </div>
                  )}
                </div>

                {/* Detailed tooltip on hover */}
                <motion.div
                  className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 p-4 bg-gray-900/95 backdrop-blur-xl border border-gray-700 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto z-50 min-w-64"
                  initial={{ opacity: 0, y: 10 }}
                  whileHover={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-white font-semibold text-sm mb-2">{quest.title}</div>
                  <div className="text-gray-300 text-xs mb-2">{quest.description}</div>
                  {quest.xpReward > 0 && (
                    <div className="text-yellow-400 text-xs font-medium">
                      Reward: +{quest.xpReward} XP
                    </div>
                  )}
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

     
      
      {/* Rewards Modal */}
      {showRewardsModal && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowRewardsModal(false)}
          />
          
          {/* Modal */}
          <motion.div
            className="fixed inset-4 md:inset-8 lg:inset-16 xl:inset-24 z-50 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            <div className="relative w-full max-w-4xl max-h-full bg-white rounded-3xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white/20">
                      <FontAwesomeIcon icon={faTrophy} className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Rewards Roadmap</h2>
                      <p className="text-amber-100">
                        {LEVEL_REWARDS.filter(r => levelInfo.level >= r.level).length} / {LEVEL_REWARDS.length} rewards unlocked
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRewardsModal(false)}
                    className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    <FontAwesomeIcon icon={faTimes} className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              {/* Scrollable Content */}
              <div className="max-h-96 overflow-y-auto p-6">
                <div className="relative">
                  {/* Progress line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-200 via-orange-300 to-amber-200"></div>
                  
                  <div className="space-y-4">
                    {LEVEL_REWARDS.map((reward, index) => {
                      const isUnlocked = levelInfo.level >= reward.level;
                      const isNext = !isUnlocked && reward.level === levelInfo.level + 1;
                      const xpRequired = LEVEL_REQUIREMENTS[reward.level - 1] || 0;
                      
                      return (
                        <motion.div
                          key={reward.level}
                          className={`relative flex items-start gap-4 p-4 rounded-xl transition-all duration-200 ${
                            isUnlocked 
                              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200' 
                              : isNext
                              ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 ring-2 ring-amber-200'
                              : 'bg-gray-50 border border-gray-200 opacity-75'
                          }`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                        >
                          {/* Level indicator */}
                          <div className={`relative flex-shrink-0 p-3 rounded-xl shadow-lg ${
                            isUnlocked 
                              ? `bg-gradient-to-br ${reward.color}` 
                              : isNext
                              ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                              : 'bg-gradient-to-br from-gray-300 to-gray-400'
                          }`}>
                            <FontAwesomeIcon 
                              icon={isUnlocked ? faUnlock : reward.icon} 
                              className="h-4 w-4 text-white" 
                            />
                            {!isUnlocked && (
                              <div className="absolute -top-1 -right-1 p-1 bg-gray-600 rounded-full">
                                <FontAwesomeIcon icon={faLock} className="h-2 w-2 text-white" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-lg font-bold ${
                                  isUnlocked ? 'text-green-900' : isNext ? 'text-amber-900' : 'text-gray-700'
                                }`}>
                                  Level {reward.level}
                                </span>
                                {isNext && (
                                  <span className="px-2 py-1 bg-amber-200 text-amber-800 text-xs font-bold rounded-full">
                                    NEXT
                                  </span>
                                )}
                                {isUnlocked && (
                                  <span className="px-2 py-1 bg-green-200 text-green-800 text-xs font-bold rounded-full">
                                    ✓ UNLOCKED
                                  </span>
                                )}
                              </div>
                              <div className={`text-sm font-medium ${
                                isUnlocked ? 'text-green-600' : isNext ? 'text-amber-600' : 'text-gray-500'
                              }`}>
                                {xpRequired.toLocaleString()} XP
                              </div>
                            </div>
                            
                            <h4 className={`font-bold mb-1 ${
                              isUnlocked ? 'text-green-900' : isNext ? 'text-amber-900' : 'text-gray-700'
                            }`}>
                              {reward.title}
                            </h4>
                            <p className={`text-sm mb-3 ${
                              isUnlocked ? 'text-green-700' : isNext ? 'text-amber-700' : 'text-gray-600'
                            }`}>
                              {reward.description}
                            </p>
                            
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`p-1.5 rounded-lg ${
                                isUnlocked ? 'bg-green-200' : isNext ? 'bg-amber-200' : 'bg-gray-200'
                              }`}>
                                <FontAwesomeIcon 
                                  icon={faGift} 
                                  className={`h-3 w-3 ${
                                    isUnlocked ? 'text-green-600' : isNext ? 'text-amber-600' : 'text-gray-500'
                                  }`} 
                                />
                              </div>
                              <span className={`text-sm font-semibold ${
                                isUnlocked ? 'text-green-800' : isNext ? 'text-amber-800' : 'text-gray-600'
                              }`}>
                                🎁 {reward.reward}
                              </span>
                            </div>
                            
                            {isNext && (
                              <div className="p-3 bg-amber-100 rounded-lg border border-amber-200">
                                <div className="text-xs text-amber-800 font-medium mb-2">
                                  {levelInfo.xpNeededForNext.toLocaleString()} XP needed to unlock
                                </div>
                                <div className="h-2 bg-amber-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min((currentXP / xpRequired) * 100, 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {/* Footer */}
              <div className="p-4 bg-gray-50 border-t">
                <div className="text-center text-sm text-gray-600">
                  Keep learning and growing to unlock amazing rewards! 🚀
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}

// Helper icon import
import { faCircle } from '@fortawesome/free-regular-svg-icons';