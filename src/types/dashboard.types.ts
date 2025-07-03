// Dashboard types for frontend use
// These types mirror the backend types in supabase/functions/shared/dashboard-types.ts

// Database types
export interface DashboardView {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardWidget {
  id: string;
  view_id: string;
  type: string;
  title: string;
  icon: string;
  column_span: 1 | 2;
  row_span: 1 | 2;
  data: any;
  created_at: string;
  updated_at: string;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  created_at: string;
  updated_at: string;
}

// Request/Response types
export interface CreateViewFromTemplateRequest {
  templateId: string;
  viewName?: string;
  viewDescription?: string;
}

export interface CreateViewResponse {
  view: DashboardView;
  widgets: DashboardWidget[];
}

export interface UpdateViewRequest {
  viewId: string;
  name?: string;
  description?: string;
}

export interface UpdateDashboardViewWithWidgetsRequest {
  viewId: string;
  name?: string;
  description?: string;
  widgets: {
    id: string;
    title: string;
    icon: string;
    column_span: 1 | 2;
    row_span: 1 | 2;
    data: any;
  }[];
}

export interface UpdateWidgetRequest {
  widgetId: string;
  title?: string;
  icon?: string;
  column_span?: 1 | 2;
  row_span?: 1 | 2;
  data?: any;
}

export interface CreateWidgetRequest {
  viewId: string;
  type: string;
  title: string;
  icon: string;
  column_span: 1 | 2;
  row_span?: 1 | 2;
  data: any;
}

export interface ReorderWidgetsRequest {
  viewId: string;
  widgets: {
    id: string;
  }[];
}
