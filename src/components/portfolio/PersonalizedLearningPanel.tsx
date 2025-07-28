import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGraduationCap,
  faBookOpen,
  faChartLine,
  faLightbulb,
  faPlay,
  faCheck,
  faClock,
  faStar,
  faArrowRight,
  faBullseye,
  faTrophy,
  faFire,
  faEye,
  faEyeSlash,
  faRefresh
} from '@fortawesome/free-solid-svg-icons';
import { supabase } from '@/lib/supabase';

interface LearningContent {
  id: string;
  title: string;
  description: string;
  content_type: 'article' | 'video' | 'interactive' | 'quiz' | 'simulation';
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration: number; // in minutes
  key_concepts: string[];
  learning_objectives: string[];
  prerequisite_concepts?: string[];
  related_portfolio_context?: string;
  completion_status: 'not_started' | 'in_progress' | 'completed';
  user_progress?: {
    completion_percentage: number;
    time_spent: number;
    last_accessed: string;
    quiz_scores?: number[];
  };
  ai_personalization?: {
    relevance_score: number;
    recommended_reason: string;
    optimal_timing: string;
    learning_path_position: number;
  };
}

interface LearningProgress {
  overall_financial_literacy_level: number; // 1-10
  completed_lessons: number;
  total_time_spent: number;
  current_streak: number;
  knowledge_areas: {
    portfolio_management: number;
    risk_assessment: number;
    market_analysis: number;
    tax_optimization: number;
    behavioral_finance: number;
  };
  recent_achievements: string[];
  learning_preferences: {
    preferred_content_type: string;
    optimal_session_length: number;
    learning_schedule: string;
  };
}

interface PersonalizedLearningPanelProps {
  userId?: string;
  goalId?: string;
  userPreferences?: any;
  intelligenceData?: any;
  recommendations?: any[];
  onLearningComplete?: (contentId: string, progress: any) => void;
}

export const PersonalizedLearningPanel: React.FC<PersonalizedLearningPanelProps> = ({
  userId,
  goalId,
  userPreferences,
  intelligenceData,
  recommendations = [],
  onLearningComplete
}) => {
  const [learningContent, setLearningContent] = useState<LearningContent[]>([]);
  const [learningProgress, setLearningProgress] = useState<LearningProgress | null>(null);
  const [selectedContent, setSelectedContent] = useState<LearningContent | null>(null);
  const [showAllContent, setShowAllContent] = useState(false);
  const [activeTab, setActiveTab] = useState<'recommended' | 'progress' | 'achievements'>('recommended');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch personalized learning content
  useEffect(() => {
    if (userId) {
      fetchLearningContent();
      fetchLearningProgress();
    }
  }, [userId, goalId, recommendations]);

  const fetchLearningContent = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('personalized-learning-engine', {
        body: {
          userId,
          goalId,
          currentRecommendations: recommendations,
          userContext: {
            literacy_level: intelligenceData?.learning?.overall_financial_literacy_level || 3,
            preferences: userPreferences,
            portfolio_context: recommendations.map(r => r.type)
          },
          contentTypes: ['article', 'interactive', 'quiz'],
          maxResults: 12
        }
      });

      if (error) throw error;
      setLearningContent(data?.content || []);
    } catch (error) {
      console.error('Failed to fetch learning content:', error);
      // Fallback to static content
      setLearningContent(generateFallbackContent());
    }
  };

  const fetchLearningProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('user_learning_progress')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      setLearningProgress(data || generateDefaultProgress());
    } catch (error) {
      console.error('Failed to fetch learning progress:', error);
      setLearningProgress(generateDefaultProgress());
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackContent = (): LearningContent[] => {
    const contextualContent = [];
    
    // Add content based on current recommendations
    if (recommendations.some(r => r.type === 'rebalance')) {
      contextualContent.push({
        id: 'rebalancing_basics',
        title: 'Portfolio Rebalancing Explained',
        description: 'Learn why and when to rebalance your investment portfolio',
        content_type: 'interactive' as const,
        difficulty_level: 'beginner' as const,
        estimated_duration: 8,
        key_concepts: ['Asset Allocation', 'Portfolio Drift', 'Rebalancing Strategy'],
        learning_objectives: ['Understand portfolio drift', 'Learn rebalancing timing', 'Master rebalancing methods'],
        related_portfolio_context: 'Your portfolio currently needs rebalancing',
        completion_status: 'not_started' as const,
        ai_personalization: {
          relevance_score: 0.95,
          recommended_reason: 'Directly relates to your current portfolio recommendations',
          optimal_timing: 'now',
          learning_path_position: 1
        }
      });
    }

    // Add general content based on user level
    const userLevel = intelligenceData?.learning?.overall_financial_literacy_level || 3;
    
    if (userLevel < 5) {
      contextualContent.push(
        {
          id: 'investing_fundamentals',
          title: 'Investment Fundamentals',
          description: 'Master the basics of investing and portfolio management',
          content_type: 'article' as const,
          difficulty_level: 'beginner' as const,
          estimated_duration: 12,
          key_concepts: ['Risk vs Return', 'Diversification', 'Compound Interest'],
          learning_objectives: ['Understand investment basics', 'Learn about risk', 'Grasp diversification'],
          completion_status: 'not_started' as const,
          ai_personalization: {
            relevance_score: 0.85,
            recommended_reason: 'Perfect for building your foundation',
            optimal_timing: 'this_week',
            learning_path_position: 2
          }
        },
        {
          id: 'risk_tolerance_quiz',
          title: 'Discover Your Risk Tolerance',
          description: 'Interactive quiz to understand your investment personality',
          content_type: 'quiz' as const,
          difficulty_level: 'beginner' as const,
          estimated_duration: 5,
          key_concepts: ['Risk Assessment', 'Investment Psychology', 'Portfolio Suitability'],
          learning_objectives: ['Assess personal risk tolerance', 'Understand investment psychology'],
          completion_status: 'not_started' as const,
          ai_personalization: {
            relevance_score: 0.80,
            recommended_reason: 'Helps optimize your portfolio allocation',
            optimal_timing: 'this_week',
            learning_path_position: 3
          }
        }
      );
    } else {
      contextualContent.push(
        {
          id: 'advanced_strategies',
          title: 'Advanced Portfolio Strategies',
          description: 'Explore sophisticated investment techniques and optimization',
          content_type: 'interactive' as const,
          difficulty_level: 'advanced' as const,
          estimated_duration: 20,
          key_concepts: ['Tax-Loss Harvesting', 'Factor Investing', 'Alternative Assets'],
          learning_objectives: ['Master advanced techniques', 'Optimize tax efficiency', 'Explore alternatives'],
          completion_status: 'not_started' as const,
          ai_personalization: {
            relevance_score: 0.90,
            recommended_reason: 'Matches your advanced knowledge level',
            optimal_timing: 'this_month',
            learning_path_position: 1
          }
        }
      );
    }

    return contextualContent;
  };

  const generateDefaultProgress = (): LearningProgress => ({
    overall_financial_literacy_level: intelligenceData?.learning?.overall_financial_literacy_level || 3,
    completed_lessons: 0,
    total_time_spent: 0,
    current_streak: 0,
    knowledge_areas: {
      portfolio_management: 3,
      risk_assessment: 2,
      market_analysis: 2,
      tax_optimization: 1,
      behavioral_finance: 2
    },
    recent_achievements: [],
    learning_preferences: {
      preferred_content_type: 'interactive',
      optimal_session_length: 10,
      learning_schedule: 'flexible'
    }
  });

  const handleContentStart = async (content: LearningContent) => {
    setSelectedContent(content);
    
    // Track learning start
    try {
      await supabase.functions.invoke('track-learning-activity', {
        body: {
          userId,
          contentId: content.id,
          action: 'started',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to track learning start:', error);
    }
  };

  const handleContentComplete = async (content: LearningContent, progress: any) => {
    // Update local state
    setLearningContent(prev => prev.map(item => 
      item.id === content.id 
        ? { ...item, completion_status: 'completed', user_progress: progress }
        : item
    ));

    // Track completion
    try {
      await supabase.functions.invoke('track-learning-activity', {
        body: {
          userId,
          contentId: content.id,
          action: 'completed',
          progress,
          timestamp: new Date().toISOString()
        }
      });
      
      // Refresh progress
      await fetchLearningProgress();
      
      onLearningComplete?.(content.id, progress);
    } catch (error) {
      console.error('Failed to track learning completion:', error);
    }
  };

  const getContentIcon = (contentType: string) => {
    switch (contentType) {
      case 'article': return faBookOpen;
      case 'video': return faPlay;
      case 'interactive': return faLightbulb;
      case 'quiz': return faBullseye;
      case 'simulation': return faChartLine;
      default: return faBookOpen;
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'text-green-600 bg-green-50 border-green-200';
      case 'intermediate': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'advanced': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const recommendedContent = learningContent
    .filter(content => (content.ai_personalization?.relevance_score ?? 0) > 0.7)
    .sort((a, b) => ((b.ai_personalization?.relevance_score ?? 0) - (a.ai_personalization?.relevance_score ?? 0)))
    .slice(0, showAllContent ? undefined : 4);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-300">Loading personalized content...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <FontAwesomeIcon icon={faGraduationCap} className="text-blue-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Learning Center</h3>
          </div>
          
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {[
              { id: 'recommended', label: 'For You', icon: faLightbulb },
              { id: 'progress', label: 'Progress', icon: faChartLine },
              { id: 'achievements', label: 'Achievements', icon: faTrophy }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <FontAwesomeIcon icon={tab.icon} className="text-xs" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'recommended' && recommendedContent.length > 4 && (
          <button
            onClick={() => setShowAllContent(!showAllContent)}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
          >
            <FontAwesomeIcon icon={showAllContent ? faEyeSlash : faEye} />
            <span>{showAllContent ? 'Show Less' : `Show All (${learningContent.length})`}</span>
          </button>
        )}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'recommended' && (
          <motion.div
            key="recommended"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {recommendedContent.length === 0 ? (
              <div className="text-center py-8">
                <FontAwesomeIcon icon={faGraduationCap} className="text-4xl text-gray-300 mb-4" />
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No personalized content available
                </h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Complete your profile to get AI-powered learning recommendations.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {recommendedContent.map((content) => (
                  <motion.div
                    key={content.id}
                    layout
                    className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/30 hover:shadow-md transition-shadow"
                  >
                    {/* Content Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                          <FontAwesomeIcon 
                            icon={getContentIcon(content.content_type)} 
                            className="text-white text-sm" 
                          />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                            {content.title}
                          </h4>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`text-xs px-2 py-1 rounded-full border ${getDifficultyColor(content.difficulty_level)}`}>
                              {content.difficulty_level}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                              <FontAwesomeIcon icon={faClock} />
                              <span>{content.estimated_duration}min</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Relevance Score */}
                      {content.ai_personalization && (
                        <div className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400">
                          <FontAwesomeIcon icon={faStar} />
                          <span>{Math.round(content.ai_personalization.relevance_score * 100)}%</span>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 leading-relaxed">
                      {content.description}
                    </p>

                    {/* AI Recommendation Reason */}
                    {content.ai_personalization?.recommended_reason && (
                      <div className="bg-blue-100/50 dark:bg-blue-800/20 rounded-lg p-2 mb-3">
                        <div className="flex items-start space-x-2">
                          <FontAwesomeIcon icon={faLightbulb} className="text-blue-600 text-xs mt-0.5" />
                          <p className="text-xs text-blue-800 dark:text-blue-200">
                            <strong>Why this is perfect for you:</strong> {content.ai_personalization.recommended_reason}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Key Concepts */}
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-1">
                        {content.key_concepts.slice(0, 3).map((concept, idx) => (
                          <span key={idx} className="text-xs bg-white/70 dark:bg-gray-700/70 px-2 py-1 rounded-full text-gray-700 dark:text-gray-300">
                            {concept}
                          </span>
                        ))}
                        {content.key_concepts.length > 3 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            +{content.key_concepts.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => handleContentStart(content)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      <FontAwesomeIcon icon={
                        content.completion_status === 'completed' ? faCheck :
                        content.completion_status === 'in_progress' ? faPlay :
                        faArrowRight
                      } />
                      <span>
                        {content.completion_status === 'completed' ? 'Review' :
                         content.completion_status === 'in_progress' ? 'Continue' :
                         'Start Learning'}
                      </span>
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'progress' && learningProgress && (
          <motion.div
            key="progress"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Overall Progress */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900 dark:text-white">Your Learning Journey</h4>
                <div className="flex items-center space-x-2">
                  <FontAwesomeIcon icon={faFire} className="text-orange-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {learningProgress.current_streak} day streak
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{learningProgress.overall_financial_literacy_level}/10</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Literacy Level</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{learningProgress.completed_lessons}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Lessons Completed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">{Math.round(learningProgress.total_time_spent / 60)}h</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Time Invested</div>
                </div>
              </div>
            </div>

            {/* Knowledge Areas */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 dark:text-white">Knowledge Areas</h4>
              {Object.entries(learningProgress.knowledge_areas).map(([area, level]) => (
                <div key={area} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                      {area.replace('_', ' ')}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{level}/10</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(level / 10) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'achievements' && learningProgress && (
          <motion.div
            key="achievements"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {learningProgress.recent_achievements.length === 0 ? (
              <div className="text-center py-8">
                <FontAwesomeIcon icon={faTrophy} className="text-4xl text-gray-300 mb-4" />
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No achievements yet
                </h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Complete lessons to unlock achievements and track your progress.
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {learningProgress.recent_achievements.map((achievement, idx) => (
                  <div key={idx} className="flex items-center space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800/30">
                    <FontAwesomeIcon icon={faTrophy} className="text-yellow-600" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{achievement}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PersonalizedLearningPanel;
