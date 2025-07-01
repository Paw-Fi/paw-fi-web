// Dashboard types for Supabase Edge Functions

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
  widget_data: any;
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

export interface DashboardTemplateWidget {
  id: string;
  template_id: string;
  type: string;
  title: string;
  icon: string;
  column_span: 1 | 2;
  row_span: 1 | 2;
  widget_data: any;
  created_at: string;
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

export interface UpdateWidgetRequest {
  widgetId: string;
  title?: string;
  icon?: string;
  column_span?: 1 | 2;
  row_span?: 1 | 2;
  widget_data?: any;
}

export interface CreateWidgetRequest {
  viewId: string;
  type: string;
  title: string;
  icon: string;
  column_span: 1 | 2;
  row_span?: 1 | 2;
  widget_data: any;
}

export interface ReorderWidgetsRequest {
  viewId: string;
  widgets: {
    id: string;
  }[];
}
