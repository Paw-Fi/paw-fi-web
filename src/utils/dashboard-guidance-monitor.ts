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
  };
  preferences: {
    guidanceEnabled: boolean;
    frequencyLevel: 'high' | 'medium' | 'low';
  };
}

// Guidance scenarios for different dashboard areas
const GUIDANCE_SCENARIOS: GuidanceScenario[] = [
  // === ONBOARDING FLOW ===
  {
    id: 'first_goal_created',
    route: '/dashboard/tracker/{goalId}',
    agentId: 'advisor',
    message: 'Congratulations on creating your first goal! Ask me anything about optimizing your savings strategy or investment options.',
    priority: 'high',
    conditions: [
      { type: 'first_visit', value: true },
      { type: 'route_pattern', value: 'from_onboarding' }
    ],
    maxShowCount: 1
  },

  // === GOAL TRACKER SCENARIOS ===
  {
    id: 'tracker_main_first_visit',
    route: '/dashboard/tracker/',
    agentId: 'tracker',
    message: 'Welcome to your Goal Tracker! Click here to get help setting up your first financial goal.',
    priority: 'high',
    conditions: [
      { type: 'first_visit', value: true }
    ],
    maxShowCount: 1
  },

  {
    id: 'tracker_no_goals_return',
    route: '/dashboard/tracker/',
    agentId: 'tracker',
    message: 'Ready to start your financial journey? I can help you create a personalized savings goal!',
    priority: 'medium',
    conditions: [
      { type: 'return_visit', value: true },
      { type: 'goal_status', value: 'no_goals' },
      { type: 'time_since_last', value: 24, operator: 'gte' } // 24+ hours
    ],
    cooldownHours: 72,
    maxShowCount: 3
  },

  {
    id: 'goal_needs_attention',
    route: '/dashboard/tracker/{goalId}',
    agentId: 'advisor',
    message: 'I notice you might be falling behind on this goal. Let me help you create an action plan to get back on track!',
    priority: 'high',
    conditions: [
      { type: 'goal_status', value: 'behind_schedule' },
      { type: 'page_time', value: 5000 } // 5 seconds on page
    ],
    cooldownHours: 168, // 1 week
    maxShowCount: 2
  },

  {
    id: 'goal_milestone_celebration',
    route: '/dashboard/tracker/{goalId}',
    agentId: 'tracker',
    message: '🎉 Awesome progress! You\'re doing great. Want tips on how to accelerate your savings even more?',
    priority: 'medium',
    conditions: [
      { type: 'goal_status', value: 'milestone_reached' }
    ],
    cooldownHours: 24,
    maxShowCount: 5
  },

  // === LEARNING SCENARIOS ===
  {
    id: 'learning_first_visit',
    route: '/dashboard/learning/',
    agentId: 'educator',
    message: 'Welcome to Moneko Learning! Start with our essentials to build a solid foundation in personal finance.',
    priority: 'high',
    conditions: [
      { type: 'first_visit', value: true }
    ],
    maxShowCount: 1
  },

  {
    id: 'learning_beginner_prompt',
    route: '/dashboard/',
    agentId: 'educator',
    message: 'New to finance? Check out our learning section to master the basics before investing!',
    priority: 'medium',
    conditions: [
      { type: 'user_action', value: 'dashboard_idle_30s' },
      { type: 'route_pattern', value: 'no_learning_visited' }
    ],
    cooldownHours: 48,
    maxShowCount: 2
  },

  {
    id: 'course_completion_next',
    route: '/dashboard/learning/{courseId}',
    agentId: 'educator',
    message: 'Excellent work completing that lesson! Ready for your next learning adventure? I can help you discover more courses that build on what you just learned.',
    priority: 'medium',
    conditions: [
      { type: 'user_action', value: 'course_completed' }
    ],
    cooldownHours: 1,
    maxShowCount: 10
  },

  // === CHAT SCENARIOS ===
  {
    id: 'chat_first_time',
    route: '/dashboard/',
    agentId: 'advisor',
    message: 'Hi there! I\'m your AI Financial Advisor. Ask me about investments, budgeting, or any money questions you have!',
    priority: 'high',
    conditions: [
      { type: 'first_visit', value: true }
    ],
    maxShowCount: 1
  },

  {
    id: 'chat_encouragement',
    route: '/dashboard/',
    agentId: 'advisor',
    message: 'Got financial questions? Don\'t hesitate to chat with me - I\'m here to help with personalized advice!',
    priority: 'low',
    conditions: [
      { type: 'route_pattern', value: 'no_chat_used' },
      { type: 'time_since_last', value: 72, operator: 'gte' } // 3+ days since last dashboard visit
    ],
    cooldownHours: 168, // Weekly
    maxShowCount: 2
  },

  // === PORTFOLIO SCENARIOS ===
  {
    id: 'portfolio_first_visit',
    route: '/dashboard/portfolio/',
    agentId: 'advisor',
    message: 'Track your investments here! Connect your accounts or manually add positions to see your complete financial picture.',
    priority: 'high',
    conditions: [
      { type: 'first_visit', value: true }
    ],
    maxShowCount: 1
  },

  {
    id: 'portfolio_performance_review',
    route: '/dashboard/portfolio/',
    agentId: 'advisor',
    message: 'Want a portfolio review? I can analyze your asset allocation and suggest improvements for better diversification.',
    priority: 'medium',
    conditions: [
      { type: 'return_visit', value: true },
      { type: 'time_since_last', value: 168, operator: 'gte' } // 1+ week
    ],
    cooldownHours: 336, // 2 weeks
    maxShowCount: 3
  },

  // === TIMELINE SCENARIOS ===
  {
    id: 'timeline_explanation',
    route: '/dashboard/timeline/',
    agentId: 'tracker',
    message: 'Your financial timeline shows all your progress updates and milestones. Great way to see your journey!',
    priority: 'medium',
    conditions: [
      { type: 'first_visit', value: true }
    ],
    maxShowCount: 1
  },

  // === SETTINGS SCENARIOS ===
  {
    id: 'settings_profile_completion',
    route: '/dashboard/user-settings/',
    agentId: 'advisor',
    message: 'Complete your profile to get more personalized financial advice and goal recommendations!',
    priority: 'medium',
    conditions: [
      { type: 'user_action', value: 'profile_incomplete' }
    ],
    cooldownHours: 168,
    maxShowCount: 2
  },

  // === ADVANCED SCENARIOS ===
  {
    id: 'feature_discovery_community',
    route: '/dashboard/',
    agentId: 'educator',
    message: 'Did you know we have community courses? Learn from other members\' experiences and share your own!',
    priority: 'low',
    conditions: [
      { type: 'route_pattern', value: 'no_community_visited' },
      { type: 'time_since_last', value: 240, operator: 'gte' } // 10+ days
    ],
    cooldownHours: 336,
    maxShowCount: 1
  },

  {
    id: 'engagement_boost',
    route: '/dashboard/',
    agentId: 'tracker',
    message: 'It\'s been a while! How are your financial goals progressing? Let me help you get back on track.',
    priority: 'medium',
    conditions: [
      { type: 'time_since_last', value: 504, operator: 'gte' } // 3+ weeks
    ],
    cooldownHours: 168,
    maxShowCount: 2
  }
];

class DashboardGuidanceMonitor {
  private static instance: DashboardGuidanceMonitor;
  private currentRoute: string = '';
  private routeParams: Record<string, string> = {};
  private userState: UserGuidanceState;
  private onShowTooltip?: (agentId: AI_ID, message: string, place?: 'left' | 'right' | 'top' | 'bottom') => void;
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
    onShowTooltip: (agentId: AI_ID, message: string, place?: 'left' | 'right' | 'top' | 'bottom') => void;
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

  // Update user preferences
  updatePreferences(preferences: Partial<UserGuidanceState['preferences']>) {
    this.userState.preferences = { ...this.userState.preferences, ...preferences };
    this.saveUserState();
  }

  // Main evaluation logic
  private evaluateScenarios() {
    if (!this.userState.preferences.guidanceEnabled) return;
    if (!this.onShowTooltip) return;

    const applicableScenarios = this.getApplicableScenarios();
    
    if (applicableScenarios.length === 0) return;

    // Sort by priority and select the best one
    const selectedScenario = this.selectBestScenario(applicableScenarios);
    
    if (selectedScenario && this.shouldShowScenario(selectedScenario)) {
      this.showGuidanceTooltip(selectedScenario);
    }
  }

  private getApplicableScenarios(): GuidanceScenario[] {
    return GUIDANCE_SCENARIOS.filter(scenario => 
      this.matchesRoute(scenario.route) && 
      this.evaluateConditions(scenario.conditions)
    );
  }

  private matchesRoute(scenarioRoute: string): boolean {
    // Handle parameter routes like /dashboard/tracker/{goalId}
    const routePattern = scenarioRoute.replace(/\{[^}]+\}/g, '[^/]+');
    const regex = new RegExp(`^${routePattern}$`);
    return regex.test(this.currentRoute);
  }

  private evaluateConditions(conditions: GuidanceCondition[]): boolean {
    return conditions.every(condition => this.evaluateCondition(condition));
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
      case 'dashboard_idle_30s':
        return (Date.now() - this.pageStartTime) > 30000;
      case 'profile_incomplete':
        return true; // Would check actual profile data
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

    // Show the tooltip
    this.onShowTooltip(scenario.agentId, scenario.message, 'left');
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