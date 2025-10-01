import { AI_ID } from '@/contexts/ai-chat-context';

// Types for guidance system
export interface GuidanceScenario {
  id: string;
  route: string;
  agentId: AI_ID;
  message: string;
  priority: 'high' | 'medium' | 'low';
  conditions: GuidanceCondition[];
  cooldownHours?: number;
  maxShowCount?: number;
  actionButton?: {
    text: string;
    link: string;
  };
}

export interface GuidanceCondition {
  type: 'first_visit' | 'return_visit' | 'time_since_last' | 'page_time' | 'user_action' | 'route_pattern' | 'goal_status';
  value?: any;
  operator?: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
}

export interface UserGuidanceState {
  totalVisits: number;
  routeVisits: Record<string, number>;
  lastVisits: Record<string, number>;
  scenariosShown: Record<string, { count: number; lastShown: number }>;
  userJourney: {
    firstDashboardVisit?: number;
    hasCreatedGoal: boolean;
    hasUsedChat: boolean;
    hasViewedLearning: boolean;
    hasViewedPortfolio: boolean;
    completedLessons: string[];
    lastCompletedLesson?: {
      lessonId: string;
      courseId: string;
      completedAt: number;
    };
    isEligibleForTrial?: boolean; // True if user has never had a subscription
  };
  preferences: {
    guidanceEnabled: boolean;
    frequencyLevel: 'high' | 'medium' | 'low';
  };
}

// Comprehensive guidance scenarios covering the entire user journey
const GUIDANCE_SCENARIOS: GuidanceScenario[] = [
  // === ONBOARDING & ORIENTATION ===
  {
    id: 'first_dashboard_visit_welcome',
    route: '/dashboard/',
    agentId: 'educator',
    message: 'Welcome to Moneko! 👋 I\'m Finni, your financial educator. This is your financial command center - let me show you around and help you start your journey!',
    priority: 'high',
    conditions: [
      { type: 'first_visit', value: true }
    ],
    maxShowCount: 1
  },

  {
    id: 'dashboard_navigation_help',
    route: '/dashboard/',
    agentId: 'advisor',
    message: 'New here? I recommend starting with either Goal Tracker to set your first financial target, or Learning to build your foundation. What interests you most?',
    priority: 'high',
    conditions: [
      { type: 'user_action', value: 'dashboard_idle_15s' },
      { type: 'route_pattern', value: 'no_major_sections_visited' }
    ],
    cooldownHours: 24,
    maxShowCount: 2
  },

  {
    id: 'progress_encouragement',
    route: '/dashboard/',
    agentId: 'educator',
    message: 'You\'re making great progress! 🌟 I can see you\'ve been exploring different sections. Ready to dive deeper into any particular area?',
    priority: 'medium',
    conditions: [
      { type: 'user_action', value: 'multiple_sections_visited' },
      { type: 'return_visit', value: true }
    ],
    cooldownHours: 72,
    maxShowCount: 3
  },

  // === GOAL TRACKER SCENARIOS ===
  {
    id: 'tracker_first_visit',
    route: '/dashboard/tracker/',
    agentId: 'advisor',
    message: 'Welcome to Goal Tracker! 🎯 This is where you turn your financial dreams into actionable plans. Ready to create your first goal?',
    priority: 'high',
    conditions: [
      { type: 'first_visit', value: true }
    ],
    maxShowCount: 1
  },

  {
    id: 'tracker_no_goals_guidance',
    route: '/dashboard/tracker/',
    agentId: 'advisor',
    message: 'I see you don\'t have any goals yet. No worries! Let\'s start with something achievable - maybe an emergency fund or a vacation savings goal?',
    priority: 'high',
    conditions: [
      { type: 'goal_status', value: 'no_goals' },
      { type: 'return_visit', value: true }
    ],
    cooldownHours: 48,
    maxShowCount: 3
  },

  {
    id: 'goal_creation_first_visit',
    route: '/dashboard/tracker/create/',
    agentId: 'advisor',
    message: 'Excellent! You\'re creating your first goal. 🎉 Take your time here - a well-defined goal is the foundation of financial success. Need any tips?',
    priority: 'high',
    conditions: [
      { type: 'first_visit', value: true }
    ],
    maxShowCount: 1
  },

  {
    id: 'first_goal_created_celebration',
    route: '/dashboard/tracker/{goalId}',
    agentId: 'advisor',
    message: 'Congratulations on creating your first goal! 🎊 This is a huge step. I\'m here to help you optimize your strategy and stay on track.',
    priority: 'high',
    conditions: [
      { type: 'user_action', value: 'first_goal_created' },
      { type: 'first_visit', value: true }
    ],
    maxShowCount: 1
  },

  {
    id: 'goal_progress_check',
    route: '/dashboard/tracker/{goalId}',
    agentId: 'advisor',
    message: 'How\'s your progress going? 📈 Remember, small consistent contributions often beat large irregular ones. Want to review your strategy?',
    priority: 'medium',
    conditions: [
      { type: 'return_visit', value: true },
      { type: 'time_since_last', value: 168, operator: 'gte' }, // 1+ week
      { type: 'page_time', value: 3000 } // 3+ seconds on goal page
    ],
    cooldownHours: 336, // 2 weeks
    maxShowCount: 5
  },

  {
    id: 'goal_behind_schedule',
    route: '/dashboard/tracker/{goalId}',
    agentId: 'advisor',
    message: 'I noticed you might be falling behind on this goal. That\'s totally normal! 💪 Let\'s discuss some strategies to get back on track.',
    priority: 'high',
    conditions: [
      { type: 'goal_status', value: 'behind_schedule' },
      { type: 'page_time', value: 5000 }
    ],
    cooldownHours: 336, // 2 weeks
    maxShowCount: 3
  },

  {
    id: 'goal_milestone_celebration',
    route: '/dashboard/tracker/{goalId}',
    agentId: 'advisor',
    message: '🎉 Amazing! You\'ve hit a major milestone. This kind of progress shows real financial discipline. Ready to set an even bigger goal?',
    priority: 'medium',
    conditions: [
      { type: 'goal_status', value: 'milestone_reached' }
    ],
    cooldownHours: 24,
    maxShowCount: 5
  },

  {
    id: 'multiple_goals_encouragement',
    route: '/dashboard/tracker/',
    agentId: 'advisor',
    message: 'I love seeing multiple goals! 🌟 You\'re building a comprehensive financial plan. Want help prioritizing or balancing them?',
    priority: 'medium',
    conditions: [
      { type: 'goal_status', value: 'multiple_goals' },
      { type: 'return_visit', value: true }
    ],
    cooldownHours: 168,
    maxShowCount: 3
  },

  // === LEARNING SCENARIOS ===
  {
    id: 'learning_first_visit',
    route: '/dashboard/learning/',
    agentId: 'educator',
    message: 'Welcome to your Learning Hub! 📚 Knowledge is your best investment. I recommend starting with our essentials if you\'re new to finance.',
    priority: 'high',
    conditions: [
      { type: 'first_visit', value: true }
    ],
    maxShowCount: 1
  },

  {
    id: 'learning_vs_essentials_guidance',
    route: '/dashboard/learning/',
    agentId: 'educator',
    message: 'Wondering about the difference? Essentials covers fundamental concepts, while Learning offers deeper, specialized topics. Which matches your experience level?',
    priority: 'medium',
    conditions: [
      { type: 'return_visit', value: true },
      { type: 'page_time', value: 10000 }, // 10+ seconds looking
      { type: 'route_pattern', value: 'no_courses_started' }
    ],
    cooldownHours: 72,
    maxShowCount: 2
  },

  {
    id: 'course_selection_help',
    route: '/dashboard/learning/{courseId}/',
    agentId: 'educator',
    message: 'Great choice! 👍 This course will really expand your financial knowledge. Take your time with each lesson - understanding is more important than speed.',
    priority: 'medium',
    conditions: [
      { type: 'first_visit', value: true }
    ],
    maxShowCount: 1
  },

  {
    id: 'first_lesson_encouragement',
    route: '/dashboard/learning/{courseId}/lesson/{lessonId}',
    agentId: 'educator',
    message: 'Your first lesson! 🚀 Every expert was once a beginner. Take notes and don\'t hesitate to chat with me if you have questions.',
    priority: 'high',
    conditions: [
      { type: 'user_action', value: 'first_lesson_started' },
      { type: 'first_visit', value: true }
    ],
    maxShowCount: 1
  },

  {
    id: 'lesson_completion_next_step',
    route: '/dashboard/learning/{courseId}/lesson/{lessonId}',
    agentId: 'educator',
    message: 'Well done! 🎯 You completed another lesson. Consistency is key in learning. Ready for the next one, or want to apply what you learned first?',
    priority: 'medium',
    conditions: [
      { type: 'user_action', value: 'lesson_completed' }
    ],
    cooldownHours: 1,
    maxShowCount: 10
  },

  {
    id: 'course_halfway_motivation',
    route: '/dashboard/learning/{courseId}/',
    agentId: 'educator',
    message: 'You\'re halfway through this course! 📖 The concepts are building on each other beautifully. How are you feeling about the material so far?',
    priority: 'medium',
    conditions: [
      { type: 'user_action', value: 'course_halfway_complete' }
    ],
    maxShowCount: 1
  },

  {
    id: 'course_completion_celebration',
    route: '/dashboard/learning/{courseId}/',
    agentId: 'educator',
    message: 'Course completed! 🏆 You should feel proud - you\'ve gained valuable financial knowledge. Ready to apply it or explore another course?',
    priority: 'high',
    conditions: [
      { type: 'user_action', value: 'course_completed' }
    ],
    maxShowCount: 1
  },

  // === ESSENTIALS SCENARIOS ===
  {
    id: 'essentials_first_visit',
    route: '/dashboard/essentials/',
    agentId: 'educator',
    message: 'Perfect choice for building your foundation! 🏗️ Essentials covers everything you need to make smart financial decisions. Let\'s start your journey!',
    priority: 'high',
    conditions: [
      { type: 'first_visit', value: true }
    ],
    maxShowCount: 1
  },

  {
    id: 'essentials_course_selection',
    route: '/dashboard/essentials/{courseId}/',
    agentId: 'educator',
    message: 'This essentials course is perfectly structured for beginners! 📈 Each lesson builds on the previous one, so take them in order for the best experience.',
    priority: 'medium',
    conditions: [
      { type: 'first_visit', value: true }
    ],
    maxShowCount: 1
  },

  {
    id: 'essentials_lesson_support',
    route: '/dashboard/essentials/{courseId}/lesson/{lessonId}',
    agentId: 'educator',
    message: 'This fundamental concept will serve you well! 💡 Make sure you understand it fully before moving on - it\'s the building block for everything else.',
    priority: 'medium',
    conditions: [
      { type: 'page_time', value: 120000 }, // 2+ minutes on lesson
      { type: 'user_action', value: 'struggling_with_concept' }
    ],
    cooldownHours: 24,
    maxShowCount: 3
  },

  {
    id: 'essentials_to_goals_bridge',
    route: '/dashboard/essentials/{courseId}/',
    agentId: 'educator',
    message: 'Ready to put this knowledge into action? 🎯 Now might be a great time to create your first financial goal and apply what you\'ve learned!',
    priority: 'medium',
    conditions: [
      { type: 'user_action', value: 'essentials_progress_50_percent' },
      { type: 'goal_status', value: 'no_goals' }
    ],
    maxShowCount: 1
  },

  // === PORTFOLIO SCENARIOS ===
  {
    id: 'portfolio_first_visit',
    route: '/dashboard/portfolio/',
    agentId: 'advisor',
    message: 'Welcome to your Portfolio Hub! 📊 This is where successful investors track their holdings. Ready to take your finances to the next level?',
    priority: 'high',
    conditions: [
      { type: 'first_visit', value: true }
    ],
    maxShowCount: 1
  },

  {
    id: 'portfolio_setup_guidance',
    route: '/dashboard/portfolio/',
    agentId: 'advisor',
    message: 'Setting up your portfolio tracking might seem complex, but it\'s incredibly valuable! 💰 Start with your biggest holdings and build from there.',
    priority: 'medium',
    conditions: [
      { type: 'return_visit', value: true },
      { type: 'user_action', value: 'portfolio_empty' },
      { type: 'page_time', value: 15000 } // 15+ seconds looking
    ],
    cooldownHours: 48,
    maxShowCount: 2
  },

  {
    id: 'portfolio_education_prompt',
    route: '/dashboard/portfolio/',
    agentId: 'advisor',
    message: 'Want to be a smarter investor? 🧠 I notice you haven\'t explored our learning section yet. Investment education could really boost your portfolio performance!',
    priority: 'medium',
    conditions: [
      { type: 'return_visit', value: true },
      { type: 'route_pattern', value: 'no_learning_visited' },
      { type: 'user_action', value: 'portfolio_has_holdings' }
    ],
    cooldownHours: 168,
    maxShowCount: 2
  },

  {
    id: 'portfolio_performance_review',
    route: '/dashboard/portfolio/',
    agentId: 'advisor',
    message: 'Your portfolio is looking good! 📈 Want me to analyze your asset allocation and suggest improvements for better diversification?',
    priority: 'medium',
    conditions: [
      { type: 'return_visit', value: true },
      { type: 'time_since_last', value: 336, operator: 'gte' }, // 2+ weeks
      { type: 'user_action', value: 'portfolio_has_performance_data' }
    ],
    cooldownHours: 336, // 2 weeks
    maxShowCount: 3
  },

  // === USER SETTINGS SCENARIOS ===
  {
    id: 'settings_first_visit',
    route: '/dashboard/user-settings/',
    agentId: 'advisor',
    message: 'Smart move visiting your settings! ⚙️ A complete profile helps me give you much better personalized advice. Let\'s optimize your experience.',
    priority: 'medium',
    conditions: [
      { type: 'first_visit', value: true }
    ],
    maxShowCount: 1
  },

  {
    id: 'profile_completion_prompt',
    route: '/dashboard/user-settings/profile',
    agentId: 'advisor',
    message: 'Your profile is the foundation of personalized advice! 👤 The more details you provide, the better recommendations I can make for your unique situation.',
    priority: 'high',
    conditions: [
      { type: 'first_visit', value: true }
    ],
    maxShowCount: 1
  },

  {
    id: 'incomplete_profile_reminder',
    route: '/dashboard/user-settings/',
    agentId: 'advisor',
    message: 'I notice your profile isn\'t complete yet. 📝 Even basic info like your age and income goals helps me give much better financial advice!',
    priority: 'medium',
    conditions: [
      { type: 'user_action', value: 'profile_incomplete' },
      { type: 'return_visit', value: true }
    ],
    cooldownHours: 168,
    maxShowCount: 3
  },

  {
    id: 'membership_introduction',
    route: '/dashboard/user-settings/membership/',
    agentId: 'advisor',
    message: 'Interested in premium features? 👑 Our membership unlocks advanced calculators, detailed portfolio analysis, and exclusive investment strategies!',
    priority: 'medium',
    conditions: [
      { type: 'first_visit', value: true }
    ],
    maxShowCount: 1
  },

  {
    id: 'membership_value_proposition',
    route: '/dashboard/user-settings/membership/',
    agentId: 'advisor',
    message: 'I can see you\'re serious about your finances! 🌟 Premium members typically see 20% better goal achievement rates with our advanced tools and insights.',
    priority: 'medium',
    conditions: [
      { type: 'user_action', value: 'active_user_multiple_goals' },
      { type: 'return_visit', value: true },
      { type: 'user_action', value: 'not_premium_member' }
    ],
    cooldownHours: 336,
    maxShowCount: 2
  },

  // === ENGAGEMENT & RETENTION ===
  {
    id: 'return_user_welcome',
    route: '/dashboard/',
    agentId: 'advisor',
    message: 'Welcome back! 😊 I\'m excited to see you continuing your financial journey. What would you like to focus on today?',
    priority: 'medium',
    conditions: [
      { type: 'return_visit', value: true },
      { type: 'time_since_last', value: 24, operator: 'gte' } // 1+ day
    ],
    cooldownHours: 168,
    maxShowCount: 5
  },

  {
    id: 'learning_to_action_bridge',
    route: '/dashboard/',
    agentId: 'educator',
    message: 'You\'ve been learning a lot! 🎓 Knowledge is powerful, but action creates wealth. Ready to set some financial goals based on what you\'ve learned?',
    priority: 'medium',
    conditions: [
      { type: 'user_action', value: 'multiple_lessons_completed' },
      { type: 'goal_status', value: 'no_goals' }
    ],
    cooldownHours: 72,
    maxShowCount: 2
  },

  {
    id: 'goals_to_learning_bridge',
    route: '/dashboard/',
    agentId: 'advisor',
    message: 'Your goals are ambitious - I love it! 💪 Want to accelerate your progress? Our learning section has strategies specifically for goal achievement.',
    priority: 'medium',
    conditions: [
      { type: 'user_action', value: 'multiple_goals_created' },
      { type: 'route_pattern', value: 'limited_learning_engagement' }
    ],
    cooldownHours: 168,
    maxShowCount: 2
  },

  {
    id: 'comprehensive_user_celebration',
    route: '/dashboard/',
    agentId: 'educator',
    message: 'Wow! You\'re using goals, learning, AND portfolio tracking! 🏆 You\'re in the top 5% of users. Your financial future is looking incredibly bright!',
    priority: 'medium',
    conditions: [
      { type: 'user_action', value: 'comprehensive_platform_usage' }
    ],
    maxShowCount: 1
  },

  {
    id: 'long_absence_return',
    route: '/dashboard/',
    agentId: 'advisor',
    message: 'It\'s been a while! 🕐 Life gets busy, but your financial goals are still important. Let\'s do a quick check-in and get you back on track.',
    priority: 'high',
    conditions: [
      { type: 'time_since_last', value: 504, operator: 'gte' } // 3+ weeks
    ],
    cooldownHours: 168,
    maxShowCount: 3
  },

  // === CONTEXTUAL HELP ===
  {
    id: 'chat_introduction',
    route: '/dashboard/',
    agentId: 'advisor',
    message: 'See me here on the right? 💬 I\'m your personal financial advisor! Click anytime to ask questions, get advice, or discuss your financial situation.',
    priority: 'medium',
    conditions: [
      { type: 'route_pattern', value: 'no_chat_used' },
      { type: 'time_since_last', value: 72, operator: 'gte' } // 3+ days
    ],
    cooldownHours: 168,
    maxShowCount: 2
  },

  {
    id: 'feature_discovery',
    route: '/dashboard/',
    agentId: 'educator',
    message: 'Did you know you can track investment portfolios here too? 📊 Once you\'re comfortable with basic goals, portfolio tracking is the next level!',
    priority: 'low',
    conditions: [
      { type: 'user_action', value: 'established_goal_user' },
      { type: 'route_pattern', value: 'no_portfolio_visited' },
      { type: 'time_since_last', value: 336, operator: 'gte' } // 2+ weeks
    ],
    cooldownHours: 336,
    maxShowCount: 1
  },

  {
    id: 'seasonal_motivation',
    route: '/dashboard/',
    agentId: 'advisor',
    message: 'New year, new financial goals! 🎊 This is the perfect time to review your progress and set ambitious targets for the year ahead.',
    priority: 'medium',
    conditions: [
      { type: 'user_action', value: 'seasonal_check' }, // Would be triggered by date logic
      { type: 'return_visit', value: true }
    ],
    cooldownHours: 2160, // Monthly
    maxShowCount: 1
  },

  // === FREE TRIAL PROMOTION ===
  {
    id: 'free_trial_promotion_early_users',
    route: '/dashboard/{path}',
    agentId: 'advisor',
    message: '🌟 Try Premium Free for 30 Days! This exclusive offer is available to our early users. Experience AI-powered coaching, advanced analytics, unlimited goal tracking, and priority support. No credit card required. Ready to unlock your full financial potential?',
    priority: 'high',
    conditions: [
      { type: 'user_action', value: 'eligible_for_trial' }
    ],
    cooldownHours: 168, // 7 days
    maxShowCount: 5,
    actionButton: {
      text: 'Claim Your Free Trial Now',
      link: '/pricing#pricing-tiers'
    }
  }
];

class DashboardGuidanceMonitor {
  private static instance: DashboardGuidanceMonitor;
  private currentRoute: string = '';
  private routeParams: Record<string, string> = {};
  private userState: UserGuidanceState;
  private onShowTooltip?: (agentId: AI_ID, message: string, place?: 'left' | 'right' | 'top' | 'bottom', actionButton?: { text: string; link: string }) => void;
  private onHideTooltip?: (agentId: AI_ID) => void;
  private pageStartTime: number = Date.now();
  private checkInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.userState = this.loadUserState();
    this.startPeriodicCheck();
  }

  static getInstance(): DashboardGuidanceMonitor {
    if (!DashboardGuidanceMonitor.instance) {
      DashboardGuidanceMonitor.instance = new DashboardGuidanceMonitor();
    }
    return DashboardGuidanceMonitor.instance;
  }

  // Initialize the monitor with callbacks
  initialize(callbacks: {
    onShowTooltip: (agentId: AI_ID, message: string, place?: 'left' | 'right' | 'top' | 'bottom', actionButton?: { text: string; link: string }) => void;
    onHideTooltip: (agentId: AI_ID) => void;
  }) {
    this.onShowTooltip = callbacks.onShowTooltip;
    this.onHideTooltip = callbacks.onHideTooltip;
  }

  // Track route changes
  trackRouteChange(route: string, params: Record<string, string> = {}) {
    const now = Date.now();
    const normalizedRoute = this.normalizeRoute(route);

    // Update route tracking
    this.currentRoute = normalizedRoute;
    this.routeParams = params;
    this.pageStartTime = now;

    // Update user state
    this.userState.totalVisits++;
    this.userState.routeVisits[normalizedRoute] = (this.userState.routeVisits[normalizedRoute] || 0) + 1;
    this.userState.lastVisits[normalizedRoute] = now;

    // Track first dashboard visit
    if (!this.userState.userJourney.firstDashboardVisit && route.startsWith('/dashboard')) {
      this.userState.userJourney.firstDashboardVisit = now;
    }

    // Save state
    this.saveUserState();

    // Check for applicable scenarios
    setTimeout(() => this.evaluateScenarios(), 1000); // Small delay to let page load
  }

  // Track specific user actions
  trackUserAction(action: string, data?: any) {
    switch (action) {
      case 'goal_created':
        this.userState.userJourney.hasCreatedGoal = true;
        break;
      case 'chat_used':
        this.userState.userJourney.hasUsedChat = true;
        break;
      case 'learning_visited':
        this.userState.userJourney.hasViewedLearning = true;
        break;
      case 'portfolio_visited':
        this.userState.userJourney.hasViewedPortfolio = true;
        break;
      case 'lesson_completed':
        if (data?.lessonId && data?.courseId) {
          // Add to completed lessons array if not already present
          if (!this.userState.userJourney.completedLessons.includes(data.lessonId)) {
            this.userState.userJourney.completedLessons.push(data.lessonId);
          }
          // Update last completed lesson info
          this.userState.userJourney.lastCompletedLesson = {
            lessonId: data.lessonId,
            courseId: data.courseId,
            completedAt: Date.now()
          };
        }
        break;
    }
    this.saveUserState();
  }

  // Set trial eligibility based on subscription status
  setTrialEligibility(isEligible: boolean) {
    this.userState.userJourney.isEligibleForTrial = isEligible;
    this.saveUserState();
    // Re-evaluate scenarios after eligibility changes
    this.evaluateScenarios();
  }

  // Update user preferences
  updatePreferences(preferences: Partial<UserGuidanceState['preferences']>) {
    this.userState.preferences = { ...this.userState.preferences, ...preferences };
    this.saveUserState();
  }

  // Main evaluation logic
  private evaluateScenarios() {
    console.log('🔍 Evaluating scenarios...');
    console.log('Guidance enabled:', this.userState.preferences.guidanceEnabled);
    console.log('onShowTooltip callback exists:', !!this.onShowTooltip);
    console.log('Current route:', this.currentRoute);
    
    if (!this.userState.preferences.guidanceEnabled) {
      console.log('❌ Guidance disabled in preferences');
      return;
    }
    if (!this.onShowTooltip) {
      console.log('❌ No onShowTooltip callback found');
      return;
    }

    const applicableScenarios = this.getApplicableScenarios();
    console.log('📋 Applicable scenarios found:', applicableScenarios.length);
    applicableScenarios.forEach(scenario => {
      console.log(`  - ${scenario.id}: ${scenario.message.substring(0, 50)}...`);
    });
    
    if (applicableScenarios.length === 0) {
      console.log('❌ No applicable scenarios found');
      return;
    }

    // Sort by priority and select the best one
    const selectedScenario = this.selectBestScenario(applicableScenarios);
    console.log('🎯 Selected scenario:', selectedScenario?.id);
    
    if (selectedScenario && this.shouldShowScenario(selectedScenario)) {
      console.log('✅ Showing guidance tooltip for:', selectedScenario.id);
      this.showGuidanceTooltip(selectedScenario);
    } else if (selectedScenario) {
      console.log('❌ Scenario should not be shown (cooldown/max count):', selectedScenario.id);
    } else {
      console.log('❌ No scenario selected');
    }
  }

  private getApplicableScenarios(): GuidanceScenario[] {
    return GUIDANCE_SCENARIOS.filter(scenario => {
      const routeMatch = this.matchesRoute(scenario.route);
      const conditionsMatch = this.evaluateConditions(scenario.conditions);
      
      console.log(`  Checking scenario ${scenario.id}:`);
      console.log(`    Route match (${scenario.route}): ${routeMatch}`);
      console.log(`    Conditions match: ${conditionsMatch}`);
      
      return routeMatch && conditionsMatch;
    });
  }

  private matchesRoute(scenarioRoute: string): boolean {
    // Handle parameter routes like /dashboard/advisor/{goalId}
    const routePattern = scenarioRoute.replace(/\{[^}]+\}/g, '[^/]+');
    const regex = new RegExp(`^${routePattern}$`);
    return regex.test(this.currentRoute);
  }

  private evaluateConditions(conditions: GuidanceCondition[]): boolean {
    return conditions.every(condition => {
      const result = this.evaluateCondition(condition);
      console.log(`      Condition ${condition.type}=${condition.value}: ${result}`);
      return result;
    });
  }

  private evaluateCondition(condition: GuidanceCondition): boolean {
    const now = Date.now();
    
    switch (condition.type) {
      case 'first_visit':
        return (this.userState.routeVisits[this.currentRoute] || 0) === 1;
        
      case 'return_visit':
        return (this.userState.routeVisits[this.currentRoute] || 0) > 1;
        
      case 'time_since_last':
        const lastVisit = this.userState.lastVisits[this.currentRoute] || 0;
        const hoursSince = (now - lastVisit) / (1000 * 60 * 60);
        return this.compareValues(hoursSince, condition.value, condition.operator || 'gte');
        
      case 'page_time':
        const timeOnPage = now - this.pageStartTime;
        return timeOnPage >= (condition.value || 0);
        
      case 'route_pattern':
        return this.evaluateRoutePattern(condition.value);
        
      case 'goal_status':
        return this.evaluateGoalStatus(condition.value);
        
      case 'user_action':
        return this.evaluateUserAction(condition.value);
        
      default:
        return true;
    }
  }

  private evaluateRoutePattern(pattern: string): boolean {
    switch (pattern) {
      case 'from_onboarding':
        // Check if user came from onboarding (could use document.referrer or a flag)
        if (typeof window !== 'undefined') {
          return document.referrer.includes('/onboarding');
        }
        return false;
        
      case 'no_learning_visited':
        return !this.userState.userJourney.hasViewedLearning;
        
      case 'no_chat_used':
        return !this.userState.userJourney.hasUsedChat;
        
      case 'no_portfolio_visited':
        return !this.userState.userJourney.hasViewedPortfolio;
        
      case 'no_major_sections_visited':
        return !this.userState.userJourney.hasViewedLearning && 
               !this.userState.userJourney.hasViewedPortfolio && 
               !this.userState.userJourney.hasCreatedGoal;
               
      case 'no_courses_started':
        return this.userState.userJourney.completedLessons.length === 0;
        
      case 'limited_learning_engagement':
        return this.userState.userJourney.completedLessons.length < 3;
        
      case 'no_community_visited':
        return !this.userState.routeVisits['/dashboard/community-courses/'];
        
      default:
        return false;
    }
  }

  private evaluateGoalStatus(status: string): boolean {
    // This would integrate with actual goal data
    // For now, return mock logic
    switch (status) {
      case 'no_goals':
        return !this.userState.userJourney.hasCreatedGoal;
      case 'behind_schedule':
      case 'milestone_reached':
        return true; // Would check actual goal data
      default:
        return false;
    }
  }

  private evaluateUserAction(action: string): boolean {
    switch (action) {
      case 'dashboard_idle_15s':
        return (Date.now() - this.pageStartTime) > 15000;
      case 'dashboard_idle_30s':
        return (Date.now() - this.pageStartTime) > 30000;
        
      case 'multiple_sections_visited':
        const sectionsVisited = [
          this.userState.userJourney.hasViewedLearning,
          this.userState.userJourney.hasViewedPortfolio,
          this.userState.userJourney.hasCreatedGoal
        ].filter(Boolean).length;
        return sectionsVisited >= 2;
        
      case 'first_goal_created':
        return this.userState.userJourney.hasCreatedGoal && 
               Object.keys(this.userState.scenariosShown).length <= 3; // Recent user
               
      case 'first_lesson_started':
        return this.userState.userJourney.completedLessons.length === 0 &&
               this.currentRoute.includes('/lesson/');
               
      case 'multiple_lessons_completed':
        return this.userState.userJourney.completedLessons.length >= 3;
        
      case 'multiple_goals_created':
        return this.userState.userJourney.hasCreatedGoal; // Mock - would check actual count
        
      case 'comprehensive_platform_usage':
        return this.userState.userJourney.hasViewedLearning &&
               this.userState.userJourney.hasViewedPortfolio &&
               this.userState.userJourney.hasCreatedGoal &&
               this.userState.userJourney.completedLessons.length >= 5;
               
      case 'established_goal_user':
        return this.userState.userJourney.hasCreatedGoal &&
               this.userState.totalVisits >= 10; // Regular user
               
      case 'active_user_multiple_goals':
        return this.userState.userJourney.hasCreatedGoal &&
               this.userState.totalVisits >= 15; // Very active user
               
      case 'not_premium_member':
        return true; // Would check actual subscription status
        
      case 'portfolio_empty':
      case 'portfolio_has_holdings':
      case 'portfolio_has_performance_data':
        return true; // Would check actual portfolio data
        
      case 'profile_incomplete':
        return true; // Would check actual profile data
        
      case 'struggling_with_concept':
        return false; // Would be triggered by specific user behavior
        
      case 'essentials_progress_50_percent':
      case 'course_halfway_complete':
        return false; // Would check actual course progress
        
      case 'seasonal_check':
        // Could implement date-based logic for seasonal messages
        return false;
        
      case 'course_completed':
        // Check if user just completed a lesson and navigated to course page
        const lastCompleted = this.userState.userJourney.lastCompletedLesson;
        if (!lastCompleted) return false;
        
        // Check if the last lesson completion was recent (within last 2 minutes)
        const timeSinceCompletion = Date.now() - lastCompleted.completedAt;
        const isRecentCompletion = timeSinceCompletion < (2 * 60 * 1000); // 2 minutes
        
        // Check if we're currently on the same course page as the completed lesson
        const courseIdMatch = this.currentRoute.match(/\/dashboard\/learning\/([^\/]+)$/);
        const currentCourseId = courseIdMatch?.[1];
        
        return isRecentCompletion && 
               currentCourseId === lastCompleted.courseId &&
               this.userState.routeVisits[this.currentRoute] <= 2; // Don't show too often on same course
               
      case 'lesson_completed':
        // Simple lesson completion check
        const recentLesson = this.userState.userJourney.lastCompletedLesson;
        if (!recentLesson) return false;
        
        const recentCompletion = Date.now() - recentLesson.completedAt;
        return recentCompletion < (5 * 60 * 1000); // Within last 5 minutes
        
      case 'eligible_for_trial':
        // User is eligible for trial only if they have NEVER had a subscription before
        // If a row exists in the subscriptions table (even with null stripe_subscription_id),
        // it means they've already used their trial, so they're not eligible
        // This value is set by the component using setTrialEligibility()
        return this.userState.userJourney.isEligibleForTrial === true;
        
      default:
        return false;
    }
  }

  private compareValues(actual: number, expected: number, operator: string): boolean {
    switch (operator) {
      case 'eq': return actual === expected;
      case 'gt': return actual > expected;
      case 'lt': return actual < expected;
      case 'gte': return actual >= expected;
      case 'lte': return actual <= expected;
      default: return actual >= expected;
    }
  }

  private selectBestScenario(scenarios: GuidanceScenario[]): GuidanceScenario | null {
    // Sort by priority (high > medium > low) then by frequency settings
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const frequencyMultiplier = this.userState.preferences.frequencyLevel === 'high' ? 1 : 
                               this.userState.preferences.frequencyLevel === 'medium' ? 0.7 : 0.4;

    return scenarios
      .filter(s => Math.random() < frequencyMultiplier) // Apply frequency filtering
      .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])[0] || null;
  }

  private shouldShowScenario(scenario: GuidanceScenario): boolean {
    const scenarioState = this.userState.scenariosShown[scenario.id];
    
    if (!scenarioState) return true;
    
    // Check max show count
    if (scenario.maxShowCount && scenarioState.count >= scenario.maxShowCount) {
      return false;
    }
    
    // Check cooldown
    if (scenario.cooldownHours) {
      const hoursSinceShown = (Date.now() - scenarioState.lastShown) / (1000 * 60 * 60);
      if (hoursSinceShown < scenario.cooldownHours) {
        return false;
      }
    }
    
    return true;
  }

  private showGuidanceTooltip(scenario: GuidanceScenario) {
    if (!this.onShowTooltip) return;

    // Update scenario tracking
    const scenarioState = this.userState.scenariosShown[scenario.id] || { count: 0, lastShown: 0 };
    this.userState.scenariosShown[scenario.id] = {
      count: scenarioState.count + 1,
      lastShown: Date.now()
    };
    this.saveUserState();

    // Show the tooltip with optional action button
    this.onShowTooltip(scenario.agentId, scenario.message, 'left', scenario.actionButton);
  }

  private startPeriodicCheck() {
    // Check for time-based scenarios every 30 seconds (only in browser)
    if (typeof window !== 'undefined') {
      this.checkInterval = setInterval(() => {
        this.evaluateScenarios();
      }, 30000);
    }
  }

  private normalizeRoute(route: string): string {
    // Remove query parameters and normalize
    return route.split('?')[0].replace(/\/+$/, '') || '/';
  }

  private loadUserState(): UserGuidanceState {
    if (typeof window === 'undefined') {
      return this.getDefaultUserState();
    }

    try {
      const stored = localStorage.getItem('dashboard-guidance-state');
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...this.getDefaultUserState(), ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load guidance state:', error);
    }

    return this.getDefaultUserState();
  }

  private saveUserState() {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('dashboard-guidance-state', JSON.stringify(this.userState));
    } catch (error) {
      console.warn('Failed to save guidance state:', error);
    }
  }

  private getDefaultUserState(): UserGuidanceState {
    return {
      totalVisits: 0,
      routeVisits: {},
      lastVisits: {},
      scenariosShown: {},
      userJourney: {
        hasCreatedGoal: false,
        hasUsedChat: false,
        hasViewedLearning: false,
        hasViewedPortfolio: false,
        completedLessons: []
      },
      preferences: {
        guidanceEnabled: true,
        frequencyLevel: 'medium'
      }
    };
  }

  // Public methods for manual control
  hideGuidance(agentId: AI_ID) {
    if (this.onHideTooltip) {
      this.onHideTooltip(agentId);
    }
  }

  resetGuidanceState() {
    this.userState = this.getDefaultUserState();
    this.saveUserState();
  }

  getGuidanceStats() {
    return {
      totalVisits: this.userState.totalVisits,
      routesVisited: Object.keys(this.userState.routeVisits).length,
      scenariosShown: Object.keys(this.userState.scenariosShown).length,
      userJourney: this.userState.userJourney
    };
  }

  destroy() {
    if (typeof window !== 'undefined' && this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

// Export singleton instance
export const dashboardGuidanceMonitor = DashboardGuidanceMonitor.getInstance();