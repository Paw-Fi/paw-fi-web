import { supabase } from '@/lib/supabase';
import { Widget } from '@/components/profile/types/dashboard-data.typings';
import { 
  DashboardView, 
  DashboardWidget, 
  CreateViewFromTemplateRequest,
  UpdateViewRequest,
  UpdateWidgetRequest,
  CreateWidgetRequest,
  ReorderWidgetsRequest
} from '@/types/dashboard.types';
import { 
  useMutation,
  useQuery,
  useQueryClient,
  UseMutationOptions,
  UseQueryOptions 
} from '@tanstack/react-query';

/**
 * API functions for dashboard views and widgets
 */

/**
 * Query keys for TanStack Query
 */
export const dashboardKeys = {
  all: ['dashboard'] as const,
  views: (userId: string) => [...dashboardKeys.all, 'views', userId] as const,
  view: (userId: string, viewId: string) => [...dashboardKeys.views(userId), viewId] as const,
  defaultView: (userId: string) => [...dashboardKeys.views(userId), 'default'] as const,
  templates: ['dashboard', 'templates'] as const,
  widgets: (userId: string, viewId: string) => [...dashboardKeys.view(userId, viewId), 'widgets'] as const,
  widget: (userId: string, widgetId: string) => [...dashboardKeys.all, 'widgets', userId, widgetId] as const,
};

/**
 * Get all dashboard views for a user
 */
async function fetchAllDashboardViews(userId: string) {
  const { data, error } = await supabase.functions.invoke('dashboard-views', {
    method: 'POST',
    body: {
      action: 'get-all',
      userId
    }
  });

  if (error) {
    throw new Error(`Failed to fetch dashboard views: ${error.message}`);
  }

  return data.views as DashboardView[];
}

/**
 * React hook for getting all dashboard views
 */
export function useAllDashboardViews(
  userId: string,
  options?: Omit<UseQueryOptions<DashboardView[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: dashboardKeys.views(userId),
    queryFn: () => fetchAllDashboardViews(userId),
    ...options
  });
}

// Keep the original function for backward compatibility
export async function getAllDashboardViews(userId: string) {
  return fetchAllDashboardViews(userId);
}

/**
 * Get a specific dashboard view by ID
 */
async function fetchDashboardViewById(userId: string, viewId: string) {
  const { data, error } = await supabase.functions.invoke('dashboard-views', {
    method: 'POST',
    body: {
      action: 'get-by-id',
      userId,
      viewId
    }
  });

  if (error) {
    throw new Error(`Failed to fetch dashboard view: ${error.message}`);
  }

  return {
    view: data.view as DashboardView,
    widgets: data.widgets as DashboardWidget[]
  };
}

/**
 * React hook for getting a specific dashboard view
 */
export function useDashboardViewById(
  userId: string,
  viewId: string,
  options?: Omit<UseQueryOptions<
    { view: DashboardView; widgets: DashboardWidget[] },
    Error
  >, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: dashboardKeys.view(userId, viewId),
    queryFn: () => fetchDashboardViewById(userId, viewId),
    ...options
  });
}

// Keep the original function for backward compatibility
export async function getDashboardViewById(userId: string, viewId: string) {
  return fetchDashboardViewById(userId, viewId);
}

/**
 * Get the default dashboard view for a user
 */
async function fetchDefaultDashboardView(userId: string) {
  const { data, error } = await supabase.functions.invoke('dashboard-views', {
    method: 'POST',
    body: {
      action: 'get-default',
      userId
    }
  });

  if (error) {
    throw new Error(`Failed to fetch default dashboard view: ${error.message}`);
  }

  return {
    view: data.view as DashboardView,
    widgets: data.widgets as DashboardWidget[]
  };
}

/**
 * React hook for getting the default dashboard view
 */
export function useDefaultDashboardView(
  userId: string,
  options?: Omit<UseQueryOptions<
    { view: DashboardView; widgets: DashboardWidget[] },
    Error
  >, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: dashboardKeys.defaultView(userId),
    queryFn: () => fetchDefaultDashboardView(userId),
    ...options
  });
}

// Keep the original function for backward compatibility
export async function getDefaultDashboardView(userId: string) {
  return fetchDefaultDashboardView(userId);
}

/**
 * Create a new dashboard view from a template
 */
async function createViewFromTemplate(
  userId: string,
  request: CreateViewFromTemplateRequest
) {
  const { data, error } = await supabase.functions.invoke('dashboard-views', {
    method: 'POST',
    body: {
      action: 'create-from-template',
      userId,
      ...request
    }
  });

  if (error) {
    throw new Error(`Failed to create dashboard view: ${error.message}`);
  }

  return data;
}

/**
 * React hook for creating a dashboard view from template
 */
export function useCreateDashboardViewFromTemplate(
  options?: UseMutationOptions<
    any,
    Error,
    { userId: string; request: CreateViewFromTemplateRequest }
  >
) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, request }: { userId: string; request: CreateViewFromTemplateRequest }) => 
      createViewFromTemplate(userId, request),
    onSuccess: (_, { userId }) => {
      // Invalidate views queries to refetch
      queryClient.invalidateQueries({ queryKey: dashboardKeys.views(userId) });
    },
    ...options
  });
}

// Keep the original function for backward compatibility
export async function createDashboardViewFromTemplate(
  userId: string,
  request: CreateViewFromTemplateRequest
) {
  return createViewFromTemplate(userId, request);
}

/**
 * Update a dashboard view
 */
export async function updateDashboardView(
  userId: string,
  viewId: string,
  request: UpdateViewRequest
) {
  // Destructure viewId from request to avoid duplicate property in body
  const { viewId: _, ...requestData } = request;
  
  const { data, error } = await supabase.functions.invoke('dashboard-views', {
    method: 'PUT',
    body: {
      action: 'update',
      userId,
      viewId,
      ...requestData
    }
  });

  if (error) {
    throw new Error(`Failed to update dashboard view: ${error.message}`);
  }

  return data;
}

/**
 * Delete a dashboard view
 */
export async function deleteDashboardView(userId: string, viewId: string) {
  const { data, error } = await supabase.functions.invoke('dashboard-views', {
    method: 'DELETE',
    body: {
      action: 'delete',
      userId,
      viewId
    }
  });

  if (error) {
    throw new Error(`Failed to delete dashboard view: ${error.message}`);
  }

  return data;
}

/**
 * Update a dashboard widget
 */
export async function updateDashboardWidget(
  userId: string,
  widgetId: string,
  request: UpdateWidgetRequest
) {
  const { data, error } = await supabase.functions.invoke('dashboard-widgets', {
    method: 'PUT',
    body: {
      action: 'update',
      userId,
      widgetId,
      ...request
    }
  });

  if (error) {
    throw new Error(`Failed to update dashboard widget: ${error.message}`);
  }

  return data;
}

/**
 * Create a new dashboard widget
 */
async function createWidget(
  userId: string,
  request: CreateWidgetRequest
) {
  const { data, error } = await supabase.functions.invoke('dashboard-widgets', {
    method: 'POST',
    body: {
      action: 'create',
      userId,
      ...request
    }
  });

  if (error) {
    throw new Error(`Failed to create dashboard widget: ${error.message}`);
  }

  return data;
}

/**
 * React hook for creating a dashboard widget
 */
export function useCreateDashboardWidget(
  options?: UseMutationOptions<
    any,
    Error,
    { userId: string; request: CreateWidgetRequest }
  >
) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, request }: { userId: string; request: CreateWidgetRequest }) => 
      createWidget(userId, request),
    onSuccess: (_, { userId, request }) => {
      // Invalidate the specific view query to refetch widgets
      if (request.viewId) {
        queryClient.invalidateQueries({ 
          queryKey: dashboardKeys.view(userId, request.viewId)
        });
      }
    },
    ...options
  });
}

// Keep the original function for backward compatibility
export async function createDashboardWidget(
  userId: string,
  request: CreateWidgetRequest
) {
  return createWidget(userId, request);
}

/**
 * Delete a dashboard widget
 */
export async function deleteDashboardWidget(userId: string, widgetId: string) {
  const { data, error } = await supabase.functions.invoke('dashboard-widgets', {
    method: 'DELETE',
    body: {
      action: 'delete',
      userId,
      widgetId
    }
  });

  if (error) {
    throw new Error(`Failed to delete dashboard widget: ${error.message}`);
  }

  return data;
}

/**
 * Reorder dashboard widgets
 */
export async function reorderDashboardWidgets(
  userId: string,
  request: ReorderWidgetsRequest
) {
  const { data, error } = await supabase.functions.invoke('dashboard-widgets', {
    method: 'PUT',
    body: {
      action: 'reorder',
      userId,
      ...request
    }
  });

  if (error) {
    throw new Error(`Failed to reorder dashboard widgets: ${error.message}`);
  }

  return data;
}

/**
 * Get all available dashboard templates
 */
async function fetchAllDashboardTemplates() {
  const { data, error } = await supabase.functions.invoke('dashboard-templates', {
    method: 'GET'
  });

  if (error) {
    throw new Error(`Failed to fetch dashboard templates: ${error.message}`);
  }

  return data;
}

/**
 * React hook for getting all dashboard templates
 */
export function useAllDashboardTemplates(
  options?: Omit<UseQueryOptions<any, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: dashboardKeys.templates,
    queryFn: fetchAllDashboardTemplates,
    ...options
  });
}

// Keep the original function for backward compatibility
export async function getAllDashboardTemplates() {
  return fetchAllDashboardTemplates();
}

/**
 * Convert backend DashboardWidget to frontend Widget
 */
export function convertDashboardWidgetToWidget(widget: DashboardWidget): Widget {
  return {
    id: widget.widget_id,
    title: widget.title,
    icon: widget.icon,
    columnSpan: widget.column_span,
    rowSpan: widget.row_span || 1,
    type: widget.widget_type as any,
    data: widget.widget_data,
    position: {
      x: widget.position_x,
      y: widget.position_y
    }
  };
}

/**
 * Convert frontend Widget to backend DashboardWidget
 */
export function convertWidgetToDashboardWidget(widget: Widget, viewId: string): Omit<DashboardWidget, 'id' | 'created_at' | 'updated_at'> {
  return {
    view_id: viewId,
    widget_id: widget.id,
    widget_type: widget.type,
    title: widget.title,
    icon: widget.icon,
    column_span: widget.columnSpan,
    row_span: widget.rowSpan || 1,
    position_x: widget.position?.x || 0,
    position_y: widget.position?.y || 0,
    widget_data: widget.data
  };
}
