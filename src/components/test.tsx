import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSeedling, 
  faGraduationCap, 
  faQuestion,
  faCalendarAlt,
  faClock,
  faStar,
  faChartLine,
  faBook,
  faTrophy
} from '@fortawesome/free-solid-svg-icons';

const LearningHistory = () => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Sample learning history data
  const learningHistory = [
    {
      id: 1,
      action: 'ask_for_new_lesson',
      title: 'Started Python Basics',
      description: 'Requested a new lesson on Python fundamentals',
      timestamp: '2025-07-15T10:30:00Z',
      category: 'Programming',
      duration: '45 min',
      difficulty: 'Beginner'
    },
    {
      id: 2,
      action: 'completed_lesson',
      title: 'Completed Variables & Data Types',
      description: 'Successfully finished the lesson on Python variables',
      timestamp: '2025-07-15T11:45:00Z',
      category: 'Programming',
      score: 95,
      duration: '30 min',
      achievements: ['Fast Learner', 'Perfect Score']
    },
    {
      id: 3,
      action: 'completed_qotd',
      title: 'Question of the Day',
      description: 'Answered daily challenge about algorithms',
      timestamp: '2025-07-16T09:00:00Z',
      category: 'Challenge',
      correct: true,
      streak: 5
    },
    {
      id: 4,
      action: 'ask_for_new_lesson',
      title: 'Started Machine Learning Intro',
      description: 'Began exploring ML concepts',
      timestamp: '2025-07-17T14:20:00Z',
      category: 'AI/ML',
      duration: '60 min',
      difficulty: 'Intermediate'
    },
    {
      id: 5,
      action: 'completed_lesson',
      title: 'Completed Linear Regression',
      description: 'Mastered linear regression fundamentals',
      timestamp: '2025-07-17T16:00:00Z',
      category: 'AI/ML',
      score: 88,
      duration: '55 min'
    },
    {
      id: 6,
      action: 'completed_qotd',
      title: 'Question of the Day',
      description: 'Solved problem about data structures',
      timestamp: '2025-07-18T08:30:00Z',
      category: 'Challenge',
      correct: false,
      streak: 0
    },
    {
      id: 7,
      action: 'completed_lesson',
      title: 'Completed Neural Networks',
      description: 'Understood the basics of neural networks',
      timestamp: '2025-07-18T14:00:00Z',
      category: 'AI/ML',
      score: 92,
      duration: '70 min'
    }
  ];

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Action type configurations
  const actionConfig = {
    'ask_for_new_lesson': {
      color: 'from-purple-400 to-purple-600',
      borderColor: 'border-purple-500',
      bgColor: 'bg-purple-100',
      icon: faSeedling,
      leafType: 'new'
    },
    'completed_lesson': {
      color: 'from-green-400 to-green-600',
      borderColor: 'border-green-500',
      bgColor: 'bg-green-100',
      icon: faGraduationCap,
      leafType: 'completed'
    },
    'completed_qotd': {
      color: 'from-yellow-400 to-yellow-600',
      borderColor: 'border-yellow-500',
      bgColor: 'bg-yellow-100',
      icon: faQuestion,
      leafType: 'challenge'
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // SVG Path for the tree trunk
  const trunkPath = "M 400 50 Q 400 100 400 150 Q 400 200 400 250 Q 400 300 400 350 Q 400 400 400 450 Q 400 500 400 550 Q 400 600 400 650";

  // Calculate leaf positions
  const getLeafPosition = (index, total) => {
    const spacing = 80;
    const startY = 100;
    const y = startY + (index * spacing);
    const side = index % 2 === 0 ? -1 : 1;
    const x = 400 + (side * 120);
    const angle = side * 15 + (Math.random() - 0.5) * 10;
    return { x, y, angle, side };
  };

  const LeafComponent = ({ item, index, total }) => {
    const { x, y, angle, side } = getLeafPosition(index, total);
    const config = actionConfig[item.action];
    
    return (
      <motion.g
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ 
          duration: 0.5, 
          delay: index * 0.1,
          type: "spring",
          stiffness: 200
        }}
        whileHover={{ scale: 1.1 }}
        onClick={() => setSelectedItem(item)}
        className="cursor-pointer"
      >
        {/* Branch connecting to trunk */}
        <motion.path
          d={`M 400 ${y} Q ${400 + (side * 60)} ${y} ${x} ${y}`}
          stroke="#9333ea"
          strokeWidth="3"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
        />
        
        {/* Leaf shape */}
        <motion.g transform={`translate(${x}, ${y}) rotate(${angle})`}>
          {/* Leaf shadow */}
          <ellipse
            cx="0"
            cy="3"
            rx="35"
            ry="25"
            fill="rgba(0,0,0,0.1)"
            transform="scale(1.1)"
          />
          
          {/* Leaf gradient background */}
          <defs>
            <linearGradient id={`leafGradient${item.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" className={`${config.color.split(' ')[0]?.replace('from-', 'text-')}`} />
              <stop offset="100%" className={`${config.color.split(' ')[2]?.replace('to-', 'text-')}`} />
            </linearGradient>
          </defs>
          
          {/* Main leaf */}
          <motion.ellipse
            cx="0"
            cy="0"
            rx="35"
            ry="25"
            fill={`url(#leafGradient${item.id})`}
            whileHover={{ scale: 1.05 }}
          />
          
          {/* Icon container */}
          <foreignObject x="-15" y="-15" width="30" height="30">
            <div className="flex items-center justify-center h-full">
              <FontAwesomeIcon 
                icon={config.icon} 
                className="text-white text-lg"
              />
            </div>
          </foreignObject>
        </motion.g>
      </motion.g>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto px-4 py-8"
      >
        <div className="text-center mb-12">
          <motion.h1 
            className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent mb-4"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            Your Learning Journey
          </motion.h1>
          <motion.p 
            className="text-gray-600 text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Track your progress and celebrate your achievements
          </motion.p>
        </div>

        {/* Stats Cards */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {[
            { icon: faBook, label: 'Total Lessons', value: '12', color: 'from-purple-400 to-purple-600' },
            { icon: faTrophy, label: 'Achievements', value: '8', color: 'from-yellow-400 to-yellow-600' },
            { icon: faChartLine, label: 'Average Score', value: '91%', color: 'from-green-400 to-green-600' },
            { icon: faStar, label: 'Current Streak', value: '5 days', color: 'from-pink-400 to-pink-600' }
          ].map((stat, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.05, y: -5 }}
              className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center mb-4`}>
                <FontAwesomeIcon icon={stat.icon} className="text-white text-xl" />
              </div>
              <h3 className="text-gray-600 text-sm mb-1">{stat.label}</h3>
              <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Learning Tree */}
        <motion.div 
          className="relative bg-white rounded-3xl shadow-2xl p-8 overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600 rounded-full filter blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-800 rounded-full filter blur-3xl"></div>
          </div>

          <div className="relative">
            <svg 
              viewBox="0 0 800 700" 
              className="w-full h-full max-w-4xl mx-auto"
              style={{ minHeight: '600px' }}
            >
              {/* Tree trunk */}
              <motion.path
                d={trunkPath}
                stroke="#9333ea"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
              />

              {/* Tree roots */}
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <path
                  d="M 380 650 Q 340 680 320 700"
                  stroke="#9333ea"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M 420 650 Q 460 680 480 700"
                  stroke="#9333ea"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M 400 650 Q 400 680 400 700"
                  stroke="#9333ea"
                  strokeWidth="5"
                  fill="none"
                  strokeLinecap="round"
                />
              </motion.g>

              {/* Leaves */}
              {isLoaded && learningHistory.map((item, index) => (
                <LeafComponent 
                  key={item.id} 
                  item={item} 
                  index={index} 
                  total={learningHistory.length}
                />
              ))}
            </svg>
          </div>
        </motion.div>

        {/* Legend */}
        <motion.div 
          className="mt-8 flex flex-wrap justify-center gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          {Object.entries(actionConfig).map(([action, config]) => (
            <div key={action} className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${config.color} flex items-center justify-center`}>
                <FontAwesomeIcon icon={config.icon} className="text-white text-sm" />
              </div>
              <span className="text-gray-700 text-sm">
                {action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${actionConfig[selectedItem.action].color} flex items-center justify-center`}>
                  <FontAwesomeIcon icon={actionConfig[selectedItem.action].icon} className="text-white text-xl" />
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <h3 className="text-2xl font-bold text-gray-800 mb-2">{selectedItem.title}</h3>
              <p className="text-gray-600 mb-4">{selectedItem.description}</p>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <FontAwesomeIcon icon={faCalendarAlt} />
                  <span>{formatDate(selectedItem.timestamp)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <FontAwesomeIcon icon={faClock} />
                  <span>{formatTime(selectedItem.timestamp)}</span>
                </div>
                {selectedItem.duration && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <FontAwesomeIcon icon={faClock} />
                    <span>Duration: {selectedItem.duration}</span>
                  </div>
                )}
                {selectedItem.score !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Score:</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${selectedItem.score}%` }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className={`h-full rounded-full bg-gradient-to-r ${
                          selectedItem.score >= 90 ? 'from-green-400 to-green-600' :
                          selectedItem.score >= 70 ? 'from-yellow-400 to-yellow-600' :
                          'from-red-400 to-red-600'
                        }`}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">{selectedItem.score}%</span>
                  </div>
                )}
                {selectedItem.category && (
                  <div className="pt-2">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      actionConfig[selectedItem.action].bgColor
                    } ${actionConfig[selectedItem.action].borderColor} border`}>
                      {selectedItem.category}
                    </span>
                  </div>
                )}
                {selectedItem.achievements && (
                  <div className="pt-2">
                    <p className="text-sm text-gray-500 mb-2">Achievements:</p>
                    <div className="flex gap-2">
                      {selectedItem.achievements.map((achievement, index) => (
                        <span key={index} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <FontAwesomeIcon icon={faTrophy} className="text-yellow-600" />
                          {achievement}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LearningHistory;