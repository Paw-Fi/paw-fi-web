"use client";

import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGraduationCap,
  faLightbulb,
  faCheckCircle,
  faBookOpen,
  faAward,
  faFire,
  faCalendar,
  faChartLine,
  faClock,
  faHistory,
  faSpinner,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/contexts/auth-context";
import { useUserActivities } from "@/hooks/useUserActivities";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/dashboard/learning-history/")({
  component: LearningHistory,
});

// Animation variants
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5 },
  },
};

// Timeline event types
interface TimelineEvent {
  id: string;
  type: "completed_lesson" | "completed_qotd" | "ask_for_new_lesson";
  title: string;
  description?: string;
  date: Date;
  xp?: number;
  lessonId?: string;
  lessonTitle?: string;
}

// SVG Timeline Component
const TimelineSVG = ({ events }: { events: TimelineEvent[] }) => {
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);

  if (events.length === 0) return null;

  const height = Math.max(600, events.length * 80 + 100);
  const centerX = 200;
  const startY = 50;
  const eventSpacing = Math.max(60, (height - 100) / events.length);

  return (
    <div className="relative w-full overflow-hidden">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 400 ${height}`}
        className="w-full"
      >
        {/* Animated Background Gradient */}
        <defs>
          <linearGradient id="timelineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8">
              <animate
                attributeName="stop-color"
                values="#8B5CF6;#EC4899;#3B82F6;#8B5CF6"
                dur="8s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="50%" stopColor="#EC4899" stopOpacity="0.6">
              <animate
                attributeName="stop-color"
                values="#EC4899;#3B82F6;#10B981;#EC4899"
                dur="6s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.4">
              <animate
                attributeName="stop-color"
                values="#3B82F6;#10B981;#8B5CF6;#3B82F6"
                dur="10s"
                repeatCount="indefinite"
              />
            </stop>
          </linearGradient>

          {/* Glow filters */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="strongGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Main Timeline Line */}
        <motion.line
          x1={centerX}
          y1={startY}
          x2={centerX}
          y2={height - 50}
          stroke="url(#timelineGradient)"
          strokeWidth="4"
          strokeLinecap="round"
          filter="url(#glow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />

        {/* Timeline Events */}
        {events.map((event, index) => {
          const y = startY + index * eventSpacing;
          const isLeft = index % 2 === 0;
          const eventX = isLeft ? centerX - 80 : centerX + 80;
          const lineEndX = isLeft ? centerX - 12 : centerX + 12;

          const getEventColor = (type: string) => {
            switch (type) {
              case "completed_lesson":
                return "#10B981"; // Green
              case "completed_qotd":
                return "#F59E0B"; // Amber
              case "ask_for_new_lesson":
                return "#8B5CF6"; // Purple
              default:
                return "#6B7280"; // Gray
            }
          };

          const getEventIcon = (type: string) => {
            switch (type) {
              case "completed_lesson":
                return "✓";
              case "completed_qotd":
                return "💡";
              case "ask_for_new_lesson":
                return "📚";
              default:
                return "•";
            }
          };

          return (
            <g key={event.id}>
              {/* Connection line from main timeline to event */}
              <motion.line
                x1={centerX}
                y1={y}
                x2={lineEndX}
                y2={y}
                stroke={getEventColor(event.type)}
                strokeWidth="2"
                strokeDasharray="5,5"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
              />

              {/* Main timeline node */}
              <motion.circle
                cx={centerX}
                cy={y}
                r="8"
                fill={getEventColor(event.type)}
                filter={hoveredEvent === event.id ? "url(#strongGlow)" : "url(#glow)"}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredEvent(event.id)}
                onMouseLeave={() => setHoveredEvent(null)}
              >
                <animate
                  attributeName="r"
                  values="8;12;8"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </motion.circle>

              {/* Event container */}
              <motion.g
                initial={{ opacity: 0, x: isLeft ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 + 0.3 }}
              >
                {/* Event background */}
                <motion.rect
                  x={isLeft ? eventX - 60 : eventX - 40}
                  y={y - 25}
                  width="120"
                  height="50"
                  rx="15"
                  fill="white"
                  stroke={getEventColor(event.type)}
                  strokeWidth="2"
                  filter="url(#glow)"
                  className="cursor-pointer"
                  whileHover={{ scale: 1.05 }}
                  onMouseEnter={() => setHoveredEvent(event.id)}
                  onMouseLeave={() => setHoveredEvent(null)}
                />

                {/* Event icon */}
                <text
                  x={isLeft ? eventX - 35 : eventX - 15}
                  y={y - 5}
                  textAnchor="middle"
                  fontSize="16"
                  className="cursor-pointer"
                >
                  {getEventIcon(event.type)}
                </text>

                {/* Event title */}
                <text
                  x={isLeft ? eventX : eventX}
                  y={y + 8}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#374151"
                  className="font-semibold cursor-pointer"
                >
                  {event.title.length > 15 ? `${event.title.substring(0, 12)}...` : event.title}
                </text>

                {/* XP badge */}
                {event.xp && (
                  <motion.g
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.2 + 0.6 }}
                  >
                    <circle
                      cx={isLeft ? eventX + 40 : eventX + 20}
                      cy={y - 15}
                      r="12"
                      fill="#F59E0B"
                      filter="url(#glow)"
                    />
                    <text
                      x={isLeft ? eventX + 40 : eventX + 20}
                      y={y - 10}
                      textAnchor="middle"
                      fontSize="8"
                      fill="white"
                      className="font-bold"
                    >
                      +{event.xp}
                    </text>
                  </motion.g>
                )}
              </motion.g>

              {/* Floating particles animation */}
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 3, delay: index * 0.5, repeat: Infinity, repeatDelay: 2 }}
              >
                {[...Array(3)].map((_, particleIndex) => (
                  <motion.circle
                    key={particleIndex}
                    cx={centerX + (particleIndex - 1) * 10}
                    cy={y}
                    r="2"
                    fill={getEventColor(event.type)}
                    opacity="0.6"
                    animate={{
                      y: [y, y - 20, y - 40],
                      opacity: [0.6, 0.3, 0],
                      scale: [1, 0.5, 0],
                    }}
                    transition={{
                      duration: 2,
                      delay: particleIndex * 0.2,
                      repeat: Infinity,
                      repeatDelay: 4,
                    }}
                  />
                ))}
              </motion.g>
            </g>
          );
        })}

        {/* Floating elements for visual interest */}
        <motion.g>
          {[...Array(5)].map((_, i) => (
            <motion.circle
              key={i}
              cx={50 + i * 80}
              cy={100 + i * 50}
              r="3"
              fill="#E5E7EB"
              opacity="0.4"
              animate={{
                x: [0, 10, 0],
                y: [0, -10, 0],
                opacity: [0.4, 0.8, 0.4],
              }}
              transition={{
                duration: 3 + i,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </motion.g>
      </svg>

      {/* Event details overlay */}
      <AnimatePresence>
        {hoveredEvent && (
          <motion.div
            className="absolute top-4 right-4 bg-white/95 backdrop-blur-md border border-purple-200 rounded-xl p-4 shadow-xl z-10 max-w-xs"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {(() => {
              const event = events.find(e => e.id === hoveredEvent);
              if (!event) return null;
              
              return (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FontAwesomeIcon 
                      icon={
                        event.type === 'completed_lesson' ? faCheckCircle :
                        event.type === 'completed_qotd' ? faLightbulb :
                        faBookOpen
                      }
                      className={`h-4 w-4 ${
                        event.type === 'completed_lesson' ? 'text-green-500' :
                        event.type === 'completed_qotd' ? 'text-amber-500' :
                        'text-purple-500'
                      }`}
                    />
                    <span className="font-semibold text-gray-900">{event.title}</span>
                  </div>
                  {event.description && (
                    <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{event.date.toLocaleDateString()}</span>
                    {event.xp && (
                      <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-semibold">
                        +{event.xp} XP
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function LearningHistory() {
  
  const { user } = useAuth();
  const { activities, loading, error } = useUserActivities(user?.id);

  // Transform activities into timeline events
  const timelineEvents: TimelineEvent[] = useMemo(() => {
    return activities.map(activity => ({
      id: activity.id,
      type: activity.activity.action,
      title: activity.activity.action === 'completed_lesson' 
        ? activity.activity.lesson_title || 'Lesson Completed'
        : activity.activity.action === 'completed_qotd'
        ? 'Daily Challenge'
        : 'New Lesson Request',
      description: activity.activity.action === 'completed_lesson'
        ? `Completed "${activity.activity.lesson_title}"`
        : activity.activity.action === 'completed_qotd'
        ? 'Completed daily question of the day'
        : 'Requested a new personalized lesson',
      date: new Date(activity.created_at),
      xp: activity.activity.xp,
      lessonId: activity.activity.lesson_id,
      lessonTitle: activity.activity.lesson_title,
    })).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [activities]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalLessons = timelineEvents.filter(e => e.type === 'completed_lesson').length;
    const totalChallenges = timelineEvents.filter(e => e.type === 'completed_qotd').length;
    const totalXP = timelineEvents.reduce((sum, event) => sum + (event.xp || 0), 0);
    const streakDays = calculateStreak(timelineEvents);

    return {
      totalLessons,
      totalChallenges,
      totalXP,
      streakDays,
      totalActivities: timelineEvents.length,
    };
  }, [timelineEvents]);

  // Calculate learning streak
  function calculateStreak(events: TimelineEvent[]): number {
    if (events.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sortedDates = events
      .map(e => {
        const date = new Date(e.date);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      })
      .filter((date, index, array) => array.indexOf(date) === index)
      .sort((a, b) => b - a);

    let streak = 0;
    let currentDate = today.getTime();

    for (const date of sortedDates) {
      if (date === currentDate) {
        streak++;
        currentDate -= 24 * 60 * 60 * 1000; // Go back one day
      } else if (date === currentDate + 24 * 60 * 60 * 1000) {
        // If we missed today but have yesterday, still count
        streak++;
        currentDate = date - 24 * 60 * 60 * 1000;
      } else {
        break;
      }
    }

    return streak;
  }

  if (!user) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <FontAwesomeIcon icon={faExclamationTriangle} className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600">Please sign in to view your learning history</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="max-w-6xl mx-auto p-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div className="text-center mb-8" variants={itemVariants}>
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4 shadow-lg">
          <FontAwesomeIcon icon={faHistory} className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
          Learning Journey
        </h1>
        <p className="text-gray-600 text-lg">
          Track your progress and celebrate your achievements
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        variants={itemVariants}
      >
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 text-center">
          <FontAwesomeIcon icon={faCheckCircle} className="h-8 w-8 text-green-600 mb-3" />
          <div className="text-3xl font-bold text-green-600 mb-1">{stats.totalLessons}</div>
          <div className="text-sm text-green-700">Lessons Completed</div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-6 text-center">
          <FontAwesomeIcon icon={faLightbulb} className="h-8 w-8 text-amber-600 mb-3" />
          <div className="text-3xl font-bold text-amber-600 mb-1">{stats.totalChallenges}</div>
          <div className="text-sm text-amber-700">Daily Challenges</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-6 text-center">
          <FontAwesomeIcon icon={faAward} className="h-8 w-8 text-purple-600 mb-3" />
          <div className="text-3xl font-bold text-purple-600 mb-1">{stats.totalXP}</div>
          <div className="text-sm text-purple-700">Total XP Earned</div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-2xl p-6 text-center">
          <FontAwesomeIcon icon={faFire} className="h-8 w-8 text-orange-600 mb-3" />
          <div className="text-3xl font-bold text-orange-600 mb-1">{stats.streakDays}</div>
          <div className="text-sm text-orange-700">Day Streak</div>
        </div>
      </motion.div>

      {/* Timeline Section */}
      <motion.div
        className="bg-white/80 backdrop-blur-xl border border-purple-200/50 rounded-3xl shadow-2xl overflow-hidden"
        variants={itemVariants}
      >
        <div className="p-6 border-b border-purple-200/50 bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                Your Learning Timeline
              </h2>
              <p className="text-gray-600">
                A visual journey through your educational progress
              </p>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <FontAwesomeIcon icon={faCalendar} className="h-4 w-4 mr-2" />
              {stats.totalActivities} total activities
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FontAwesomeIcon icon={faSpinner} className="h-8 w-8 text-purple-500 animate-spin mb-4" />
              <p className="text-gray-600">Loading your learning journey...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FontAwesomeIcon icon={faExclamationTriangle} className="h-8 w-8 text-red-500 mb-4" />
              <p className="text-red-600 mb-2">Failed to load learning history</p>
              <p className="text-gray-500 text-sm">{error}</p>
            </div>
          ) : timelineEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-6">
                <FontAwesomeIcon icon={faBookOpen} className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Start Your Learning Journey</h3>
              <p className="text-gray-600 text-center max-w-md mb-6">
                Complete lessons, tackle daily challenges, and watch your progress come to life in this beautiful timeline.
              </p>
              <div className="flex gap-4">
                <motion.a
                  href="/dashboard/learning"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FontAwesomeIcon icon={faGraduationCap} className="mr-2 h-4 w-4" />
                  Explore Courses
                </motion.a>
                <motion.a
                  href="/dashboard/daily-challenges"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FontAwesomeIcon icon={faLightbulb} className="mr-2 h-4 w-4" />
                  Daily Challenge
                </motion.a>
              </div>
            </div>
          ) : (
            <TimelineSVG events={timelineEvents} />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default LearningHistory;