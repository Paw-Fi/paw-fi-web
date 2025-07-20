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
  faCalendarCheck,
  faLightbulb,
  faCoins,
  faBullseye,
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

export function DailyBriefing({ onCompleteQuest, userProgress }: DailyBriefingProps) {
  const { user } = useAuth();
  const { gamificationData, completeQuest, getDailyQuests, isLoading } = useGamification();
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [questionAnswered, setQuestionAnswered] = useState(false);

  // Use real gamification data
  const currentStreak = gamificationData.streak;
  const currentXP = gamificationData.xp;
  const currentLevel = gamificationData.level;

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

  const completedQuests = dailyQuests.filter(quest => quest.completed).length;
  const totalQuests = dailyQuests.length;

  return (
    <motion.div
      className="bg-gradient-to-br from-white via-purple-50/30 to-blue-50/20 rounded-2xl border border-purple-200/50 shadow-lg p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* Header with Greeting and Streak */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {getGreeting()}
          </h2>
          <p className="text-gray-600">Your daily financial fitness briefing</p>
        </div>
        
        {/* Streak Counter */}
        <motion.div 
          className="flex items-center bg-gradient-to-r from-orange-100 to-red-100 rounded-xl px-4 py-2 border border-orange-200"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
        >
          <FontAwesomeIcon icon={faFire} className="h-6 w-6 text-orange-500 mr-2" />
          <div className="text-right">
            <div className="text-2xl font-bold text-orange-600">{currentStreak}</div>
            <div className="text-xs text-orange-700">day streak</div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Question of the Day */}
        <motion.div 
          className="bg-white/60 backdrop-blur-sm rounded-xl border border-blue-200 p-5"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center mb-4">
            <FontAwesomeIcon icon={faQuestionCircle} className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Question of the Day</h3>
          </div>
          
          <p className="text-gray-700 mb-4 leading-relaxed">{questionOfDay.question}</p>
          
          <div className="space-y-2">
            {questionOfDay.options?.map((option, index) => (
              <motion.button
                key={index}
                onClick={() => !showAnswer && handleAnswerSelect(index)}
                className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                  showAnswer
                    ? index === questionOfDay.correctAnswer
                      ? 'bg-green-100 border-green-300 text-green-800'
                      : selectedAnswer === index && index !== questionOfDay.correctAnswer
                      ? 'bg-red-100 border-red-300 text-red-800'
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                    : selectedAnswer === index
                    ? 'bg-blue-100 border-blue-300 text-blue-800'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                } ${showAnswer ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                disabled={showAnswer}
                whileHover={!showAnswer ? { scale: 1.02 } : {}}
                whileTap={!showAnswer ? { scale: 0.98 } : {}}
              >
                <div className="flex items-center">
                  {showAnswer && (
                    <FontAwesomeIcon 
                      icon={index === questionOfDay.correctAnswer ? faCheckCircle : faTimesCircle} 
                      className={`h-4 w-4 mr-2 ${
                        index === questionOfDay.correctAnswer ? 'text-green-600' : 'text-red-600'
                      }`} 
                    />
                  )}
                  {option}
                </div>
              </motion.button>
            ))}
          </div>
          
          {showAnswer && questionOfDay.explanation && (
            <motion.div 
              className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-start">
                <FontAwesomeIcon icon={faLightbulb} className="h-4 w-4 text-blue-600 mr-2 mt-0.5" />
                <p className="text-sm text-blue-800">{questionOfDay.explanation}</p>
              </div>
            </motion.div>
          )}
          
          {questionAnswered && (
            <motion.div 
              className="mt-3 flex items-center text-green-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <FontAwesomeIcon icon={faCoins} className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium">+25 XP earned!</span>
            </motion.div>
          )}
        </motion.div>

        {/* Next Step Recommendation */}
        <motion.div 
          className="bg-white/60 backdrop-blur-sm rounded-xl border border-purple-200 p-5"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex items-center mb-4">
            <FontAwesomeIcon icon={faBullseye} className="h-5 w-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Your Next Step</h3>
          </div>
          
          <h4 className="font-semibold text-gray-900 mb-2">{nextStepRecommendation.title}</h4>
          <p className="text-gray-700 mb-4 leading-relaxed">{nextStepRecommendation.description}</p>
          
          <Link to={nextStepRecommendation.action.path}>
            <motion.button
              className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FontAwesomeIcon icon={faBolt} className="h-4 w-4 mr-2" />
              {nextStepRecommendation.action.buttonText}
              <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4 ml-2" />
            </motion.button>
          </Link>
        </motion.div>
      </div>

      {/* Daily Quests */}
      <motion.div 
        className="mt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faCalendarCheck} className="h-5 w-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Daily Quests</h3>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <FontAwesomeIcon icon={faTrophy} className="h-4 w-4 mr-1" />
            {completedQuests}/{totalQuests} completed
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dailyQuests.map((quest, index) => (
            <motion.div
              key={quest.id}
              className={`p-4 rounded-lg border transition-all duration-200 ${
                quest.completed 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.5 + (index * 0.1) }}
            >
              <div className="flex items-start justify-between mb-2">
                <FontAwesomeIcon 
                  icon={quest.completed ? faCheckCircle : faCircle} 
                  className={`h-5 w-5 mt-0.5 ${
                    quest.completed ? 'text-green-600' : 'text-gray-400'
                  }`} 
                />
                {quest.xpReward > 0 && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    quest.completed ? 'bg-green-200 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    +{quest.xpReward} XP
                  </span>
                )}
              </div>
              <h4 className={`font-medium mb-1 ${
                quest.completed ? 'text-green-800' : 'text-gray-900'
              }`}>
                {quest.title}
              </h4>
              <p className={`text-sm ${
                quest.completed ? 'text-green-700' : 'text-gray-600'
              }`}>
                {quest.description}
              </p>
              
              {quest.action && !quest.completed && (
                <Link to={quest.action.path || '#'} className="mt-2 block">
                  <motion.button
                    className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                    whileHover={{ scale: 1.05 }}
                  >
                    Take Action →
                  </motion.button>
                </Link>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Progress Summary */}
      <motion.div 
        className="mt-6 flex items-center justify-between text-sm text-gray-600 bg-gray-50/50 rounded-lg p-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faCoins} className="h-4 w-4 mr-1 text-yellow-600" />
            <span>{currentXP.toLocaleString()} XP</span>
          </div>
          <div className="flex items-center">
            <FontAwesomeIcon icon={faTrophy} className="h-4 w-4 mr-1 text-purple-600" />
            <span>Level {currentLevel}</span>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          Keep your streak alive! Come back tomorrow.
        </div>
      </motion.div>
    </motion.div>
  );
}

// Helper icon import
import { faCircle } from '@fortawesome/free-regular-svg-icons';