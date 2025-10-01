import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faPlus, 
  faChartLine, 
  faTrophy, 
  faExclamationTriangle, 
  faRefresh, 
  faArrowRight,
  faBullseye,
  faWandSparkles,
  faCheckCircle,
  faFilter,
  faChevronRight
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/contexts/auth-context";
import { useGoals } from "@/hooks/goal-tracker/use-goals";
import { memo, useCallback, useState, useMemo, useEffect } from "react";
import { useTrackerIndexWalkthrough } from "@/hooks/walkthrough/use-tracker-index-walkthrough";
import { useSpotlightGoals } from "@/hooks/goal-tracker/use-spotlight-goals";
import { getGoalIcon } from "@/lib/utils/goal-icons";
import travelBgImage from "@/assets/images/tracker/spotlight-travel.svg";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";

const trackerSearchSchema = z.object({
  filter: z.enum(['all', 'on-track', 'needs-attention', 'completed']).optional().default('all'),
  sort: z.enum(['due-date', 'progress', 'recently-updated']).optional().default('due-date'),
});

export const Route = createFileRoute("/dashboard/tracker/")(({
  validateSearch: trackerSearchSchema,
  component: GoalsTracker,
  head: () => {
    const canonicalUrl = getCanonicalUrl('/dashboard/tracker/');
    const title = 'Goal Tracker - AI-Powered Achievement & Progress | Moneko';
    const description = 'Set, track & achieve financial goals with AI insights, smart milestones & personalized strategies for wealth building.';
    const keywords = 'financial goal tracker, AI financial planning, savings goals, investment goals, milestone management, financial objectives, goal setting, progress tracking, wealth building goals, retirement planning goals';

    const meta = seo({
      title,
      description,
      keywords,
      image: "https://moneko.io/og-img.png",
      url: canonicalUrl,
    });

    // Comprehensive structured data for goal tracking platform
    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebApplication",
          "@id": `${canonicalUrl}#webapp`,
          "name": "Moneko Goal Tracker",
          "description": "AI-powered financial goal tracking and achievement platform with smart milestones and personalized strategies",
          "url": canonicalUrl,
          "applicationCategory": "ProductivityApplication",
          "applicationSubCategory": "Goal Management",
          "operatingSystem": "Web Browser",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock",
            "validFrom": "2024-01-01"
          },
          "featureList": [
            "AI-Powered Goal Strategy",
            "Smart Milestone Creation",
            "Progress Tracking & Analytics",
            "Achievement Celebration",
            "Deadline Management",
            "Visual Progress Indicators",
            "Goal Categories & Tags",
            "Motivational Insights",
            "Performance Analytics",
            "Goal Templates"
          ],
          "screenshot": "https://moneko.io/og-img.png",
          "softwareVersion": "2.0",
          "audience": {
            "@type": "Audience",
            "audienceType": ["Goal Setters", "Financial Planners", "Savers", "Investors", "Young Professionals"]
          }
        },
        {
          "@type": "Service",
          "@id": `${canonicalUrl}#service`,
          "name": "Personal Financial Goal Management",
          "description": "Comprehensive financial goal tracking service with AI-powered insights and milestone management",
          "provider": {
            "@type": "Organization",
            "@id": "https://moneko.io#organization",
            "name": "Moneko",
            "description": "AI-powered personal finance platform providing goal tracking, education, and portfolio management tools, founded by CFA charterholder Sabina Shao",
            "url": "https://moneko.io",
            "logo": "https://moneko.io/og-img.png",
            "founder": {
              "@type": "Person",
              "name": "Sabina Shao",
              "jobTitle": "CEO & Financial Education Expert",
              "hasCredential": "CFA Charterholder",
              "knowsAbout": ["Personal Finance", "Financial Goal Setting", "Investment Strategy", "Wealth Building"],
              "yearsOfExperience": "10+"
            }
          },
          "serviceType": "Financial Goal Management",
          "areaServed": ["United States", "Canada", "United Kingdom", "Australia"],
          "audience": {
            "@type": "Audience",
            "audienceType": ["Individual Savers", "Investment Goal Setters", "Retirement Planners"]
          },
          "hasOfferingCatalog": {
            "@type": "OfferingCatalog",
            "name": "Goal Management Features",
            "itemListElement": [
              {
                "@type": "Service",
                "name": "AI Goal Strategy",
                "description": "Personalized strategies and recommendations for achieving financial goals faster"
              },
              {
                "@type": "Service", 
                "name": "Smart Milestones",
                "description": "Intelligent breakdown of large goals into achievable milestones with timeline management"
              },
              {
                "@type": "Service",
                "name": "Progress Analytics",
                "description": "Real-time tracking with visual progress indicators and performance insights"
              }
            ]
          }
        },
        {
          "@type": "Organization",
          "@id": "https://moneko.io#organization",
          "name": "Moneko",
          "alternateName": "Moneko Financial Platform",
          "description": "Leading AI-powered personal finance platform providing comprehensive goal tracking, education, and wealth management tools",
          "url": "https://moneko.io",
          "logo": {
            "@type": "ImageObject",
            "url": "https://moneko.io/og-img.png",
            "width": "1200",
            "height": "630"
          },
          "image": "https://moneko.io/og-img.png",
          "foundingDate": "2024",
          "areaServed": ["United States", "Canada", "United Kingdom", "Australia"],
          "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "customer support",
            "email": "support@moneko.io",
            "availableLanguage": "English"
          },
          "sameAs": [
            "https://twitter.com/moneko_io",
            "https://linkedin.com/company/moneko"
          ]
        },
        {
          "@type": "ItemList",
          "@id": `${canonicalUrl}#features`,
          "name": "Goal Tracker Features",
          "description": "Comprehensive features of Moneko's financial goal tracking and management platform",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "item": {
                "@type": "Service",
                "name": "AI-Powered Goal Strategy",
                "description": "Personalized strategies and recommendations based on your financial situation and timeline"
              }
            },
            {
              "@type": "ListItem",
              "position": 2,
              "item": {
                "@type": "Service",
                "name": "Smart Milestone Tracking",
                "description": "Intelligent breakdown of goals into achievable milestones with automatic progress updates"
              }
            },
            {
              "@type": "ListItem",
              "position": 3,
              "item": {
                "@type": "Service",
                "name": "Visual Progress Analytics",
                "description": "Real-time progress tracking with charts, graphs, and performance insights"
              }
            },
            {
              "@type": "ListItem",
              "position": 4,
              "item": {
                "@type": "Service",
                "name": "Goal Categories",
                "description": "Organize goals by category: savings, investment, retirement, debt payoff, and more"
              }
            },
            {
              "@type": "ListItem",
              "position": 5,
              "item": {
                "@type": "Service",
                "name": "Deadline Management",
                "description": "Smart deadline tracking with alerts and notifications to keep you on track"
              }
            },
            {
              "@type": "ListItem",
              "position": 6,
              "item": {
                "@type": "Service",
                "name": "Achievement Celebration",
                "description": "Milestone achievements and progress celebrations to maintain motivation"
              }
            }
          ]
        },
        {
          "@type": "BreadcrumbList",
          "@id": `${canonicalUrl}#breadcrumb`,
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Dashboard",
              "item": {
                "@type": "WebPage",
                "@id": "https://moneko.io/dashboard"
              }
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "Goal Tracker",
              "item": {
                "@type": "WebPage",
                "@id": canonicalUrl
              }
            }
          ]
        }
      ]
    };

    // GEO-Optimized FAQ Schema for Goal Tracker
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How does Moneko's AI-powered goal tracking work?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Moneko's AI analyzes your financial situation, timeline, and goals to provide personalized strategies and smart milestones. Our system, designed by CFA charterholder Sabina Shao, breaks down large financial goals into achievable steps with realistic timelines and progress tracking."
          }
        },
        {
          "@type": "Question",
          "name": "What types of financial goals can I track with Moneko?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "You can track all types of financial goals including savings targets, investment milestones, debt payoff plans, retirement savings, emergency fund building, and major purchases like homes or cars. Our expert-designed system adapts to any financial objective."
          }
        },
        {
          "@type": "Question",
          "name": "How reliable are Moneko's goal achievement strategies?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Our strategies are based on proven financial planning principles developed by CFA charterholder Sabina Shao with over 10 years of experience. The AI recommendations follow established wealth-building methodologies and are continuously refined based on user success rates."
          }
        },
        {
          "@type": "Question",
          "name": "Can Moneko help me stay motivated to achieve my financial goals?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes! Moneko includes milestone celebrations, progress visualization, achievement tracking, and motivational insights designed by behavioral finance experts. Our system helps maintain momentum through positive reinforcement and clear progress indicators."
          }
        }
      ]
    };

    return {
      meta,
      link: [
        {
          rel: "canonical",
          href: canonicalUrl,
        },
      ],
      script: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData)
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(faqSchema)
        }
      ]
    };
  },
  }))


  function GoalsTracker() {
    const { user } = useAuth();
    const { goals, isLoading, error, refetch } = useGoals(user?.id);
    const { autoStartWalkthrough, startWalkthrough } = useTrackerIndexWalkthrough();
  
    // Move all useMemo hooks before any conditional returns
    const sortedGoals = useMemo(() => {
      if (!goals) return [];
      
      return goals.sort((a, b) => {
        if (!a.target_date && !b.target_date) return 0;
        if (!a.target_date) return 1;
        if (!b.target_date) return -1;
        return new Date(a.target_date).getTime() - new Date(b.target_date).getTime();
      });
    }, [goals]);
    
    // Use the new spotlight hook for better performance
    const spotlightGoals = useSpotlightGoals(goals);
    
    const statsData = useMemo(() => {
      if (!goals || goals.length === 0) {
        return {
          totalGoals: 0,
          activeGoals: 0,
          completedGoals: 0,
          onTrackPercentage: 0
        };
      }
      
      const getGoalStatus = (goal) => {
        if (goal.status === 'completed') return 'completed';
        
        const progress = goal.current_amount && goal.target_amount 
          ? (goal.current_amount / goal.target_amount) * 100 
          : 0;
        
        const daysUntilTarget = goal.target_date 
          ? Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        
        if (progress >= 50 || daysUntilTarget > 30) return 'on-track';
        return 'needs-attention';
      };
      
      const totalGoals = goals.length;
      const activeGoals = goals.filter(goal => goal.status === 'active').length;
      const completedGoals = goals.filter(goal => goal.status === 'completed').length;
      const onTrackGoals = goals.filter(goal => getGoalStatus(goal) === 'on-track').length;
      const onTrackPercentage = Math.round((onTrackGoals / totalGoals) * 100);
      
      return {
        totalGoals,
        activeGoals,
        completedGoals,
        onTrackPercentage
      };
    }, [goals]);

    const hasGoals = goals && goals.length > 0;

    // Auto-start walkthrough for new users
    useEffect(() => {
      if (hasGoals) {
        autoStartWalkthrough();
      }
    }, [hasGoals, autoStartWalkthrough]);
  
    // Now the early returns after all hooks are called
    if (isLoading) {
      return <GoalsLoadingSkeleton />;
    }
  
    if (error) {
      return <ErrorState error={error} onRetry={refetch} />;
    }
    
    const getGoalStatus = (goal) => {
      if (goal.status === 'completed') return 'completed';
      
      const progress = goal.current_amount && goal.target_amount 
        ? (goal.current_amount / goal.target_amount) * 100 
        : 0;
      
      const daysUntilTarget = goal.target_date 
        ? Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      
      if (progress >= 50 || daysUntilTarget > 30) return 'on-track';
      return 'needs-attention';
    };
  
    const pageVariants = {
      initial: { opacity: 0 },
      animate: { 
        opacity: 1,
        transition: {   
          duration: 0.3, 
          staggerChildren: 0.1
        }
      }
    };
  
    const itemVariants = {
      initial: { opacity: 0, y: 16 },
      animate: { 
        opacity: 1, 
        y: 0,
        transition: { 
          duration: 0.4,
          ease: [0.25, 0.8, 0.5, 1]
        }
      }
    };
  
    return (
      <motion.main 
        className="min-h-screen " 
        role="main" 
        aria-label="Goals Dashboard"
        variants={pageVariants}
        initial="initial"
        animate="animate"
      >
        {/* Skip to main content link for keyboard navigation */}
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-purple-600 dark:bg-purple-500 text-white px-4 py-2 rounded-md z-50 font-medium"
        >
          Skip to main content
        </a>
  
        {/* Clean Header with Apple-inspired minimal design */}
        <div className="">
          <div className="max-w-7xl mx-auto px-0 sm:px-8 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6" data-tour="page-header">
              <div className="min-w-0">
                <h1 className="text-3xl sm:text-4xl font-light text-foreground mb-2">
                  Goals
                </h1>
                <p className="text-muted-foreground text-lg">
                  Track your financial goals with AI-powered insights
                </p>
              </div>
              <div className="shrink-0">
                <Link to="/dashboard/tracker/create">
                  <button 
                    className="flex items-center cursor-pointer gap-3 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                    data-tour="create-goal-btn"
                  >
                    <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                    <span>Create Goal</span>
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
  
        {/* Main Content */}
        <div id="main-content" className="max-w-7xl mx-auto px-0 sm:px-8 lg:px-8 py-8 space-y-8" tabIndex={-1}>
          {hasGoals ? (
            <>
              <div data-tour="spotlight-section">
                <SpotlightSection 
                  spotlightGoals={spotlightGoals}
                  getGoalStatus={getGoalStatus}
                />
              </div>
              
              <div data-tour="stats-bar">
                <StatsBar stats={statsData} />
              </div>
              
              <div data-tour="goals-list">
                <CommandCenter 
                  goals={sortedGoals}
                  getGoalStatus={getGoalStatus}
                  onUpdate={refetch}
                />
              </div>
            </>
          ) : (
            <EmptyGoalsState />
          )}
        </div>
      </motion.main>
    );
  }

// Spotlight Section Component
const SpotlightSection = memo(function SpotlightSection({ 
  spotlightGoals, 
  getGoalStatus 
}: {
  spotlightGoals: any[];
  getGoalStatus: (goal: any) => string;
}) {
  if (!spotlightGoals || spotlightGoals.length === 0) return null;

  
  return (
    <motion.section 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h2 className="text-2xl font-medium text-foreground">Spotlight</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {spotlightGoals.map((goal, index) => (
          <SpotlightCard 
            key={goal.id}
            goal={goal}
            type={goal.spotlightType}
            icon={getGoalIcon(goal)}
            status={getGoalStatus(goal)}
            reason={goal.spotlightReason}
            priority={index + 1}
          />
        ))}
      </div>
    </motion.section>
  );
});

// Clean Spotlight Card with Apple-inspired minimal design
const SpotlightCard = memo(function SpotlightCard({ 
  goal, 
  type, 
  icon, 
  status,
  reason,
  priority 
}: {
  goal: any;
  type: 'critical' | 'urgency' | 'attention' | 'upcoming' | 'success' | 'momentum' | 'stagnant';
  icon: any;
  status: string;
  reason?: string;
  priority?: number;
}) {
  const daysUntilTarget = goal.target_date 
    ? Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  
  return (
    <Link to={`/dashboard/tracker/${goal.id}`} params={{ goalId: goal.id }}>
      <motion.div 
        className="bg-moneko-background rounded-3xl p-8 cursor-pointer transition-all duration-200 hover:shadow-md shadow-sm"
        whileHover={{ y: -1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >                
        <div className="text-center space-y-4">
          {/* Days Display */}
          <div className="text-3xl font-light text-foreground">
            {daysUntilTarget > 0 ? `${daysUntilTarget} Days` : daysUntilTarget === 0 ? 'Due Today' : 'Overdue'}
          </div>
          
          {/* Goal Title */}
          <div className="text-muted-foreground font-medium leading-tight">
            Until {goal.title}
          </div>
        </div>
      </motion.div>
    </Link>
  );
});

// Clean Stats Bar with Apple-inspired minimal design
const StatsBar = memo(function StatsBar({ stats }: { stats: any }) {
  const statItems = [
    { 
      label: 'Total Goals', 
      value: stats.totalGoals, 
      icon: faBullseye,
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400'
    },
    { 
      label: 'Active Goals', 
      value: stats.activeGoals, 
      icon: faChartLine,
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400'
    },
    { 
      label: 'Completed Goals', 
      value: stats.completedGoals, 
      icon: faTrophy,
      bgColor: 'bg-amber-50 dark:bg-amber-950/20',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400'
    },
    { 
      label: 'Overall Progress', 
      value: `${stats.onTrackPercentage}%`, 
      icon: faCheckCircle,
      bgColor: 'bg-purple-50 dark:bg-purple-950/20',
      iconBg: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: 'text-purple-600 dark:text-purple-400'
    }
  ];
  
  return (
    <motion.section 
      className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      {statItems.map((stat) => (
        <motion.div 
          key={stat.label} 
          className={`${stat.bgColor} rounded-2xl p-6 text-center transition-all duration-200 hover:shadow-md shadow-sm`}
          whileHover={{ y: -1 }}
        >
          <div className={`w-12 h-12 ${stat.iconBg} rounded-xl flex items-center justify-center mx-auto mb-4`}>
            <FontAwesomeIcon icon={stat.icon} className={`w-5 h-5 ${stat.iconColor}`} />
          </div>
          <div className="text-3xl font-light text-foreground mb-2">
            {stat.value}
          </div>
          <div className="text-sm text-muted-foreground font-medium">
            {stat.label}
          </div>
        </motion.div>
      ))}
    </motion.section>
  );
});

// Clean Goals List with Apple-inspired minimal design
const CommandCenter = memo(function CommandCenter({ 
  goals, 
  getGoalStatus, 
  onUpdate 
}: {
  goals: any[];
  getGoalStatus: (goal: any) => string;
  onUpdate: () => void;
}) {
  return (
    <motion.section 
      className="bg-moneko-background rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      {/* Header */}
      <div className="p-8 pb-6">
        <h2 className="text-2xl font-medium text-foreground">Goals</h2>
      </div>
      
      {/* Goals List */}
      <div className="space-y-1">
        {goals.length === 0 ? (
          <div className="text-center py-16">
            <FontAwesomeIcon icon={faFilter} className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No goals match your current filter</p>
          </div>
        ) : (
          goals.map((goal) => (
            <GoalCard 
              key={goal.id} 
              goal={goal} 
              getGoalStatus={getGoalStatus}
            />
          ))
        )}
      </div>
    </motion.section>
  );
});

// Clean Goal Card with Apple-inspired minimal design
const GoalCard = memo(function GoalCard({ 
  goal, 
  getGoalStatus 
}: {
  goal: any;
  getGoalStatus: (goal: any) => string;
}) {
  const progress = goal.current_amount && goal.target_amount 
    ? (goal.current_amount / goal.target_amount) * 100 
    : 0;
  
  return (
    <Link to={`/dashboard/tracker/${goal.id}`} params={{ goalId: goal.id }}>
      <motion.div 
        className="group px-8 py-6 transition-all duration-200 cursor-pointer hover:bg-subtle-background/50"
        whileHover={{ x: 4 }}
      >     
        <div className="flex items-center gap-4">
          {/* Minimal Icon */}
          <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
            <FontAwesomeIcon 
              icon={getGoalIcon(goal)} 
              className="w-5 h-5 text-muted-foreground" 
            />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-foreground truncate">
                {goal.title}
              </h3>
              <span className="text-sm font-medium text-muted-foreground ml-4">
                {Math.round(progress)}%
              </span>
            </div>
            
            {/* Clean Progress Bar */}
            <div className="w-full bg-muted rounded-full h-2">
              <motion.div 
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress, 100)}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>
          
          <FontAwesomeIcon 
            icon={faChevronRight} 
            className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors duration-200" 
          />
        </div>
      </motion.div>
    </Link>
  );
});

// Mission Control: Enhanced Empty State
const EmptyGoalsState = memo(function EmptyGoalsState() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col items-center justify-center py-12 sm:py-16 lg:py-20 px-4"
      role="region"
      aria-labelledby="empty-state-heading"
    >
      <div className="max-w-lg text-center">
        {/* Enhanced Icon Design */}
        <div className="relative mb-8 sm:mb-10 lg:mb-12">
          <motion.div 
            className="w-32 h-32 sm:w-36 sm:h-36 lg:w-40 lg:h-40 mx-auto rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-2xl"
            style={{
              background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.2)"
            }}
            animate={{ 
              rotate: [0, 5, 0, -5, 0],
              scale: [1, 1.02, 1]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <div className="w-16 h-16 sm:w-18 sm:h-18 lg:w-20 lg:h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xl">
              <FontAwesomeIcon 
                icon={faBullseye} 
                className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 text-white"
                aria-hidden="true"
              />
            </div>
          </motion.div>
          
          <motion.div 
            className="absolute -bottom-3 -right-3 sm:-bottom-4 sm:-right-4 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-xl"
            animate={{ 
              y: [0, -8, 0],
              rotate: [0, 180, 360]
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <FontAwesomeIcon 
              icon={faPlus} 
              className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white"
              aria-hidden="true"
            />
          </motion.div>
        </div>

        {/* Content with Expressive Typography */}
        <motion.h2 
          id="empty-state-heading" 
          className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 leading-tight"
        >
          Start Your Financial Journey
        </motion.h2>
        
        <motion.p 
          className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-8 sm:mb-10 lg:mb-12 leading-relaxed max-w-md mx-auto px-2"
        >
          Transform your financial dreams into achievable goals with AI-powered strategies, smart milestones, and progress tracking.
        </motion.p>

        {/* Enhanced Benefits Grid */}
        <div className="grid grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-10 lg:mb-12" role="list" aria-label="Goal tracker benefits">
          {[
            { icon: faWandSparkles, label: 'AI Strategy', color: 'from-blue-500 to-blue-600' },
            { icon: faBullseye, label: 'Smart Milestones', color: 'from-green-500 to-emerald-600' },
            { icon: faTrophy, label: 'Track Progress', color: 'from-purple-500 to-purple-600' }
          ].map((benefit, index) => (
            <motion.div 
              key={benefit.label}
              className="text-center" 
              role="listitem"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                delay: 0.2 + (index * 0.1),
                duration: 0.4,
                ease: [0.25, 0.8, 0.5, 1]
              }}
            >
              <div className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 mx-auto bg-gradient-to-br ${benefit.color} rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-3 lg:mb-4 shadow-lg`}>
                <FontAwesomeIcon icon={benefit.icon} className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" aria-hidden="true" />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                {benefit.label}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Enhanced CTA */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Link to="/dashboard/tracker/create" aria-describedby="empty-state-heading">
            <button className="group h-12 sm:h-14 px-6 sm:px-8 lg:px-10 cursor-pointer bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 dark:from-blue-500 dark:to-purple-500 dark:hover:from-blue-600 dark:hover:to-purple-600 text-white shadow-2xl border-0 font-bold text-base sm:text-lg rounded-xl sm:rounded-2xl transition-all duration-300 w-full sm:w-auto" aria-label="Create your first financial goal">
              <FontAwesomeIcon icon={faWandSparkles} className="mr-2 sm:mr-3 group-hover:rotate-12 transition-transform" aria-hidden="true" />
              <span className="hidden xs:inline">Create Your First Goal</span>
              <span className="xs:hidden">Create Goal</span>
              <FontAwesomeIcon icon={faArrowRight} className="ml-2 sm:ml-3 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
            </button>
          </Link>
        </motion.div>
      </div>
    </motion.section>
  );
});

// Mission Control: Enhanced Loading Skeleton
const GoalsLoadingSkeleton = memo(function GoalsLoadingSkeleton() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900" role="main" aria-label="Loading goal tracker data">
      <div aria-live="polite" aria-label="Loading your goals">
        <span className="sr-only">Loading your financial goals, please wait...</span>
      </div>
      
      {/* Hero Skeleton */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="h-8 bg-gray-200/60 dark:bg-gray-700/60 rounded w-32 animate-pulse"></div>
              <div className="h-5 bg-gray-200/60 dark:bg-gray-700/60 rounded w-96 animate-pulse"></div>
            </div>
            <div className="h-12 w-40 bg-gray-200/60 dark:bg-gray-700/60 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Spotlight Skeleton */}
        <div className="space-y-4">
          <div className="h-6 bg-gray-200/60 dark:bg-gray-700/60 rounded w-24 animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-40 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse"></div>
            <div className="h-40 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse"></div>
          </div>
        </div>
        
        {/* Stats Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center space-y-3">
                <div className="w-12 h-12 bg-gray-200/60 dark:bg-gray-700/60 rounded-lg mx-auto animate-pulse"></div>
                <div className="h-6 bg-gray-200/60 dark:bg-gray-700/60 rounded w-16 mx-auto animate-pulse"></div>
                <div className="h-4 bg-gray-200/60 dark:bg-gray-700/60 rounded w-20 mx-auto animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Goals List Skeleton */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="h-6 bg-gray-200/60 dark:bg-gray-700/60 rounded w-24 animate-pulse"></div>
            <div className="flex gap-4">
              <div className="h-10 bg-gray-200/60 dark:bg-gray-700/60 rounded w-32 animate-pulse"></div>
              <div className="h-10 bg-gray-200/60 dark:bg-gray-700/60 rounded w-40 animate-pulse"></div>
            </div>
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
});

// Mission Control: Enhanced Error State
const ErrorState = memo(function ErrorState({ error, onRetry }: { error: any; onRetry: () => void }) {
  const handleRetry = useCallback(() => {
    onRetry();
  }, [onRetry]);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center" role="main">
      <div className="max-w-md text-center px-6">
        <motion.div 
          className="w-24 h-24 mx-auto mb-8 rounded-3xl flex items-center justify-center shadow-2xl"
          style={{
            background: "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(245, 101, 101, 0.1) 100%)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(239, 68, 68, 0.2)"
          }}
          animate={{ 
            scale: [1, 1.05, 1],
            rotate: [0, 5, 0, -5, 0]
          }}
          transition={{ 
            duration: 3, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center">
            <FontAwesomeIcon icon={faExclamationTriangle} className="w-6 h-6 text-white" aria-hidden="true" />
          </div>
        </motion.div>
        
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
          Failed to Load Goals
        </h2>
        
        <p className="text-base text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
          {error?.message || 'Something went wrong while loading your goals. Please try again.'}
        </p>
        
        <div role="alert" aria-live="polite" className="sr-only">
          Error loading goals: {error?.message || 'Unknown error occurred'}
        </div>
        
        <motion.button 
          onClick={handleRetry}
          className="h-12 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 dark:from-blue-500 dark:to-purple-500 dark:hover:from-blue-600 dark:hover:to-purple-600 text-white shadow-lg border-0 font-semibold rounded-xl transition-all duration-200"
          aria-label="Retry loading goals"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <FontAwesomeIcon icon={faRefresh} className="mr-2 w-4 h-4" aria-hidden="true" />
          Try Again
        </motion.button>
      </div>
    </main>
  );
});

export default GoalsTracker;