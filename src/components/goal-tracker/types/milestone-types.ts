// Milestone interfaces and types for goal tracking system

export type MilestoneType = 'amount' | 'habit' | 'action' | 'date';
export type MilestoneFrequency = 'daily' | 'weekly' | 'monthly' | 'one-time';
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
export type MilestonePriority = 'low' | 'medium' | 'high' | 'critical';

export interface GoalMilestone {
  id: string;
  goal_id: string;
  title: string;
  description?: string;
  milestone_type: MilestoneType;
  target_amount?: number;
  current_amount: number;
  habit_description?: string;
  frequency?: MilestoneFrequency;
  habit_target_value?: number;
  start_date: string;
  due_date: string;
  completed_date?: string;
  status: MilestoneStatus;
  progress_percentage: number;
  is_ai_generated: boolean;
  display_order: number;
  priority: MilestonePriority;
  created_at: string;
  updated_at: string;
}

// Progress tracking
export type UpdateType = 'amount_added' | 'milestone_completed' | 'manual_adjustment' | 'ai_insight';
export type UpdateSource = 'manual' | 'automatic' | 'ai_suggestion';

export interface ProgressUpdate {
  id: string;
  goal_id: string;
  milestone_id?: string;
  update_type: UpdateType;
  amount_change?: number;
  previous_amount?: number;
  new_amount?: number;
  user_note?: string;
  update_source: UpdateSource;
  created_at: string;
  created_by?: string;
}

// Milestone creation and editing
export interface CreateMilestoneRequest {
  goal_id: string;
  title: string;
  description?: string;
  milestone_type: MilestoneType;
  target_amount?: number;
  habit_description?: string;
  frequency?: MilestoneFrequency;
  habit_target_value?: number;
  due_date: string;
  priority?: MilestonePriority;
}

export interface UpdateMilestoneRequest {
  title?: string;
  description?: string;
  target_amount?: number;
  habit_description?: string;
  frequency?: MilestoneFrequency;
  habit_target_value?: number;
  due_date?: string;
  priority?: MilestonePriority;
  status?: MilestoneStatus;
  display_order?: number;
}

// Progress update requests
export interface ProgressUpdateRequest {
  goalId: string;
  milestoneId?: string;
  updateType: UpdateType;
  amountChange?: number;
  userNote?: string;
}

export interface ProgressUpdateResponse {
  success: boolean;
  goal: any; // Updated goal object
  milestone?: any; // Updated milestone if applicable
  progressUpdate: ProgressUpdate;
  metrics: {
    previousAmount: number;
    newAmount: number;
    newProgressPercentage: number;
    isOnTrack: boolean;
    progressDelta: number;
    isCompleted: boolean;
  };
  debug?: {
    message: string;
    timestamp: string;
    updateType: UpdateType;
    triggeredInsights: boolean;
  };
}

// Milestone analytics
export interface MilestoneMetrics {
  totalMilestones: number;
  completedMilestones: number;
  overdueMilestones: number;
  upcomingMilestones: number;
  completionRate: number;
  averageCompletionTime: number; // in days
}

// Milestone filtering and sorting
export interface MilestoneFilters {
  status?: MilestoneStatus[];
  milestone_type?: MilestoneType[];
  priority?: MilestonePriority[];
  is_overdue?: boolean;
  search?: string;
}

export interface MilestoneSortOptions {
  field: 'due_date' | 'created_at' | 'priority' | 'progress_percentage' | 'display_order';
  direction: 'asc' | 'desc';
}

// AI Insights for milestones
export type InsightType = 'progress_warning' | 'strategy_suggestion' | 'milestone_recommendation' | 'celebration';

export interface GoalInsight {
  id: string;
  goal_id: string;
  insight_type: InsightType;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  is_ai_generated: boolean;
  ai_confidence_score?: number;
  is_read: boolean;
  is_dismissed: boolean;
  user_feedback?: any;
  created_at: string;
  expires_at?: string;
}

export interface CreateInsightRequest {
  goal_id: string;
  insight_type: InsightType;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface InsightResponse {
  success: boolean;
  insights: GoalInsight[];
  progressAnalysis?: {
    currentProgress: number;
    daysToTarget: number;
    completedMilestones: number;
    totalMilestones: number;
    overdueMilestones: number;
    isOnTrack: boolean;
    amountRemaining: number;
    expectedProgress: number;
  };
  debug?: {
    message: string;
    timestamp: string;
    goalId: string;
    insightsCreated: number;
  };
}

// Milestone display helpers
export interface MilestoneDisplayData extends GoalMilestone {
  daysUntilDue: number;
  isOverdue: boolean;
  progressColor: string;
  statusColor: string;
  priorityColor: string;
}

// Bulk operations
export interface BulkMilestoneOperation {
  milestoneIds: string[];
  operation: 'complete' | 'delete' | 'update_priority' | 'update_due_date';
  payload?: {
    priority?: MilestonePriority;
    due_date?: string;
    status?: MilestoneStatus;
  };
}

export interface BulkOperationResponse {
  success: boolean;
  updatedCount: number;
  failedCount: number;
  errors?: string[];
}