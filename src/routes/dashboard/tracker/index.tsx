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
            "https://x.com/moneko_ai",
            "https://linkedin.com/company/moneko-ai"
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
        className="min-h-screen" 
        role="main" 
        aria-label="Goals Dashboard"
        variants={pageVariants}
        initial="initial"
        animate="animate"
      >
        {/* Skip to main content link for keyboard navigation */}
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50 font-medium"
        >
          Skip to main content
        </a>
  
        {/* Compact Header - Mobile Optimized */}
        <div className="border-b border-border/50">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8">
            <div className="flex items-center justify-between gap-3 sm:gap-6" data-tour="page-header">
              <div className="min-w-0 flex-1">
                <h1 className="text-mobile-lg sm:text-3xl md:text-4xl font-light text-foreground mb-1 sm:mb-2">
                  Goals
                </h1>
                <p className="text-muted-foreground text-mobile-sm sm:text-base md:text-lg">
                  Track & achieve financial goals
                </p>
              </div>
              <div className="shrink-0">
                <Link to="/dashboard/tracker/create">
                  <button
                    className="flex items-center justify-center cursor-pointer gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full font-medium transition-all duration-200 shadow-sm hover:shadow-md min-h-[44px] min-w-[44px] touch-manipulation text-mobile-sm sm:text-base"
                    data-tour="create-goal-btn"
                  >
                    <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                    <span className="hidden sm:inline">Create Goal</span>
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Mobile Optimized Spacing */}
        <div id="main-content" className="max-w-7xl mx-auto px-0 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6 md:space-y-8" tabIndex={-1}>
          {hasGoals ? (
            <>
              {/* Compact Stats - Mobile First */}
              <div data-tour="stats-bar" className="px-3 sm:px-0">
                <StatsBar stats={statsData} />
              </div>

              {/* Spotlight Section - Compact Mobile */}
              <div data-tour="spotlight-section" className="px-3 sm:px-0">
                <SpotlightSection 
                  spotlightGoals={spotlightGoals}
                  getGoalStatus={getGoalStatus}
                />
              </div>
              
              {/* Goals List - Edge-to-edge on Mobile */}
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

// Compact Spotlight Section - Mobile Optimized
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
      className="space-y-3 sm:space-y-4 md:space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h2 className="text-mobile-base sm:text-xl md:text-2xl font-medium text-foreground">Spotlight</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 md:gap-6">
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

// Compact Spotlight Card - Mobile Optimized
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
        className="bg-moneko-background rounded-xl sm:rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 cursor-pointer transition-all duration-200 hover:shadow-md shadow-sm min-h-[80px] sm:min-h-[120px] touch-manipulation"
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <div className="text-center space-y-2 sm:space-y-3 md:space-y-4">
          {/* Days Display - Compact on Mobile */}
          <div className="text-xl sm:text-2xl md:text-3xl font-light text-foreground">
            {daysUntilTarget > 0 ? `${daysUntilTarget} Days` : daysUntilTarget === 0 ? 'Due Today' : 'Overdue'}
          </div>

          {/* Goal Title - Compact Typography */}
          <div className="text-mobile-sm sm:text-sm md:text-base text-muted-foreground font-medium leading-tight line-clamp-2">
            Until {goal.title}
          </div>
        </div>
      </motion.div>
    </Link>
  );
});

// Compact Stats Bar - Mobile Optimized
const StatsBar = memo(function StatsBar({ stats }: { stats: any }) {
  const statItems = [
    { 
      label: 'Total', 
      value: stats.totalGoals, 
      icon: faBullseye,
      bgColor: 'bg-blue-50/50 dark:bg-blue-950/30',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400'
    },
    { 
      label: 'Active', 
      value: stats.activeGoals, 
      icon: faChartLine,
      bgColor: 'bg-green-50/50 dark:bg-green-950/30',
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400'
    },
    { 
      label: 'Completed', 
      value: stats.completedGoals, 
      icon: faTrophy,
      bgColor: 'bg-amber-50/50 dark:bg-amber-950/30',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400'
    },
    { 
      label: 'Progress', 
      value: `${stats.onTrackPercentage}%`, 
      icon: faCheckCircle,
      bgColor: 'bg-purple-50/50 dark:bg-purple-950/30',
      iconBg: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: 'text-purple-600 dark:text-purple-400'
    }
  ];
  
  return (
    <motion.section
      className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      {statItems.map((stat) => (
        <motion.div
          key={stat.label}
          className={`${stat.bgColor} rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 text-center transition-all duration-200 hover:shadow-sm min-h-[80px] sm:min-h-[120px]`}
          whileHover={{ y: -1 }}
        >
          <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 ${stat.iconBg} rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3`}>
            <FontAwesomeIcon icon={stat.icon} className={`w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 ${stat.iconColor}`} />
          </div>
          <div className="text-xl sm:text-2xl md:text-3xl font-light text-foreground mb-0.5 sm:mb-1">
            {stat.value}
          </div>
          <div className="text-mobile-xs sm:text-xs md:text-sm text-muted-foreground font-medium">
            {stat.label}
          </div>
        </motion.div>
      ))}
    </motion.section>
  );
});

// Compact Goals List - Mobile Edge-to-Edge
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
      className="bg-moneko-background rounded-none sm:rounded-2xl md:rounded-3xl overflow-hidden shadow-none sm:shadow-sm hover:shadow-md transition-all duration-200"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      {/* Header - Compact on Mobile */}
      <div className="p-3 px-3 sm:p-6 md:p-8 pb-2 sm:pb-4 md:pb-6">
        <h2 className="text-mobile-base sm:text-xl md:text-2xl font-medium text-foreground">Goals</h2>
      </div>

      {/* Goals List */}
      <div className="space-y-0">
        {goals.length === 0 ? (
          <div className="text-center py-8 sm:py-12 md:py-16 px-4">
            <FontAwesomeIcon icon={faFilter} className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-muted-foreground mb-2 sm:mb-3 md:mb-4" />
            <p className="text-mobile-sm sm:text-sm md:text-base text-muted-foreground">No goals match your current filter</p>
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

// Compact Goal Card - Mobile Optimized
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
        className="group px-3 sm:px-6 md:px-8 py-3 sm:py-4 md:py-5 transition-all duration-200 cursor-pointer hover:bg-subtle-background/50 min-h-[60px] sm:min-h-[72px] touch-manipulation border-b border-border/30 last:border-0"
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.995 }}
      >
        <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4">
          {/* Compact Icon */}
          <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-muted rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
            <FontAwesomeIcon
              icon={getGoalIcon(goal)}
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-muted-foreground"
            />
          </div>

          {/* Content - Compact */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <h3 className="text-mobile-sm sm:text-sm md:text-base font-medium text-foreground truncate">
                {goal.title}
              </h3>
              <span className="text-mobile-xs sm:text-xs md:text-sm font-medium text-muted-foreground ml-2 sm:ml-3 md:ml-4 flex-shrink-0">
                {Math.round(progress)}%
              </span>
            </div>

            {/* Compact Progress Bar */}
            <div className="w-full bg-muted rounded-full h-1 sm:h-1.5 md:h-2">
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
            className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-muted-foreground group-hover:text-foreground transition-colors duration-200 flex-shrink-0"
          />
        </div>
      </motion.div>
    </Link>
  );
});

// Compact Empty State - Mobile Optimized
const EmptyGoalsState = memo(function EmptyGoalsState() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col items-center justify-center py-8 sm:py-12 md:py-16 lg:py-20 px-4"
      role="region"
      aria-labelledby="empty-state-heading"
    >
      <div className="max-w-lg text-center">
        {/* Compact Icon Design */}
        <div className="relative mb-6 sm:mb-8 md:mb-10">
          <motion.div
            className="w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 mx-auto rounded-xl sm:rounded-2xl md:rounded-3xl flex items-center justify-center shadow-2xl"
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
            <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-18 md:h-18 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center shadow-xl">
              <FontAwesomeIcon
                icon={faBullseye}
                className="w-5 h-5 sm:w-7 sm:h-7 md:w-9 md:h-9 text-white"
                aria-hidden="true"
              />
            </div>
          </motion.div>

          <motion.div
            className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 md:-bottom-4 md:-right-4 w-8 h-8 sm:w-11 sm:h-11 md:w-14 md:h-14 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-xl"
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
              className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white"
              aria-hidden="true"
            />
          </motion.div>
        </div>

        {/* Compact Typography */}
        <motion.h2
          id="empty-state-heading"
          className="text-mobile-lg sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3 md:mb-4 leading-tight"
        >
          Start Your Financial Journey
        </motion.h2>

        <motion.p
          className="text-mobile-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 mb-6 sm:mb-8 md:mb-10 leading-relaxed max-w-md mx-auto px-2"
        >
          Transform your financial dreams into achievable goals with AI-powered strategies.
        </motion.p>

        {/* Compact Benefits Grid */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4 md:gap-6 mb-6 sm:mb-8 md:mb-10" role="list" aria-label="Goal tracker benefits">
          {[
            { icon: faWandSparkles, label: 'AI Strategy', color: 'from-blue-500 to-blue-600' },
            { icon: faBullseye, label: 'Milestones', color: 'from-green-500 to-emerald-600' },
            { icon: faTrophy, label: 'Progress', color: 'from-purple-500 to-purple-600' }
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
              <div className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 mx-auto bg-gradient-to-br ${benefit.color} rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center mb-1.5 sm:mb-2 md:mb-3 shadow-lg`}>
                <FontAwesomeIcon icon={benefit.icon} className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" aria-hidden="true" />
              </div>
              <p className="text-mobile-xs sm:text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">
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
            <button className="group h-11 sm:h-12 md:h-14 px-5 sm:px-6 md:px-8 lg:px-10 cursor-pointer bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 dark:from-blue-500 dark:to-purple-500 dark:hover:from-blue-600 dark:hover:to-purple-600 text-white shadow-2xl border-0 font-bold text-sm sm:text-base md:text-lg rounded-xl sm:rounded-2xl transition-all duration-300 w-full sm:w-auto min-h-[44px] touch-manipulation flex items-center justify-center gap-2 sm:gap-3" aria-label="Create your first financial goal">
              <FontAwesomeIcon icon={faWandSparkles} className="group-hover:rotate-12 transition-transform" aria-hidden="true" />
              <span className="hidden xs:inline">Create Your First Goal</span>
              <span className="xs:hidden">Create Goal</span>
              <FontAwesomeIcon icon={faArrowRight} className="group-hover:translate-x-1 transition-transform" aria-hidden="true" />
            </button>
          </Link>
        </motion.div>
      </div>
    </motion.section>
  );
});

// Compact Loading Skeleton - Mobile Optimized
const GoalsLoadingSkeleton = memo(function GoalsLoadingSkeleton() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900" role="main" aria-label="Loading goal tracker data">
      <div aria-live="polite" aria-label="Loading your goals">
        <span className="sr-only">Loading your financial goals, please wait...</span>
      </div>
      
      {/* Compact Header Skeleton */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8">
          <div className="flex items-center justify-between gap-3 sm:gap-6">
            <div className="space-y-1.5 sm:space-y-2 flex-1">
              <div className="h-5 sm:h-6 md:h-8 bg-gray-200/60 dark:bg-gray-700/60 rounded w-20 sm:w-24 md:w-32 animate-pulse"></div>
              <div className="h-3.5 sm:h-4 md:h-5 bg-gray-200/60 dark:bg-gray-700/60 rounded w-36 sm:w-48 md:w-64 animate-pulse"></div>
            </div>
            <div className="h-11 w-11 sm:w-40 bg-gray-200/60 dark:bg-gray-700/60 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-0 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6 md:space-y-8">
        {/* Stats Skeleton - Compact on Mobile */}
        <div className="px-3 sm:px-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 md:p-6 text-center space-y-2 sm:space-y-3 animate-pulse min-h-[80px] sm:min-h-[120px]">
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gray-200/60 dark:bg-gray-700/60 rounded-lg sm:rounded-xl mx-auto"></div>
                <div className="h-4 sm:h-5 md:h-6 bg-gray-200/60 dark:bg-gray-700/60 rounded w-10 sm:w-12 md:w-16 mx-auto"></div>
                <div className="h-2.5 sm:h-3 md:h-4 bg-gray-200/60 dark:bg-gray-700/60 rounded w-12 sm:w-16 md:w-20 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Spotlight Skeleton - Compact */}
        <div className="space-y-3 sm:space-y-4 px-3 sm:px-0">
          <div className="h-4 sm:h-5 md:h-6 bg-gray-200/60 dark:bg-gray-700/60 rounded w-16 sm:w-20 md:w-24 animate-pulse"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 md:gap-6">
            <div className="h-20 sm:h-28 md:h-32 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 animate-pulse"></div>
            <div className="h-20 sm:h-28 md:h-32 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 animate-pulse"></div>
            <div className="h-20 sm:h-28 md:h-32 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 animate-pulse hidden lg:block"></div>
          </div>
        </div>

        {/* Goals List Skeleton - Edge-to-edge Mobile */}
        <div className="space-y-3 sm:space-y-4">
          <div className="h-4 sm:h-5 md:h-6 bg-gray-200/60 dark:bg-gray-700/60 rounded w-16 sm:w-20 md:w-24 animate-pulse px-3 sm:px-0"></div>
          <div className="space-y-0">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 sm:h-20 md:h-24 bg-white dark:bg-gray-800 rounded-none sm:rounded-2xl border-b sm:border border-gray-200 dark:border-gray-700 animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
});

// Compact Error State - Mobile Optimized
const ErrorState = memo(function ErrorState({ error, onRetry }: { error: any; onRetry: () => void }) {
  const handleRetry = useCallback(() => {
    onRetry();
  }, [onRetry]);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4" role="main">
      <div className="max-w-md text-center px-4 sm:px-6">
        <motion.div
          className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto mb-4 sm:mb-6 md:mb-8 rounded-xl sm:rounded-2xl md:rounded-3xl flex items-center justify-center shadow-2xl"
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
          <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center">
            <FontAwesomeIcon icon={faExclamationTriangle} className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" aria-hidden="true" />
          </div>
        </motion.div>

        <h2 className="text-mobile-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3 md:mb-4 leading-tight">
          Failed to Load Goals
        </h2>

        <p className="text-mobile-sm sm:text-sm md:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6 md:mb-8 leading-relaxed">
          {error?.message || 'Something went wrong while loading your goals. Please try again.'}
        </p>

        <div role="alert" aria-live="polite" className="sr-only">
          Error loading goals: {error?.message || 'Unknown error occurred'}
        </div>

        <motion.button
          onClick={handleRetry}
          className="h-11 sm:h-12 px-6 sm:px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 dark:from-blue-500 dark:to-purple-500 dark:hover:from-blue-600 dark:hover:to-purple-600 text-white shadow-lg border-0 font-semibold text-mobile-sm sm:text-sm md:text-base rounded-xl transition-all duration-200 min-h-[44px] touch-manipulation flex items-center justify-center gap-2 w-full sm:w-auto mx-auto"
          aria-label="Retry loading goals"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <FontAwesomeIcon icon={faRefresh} className="w-4 h-4" aria-hidden="true" />
          <span>Try Again</span>
        </motion.button>
      </div>
    </main>
  );
});

export default GoalsTracker;