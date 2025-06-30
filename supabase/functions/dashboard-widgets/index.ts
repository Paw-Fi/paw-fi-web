// Supabase Edge Function for dashboard widgets management
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";
import { corsHeaders } from "../shared/cors.ts";

console.log(`Function "dashboard-widgets" up and running!`);

// Types for dashboard widgets
interface DashboardWidget {
  id?: string;
  view_id: string;
  widget_id: string;
  widget_type: string;
  title: string;
  icon?: string;
  column_span: number;
  row_span: number;
  position_x: number;
  position_y: number;
  widget_data: any;
  created_at?: string;
  updated_at?: string;
}

interface CreateWidgetRequest {
  viewId: string;
  widget: {
    widget_id: string;
    widget_type: string;
    title: string;
    icon?: string;
    column_span: number;
    row_span: number;
    position_x: number;
    position_y: number;
    widget_data: any;
  };
}

interface UpdateWidgetRequest {
  title?: string;
  icon?: string;
  column_span?: number;
  row_span?: number;
  position_x?: number;
  position_y?: number;
  widget_data?: any;
}

interface ReorderWidgetsRequest {
  viewId: string;
  widgets: {
    id: string;
    position_x: number;
    position_y: number;
  }[];
}

// Helper function to create error response
function createErrorResponse(
  status: number, 
  error: string, 
  details?: unknown,
  headers: Record<string, string> = { ...corsHeaders, 'Content-Type': 'application/json' }
): Response {
  const response: { error: string; details?: unknown } = { error };
  
  if (details) {
    response.details = details;
    console.error(`Error (${status}): ${error}`, details);
  } else {
    console.error(`Error (${status}): ${error}`);
  }
  
  return new Response(
    JSON.stringify(response),
    { status, headers }
  );
}

// Add Deno namespace declaration for TypeScript
declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
  }
  export const env: Env;
  export function serve(handler: (req: Request) => Promise<Response> | Response): void;
}

// Helper function to validate required environment variables
function validateEnv(): { supabaseUrl: string; supabaseKey: string } {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  
  return { supabaseUrl, supabaseKey };
}

// Create and configure Supabase client
function createSupabaseClient(supabaseUrl: string, supabaseKey: string) {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'X-Client-Info': 'paw-fi-dashboard-widgets-function'
      }
    }
  });
}

// Main function handler
Deno.serve(async (req: Request) => {
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { 
        headers: { ...corsHeaders }
      });
    }

    // Add CORS headers to all responses
    const headers = {
      ...corsHeaders,
      'Content-Type': 'application/json'
    };
    
    // Log the request for debugging
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    
    // Validate request method
    if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'DELETE') {
      return createErrorResponse(
        405, 
        'Method not allowed', 
        `Method ${req.method} not allowed for this endpoint`,
        { ...headers, 'Allow': 'GET, POST, PUT, DELETE, OPTIONS' }
      );
    }

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse(401, 'No authorization header provided', null, headers);
    }

    // Get the JWT token from the authorization header
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return createErrorResponse(401, 'Invalid token format', null, headers);
    }

    // Validate environment variables
    const { supabaseUrl, supabaseKey } = validateEnv();
    
    // Create a Supabase client with the service role key
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

    // Get the user from the JWT token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return createErrorResponse(401, 'Invalid or expired token', userError, headers);
    }

    const userId = user.id;

    // Get the request URL
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();
    
    // Handle different HTTP methods
    if (req.method === "GET") {
      const viewId = url.searchParams.get("viewId");
      const widgetId = path && path !== "dashboard-widgets" ? path : null;
      
      if (viewId) {
        // Get all widgets for a view
        return await getWidgetsByViewId(supabase, userId, viewId, headers);
      } else if (widgetId) {
        // Get a specific widget by ID
        return await getWidgetById(supabase, userId, widgetId, headers);
      } else {
        return createErrorResponse(400, "Missing viewId or widgetId parameter", null, headers);
      }
    } else if (req.method === "POST") {
      // Parse request body
      const requestData = await req.json();
      console.log('POST request data:', requestData);
      
      // New action-based approach
      const action = requestData.action;
      
      if (action === "create") {
        // Create a new widget
        return await createWidget(supabase, userId, requestData, headers);
      } else if (action === "reorder") {
        // Reorder widgets
        return await reorderWidgets(supabase, userId, requestData, headers);
      } else if (path === "create") {
        // Legacy path-based approach (for backward compatibility)
        return await createWidget(supabase, userId, requestData, headers);
      } else if (path === "reorder") {
        // Legacy path-based approach (for backward compatibility)
        return await reorderWidgets(supabase, userId, requestData, headers);
      } else {
        return createErrorResponse(
          400,
          "Invalid action or endpoint for POST. Use 'action' parameter with 'create' or 'reorder'",
          null,
          headers
        );
      }
    } else if (req.method === "PUT") {
      // Parse request body
      const requestData = await req.json();
      console.log('PUT request data:', requestData);
      
      // New action-based approach
      const action = requestData.action;
      const widgetId = requestData.widgetId || path;
      
      if (!widgetId) {
        return createErrorResponse(400, "Missing widgetId parameter", null, headers);
      }
      
      if (action === "update") {
        // Update a widget
        return await updateWidget(supabase, userId, widgetId, requestData, headers);
      } else if (path && path !== "dashboard-widgets") {
        // Legacy path-based approach (for backward compatibility)
        return await updateWidget(supabase, userId, path, requestData, headers);
      } else {
        return createErrorResponse(
          400,
          "Invalid action or endpoint for PUT. Use 'action' parameter with 'update'",
          null,
          headers
        );
      }
    } else if (req.method === "DELETE") {
      // Parse request body
      const requestData = await req.json();
      console.log('DELETE request data:', requestData);
      
      // New action-based approach
      const action = requestData.action;
      const widgetId = requestData.widgetId || path;
      
      if (!widgetId) {
        return createErrorResponse(400, "Missing widgetId parameter", null, headers);
      }
      
      if (action === "delete") {
        // Delete a widget
        return await deleteWidget(supabase, userId, widgetId, headers);
      } else if (path && path !== "dashboard-widgets") {
        // Legacy path-based approach (for backward compatibility)
        return await deleteWidget(supabase, userId, path, headers);
      } else {
        return createErrorResponse(
          400,
          "Invalid action or endpoint for DELETE. Use 'action' parameter with 'delete'",
          null,
          headers
        );
      }
    }
    
    return createErrorResponse(405, "Method not allowed", null, headers);
  } catch (error) {
    console.error('Unhandled error in dashboard-widgets function:', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
});

// Function to get all widgets for a view
async function getWidgetsByViewId(supabase: any, userId: string, viewId: string, headers: Record<string, string>) {
  try {
    // Verify that the view belongs to the user
    const { data: view, error: viewError } = await supabase
      .from('dashboard_views')
      .select('id')
      .eq('id', viewId)
      .eq('user_id', userId)
      .single();

    if (viewError) {
      return createErrorResponse(404, 'View not found or access denied', viewError, headers);
    }

    // Get all widgets for this view
    const { data: widgets, error: widgetsError } = await supabase
      .from('dashboard_widgets')
      .select('*')
      .eq('view_id', viewId)
      .order('position_y', { ascending: true })
      .order('position_x', { ascending: true });

    if (widgetsError) {
      return createErrorResponse(500, 'Failed to fetch dashboard widgets', widgetsError, headers);
    }

    return new Response(
      JSON.stringify(widgets || []),
      {
        status: 200,
        headers
      }
    );
  } catch (error) {
    return createErrorResponse(500, 'Error fetching dashboard widgets', error, headers);
  }
}

// Function to get a specific widget by ID
async function getWidgetById(supabase: any, userId: string, widgetId: string, headers: Record<string, string>) {
  try {
    // Verify that the widget belongs to the user
    const { data: widget, error } = await supabase
      .from('dashboard_widgets')
      .select('*, dashboard_views!inner(user_id)')
      .eq('id', widgetId)
      .eq('dashboard_views.user_id', userId)
      .single();

    if (error) {
      return createErrorResponse(404, 'Widget not found or access denied', error, headers);
    }

    return new Response(
      JSON.stringify(widget),
      {
        status: 200,
        headers
      }
    );
  } catch (error) {
    return createErrorResponse(500, 'Error fetching dashboard widget', error, headers);
  }
}

// Function to create a new widget
async function createWidget(
  supabase: any,
  userId: string,
  request: CreateWidgetRequest,
  headers: Record<string, string>
) {
  try {
    const { viewId, widget } = request;

    if (!viewId) {
      return createErrorResponse(400, 'View ID is required', null, headers);
    }

    if (!widget) {
      return createErrorResponse(400, 'Widget data is required', null, headers);
    }

    // Verify that the view belongs to the user
    const { data: view, error: viewError } = await supabase
      .from('dashboard_views')
      .select('id')
      .eq('id', viewId)
      .eq('user_id', userId)
      .single();

    if (viewError) {
      return createErrorResponse(404, 'View not found or access denied', viewError, headers);
    }

    // Create the widget
    const { data: createdWidget, error } = await supabase
      .from('dashboard_widgets')
      .insert({
        view_id: viewId,
        widget_id: widget.widget_id,
        widget_type: widget.widget_type,
        title: widget.title,
        icon: widget.icon,
        column_span: widget.column_span,
        row_span: widget.row_span || 1,
        position_x: widget.position_x,
        position_y: widget.position_y,
        widget_data: widget.widget_data
      })
      .select()
      .single();

    if (error) {
      return createErrorResponse(500, 'Failed to create dashboard widget', error, headers);
    }

    return new Response(
      JSON.stringify(createdWidget),
      {
        status: 201,
        headers
      }
    );
  } catch (error) {
    return createErrorResponse(500, 'Error creating dashboard widget', error, headers);
  }
}

// Function to update a widget
async function updateWidget(
  supabase: any,
  userId: string,
  widgetId: string,
  request: UpdateWidgetRequest,
  headers: Record<string, string>
) {
  try {
    const { title, icon, column_span, row_span, position_x, position_y, widget_data } = request;

    // Verify that the widget belongs to the user
    const { data: widget, error: widgetError } = await supabase
      .from('dashboard_widgets')
      .select('*, dashboard_views!inner(user_id)')
      .eq('id', widgetId)
      .eq('dashboard_views.user_id', userId)
      .single();

    if (widgetError) {
      return createErrorResponse(404, 'Widget not found or access denied', widgetError, headers);
    }

    // Prepare update data
    const updateData: Record<string, any> = {};
    if (title !== undefined) updateData.title = title;
    if (icon !== undefined) updateData.icon = icon;
    if (column_span !== undefined) updateData.column_span = column_span;
    if (row_span !== undefined) updateData.row_span = row_span;
    if (position_x !== undefined) updateData.position_x = position_x;
    if (position_y !== undefined) updateData.position_y = position_y;
    if (widget_data !== undefined) updateData.widget_data = widget_data;

    // Update the widget
    const { data: updatedWidget, error } = await supabase
      .from('dashboard_widgets')
      .update(updateData)
      .eq('id', widgetId)
      .select()
      .single();

    if (error) {
      return createErrorResponse(500, 'Failed to update dashboard widget', error, headers);
    }

    return new Response(
      JSON.stringify(updatedWidget),
      {
        status: 200,
        headers
      }
    );
  } catch (error) {
    return createErrorResponse(500, 'Error updating dashboard widget', error, headers);
  }
}

// Function to delete a widget
async function deleteWidget(
  supabase: any,
  userId: string,
  widgetId: string,
  headers: Record<string, string>
) {
  try {
    // Verify that the widget belongs to the user
    const { data: widget, error: widgetError } = await supabase
      .from('dashboard_widgets')
      .select('*, dashboard_views!inner(user_id)')
      .eq('id', widgetId)
      .eq('dashboard_views.user_id', userId)
      .single();

    if (widgetError) {
      return createErrorResponse(404, 'Widget not found or access denied', widgetError, headers);
    }

    // Delete the widget
    const { error } = await supabase
      .from('dashboard_widgets')
      .delete()
      .eq('id', widgetId);

    if (error) {
      return createErrorResponse(500, 'Failed to delete dashboard widget', error, headers);
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers
      }
    );
  } catch (error) {
    return createErrorResponse(500, 'Error deleting dashboard widget', error, headers);
  }
}

// Function to reorder widgets
async function reorderWidgets(
  supabase: any,
  userId: string,
  request: ReorderWidgetsRequest,
  headers: Record<string, string>
) {
  try {
    const { viewId, widgets } = request;

    if (!viewId) {
      return createErrorResponse(400, 'View ID is required', null, headers);
    }

    if (!widgets || !Array.isArray(widgets) || widgets.length === 0) {
      return createErrorResponse(400, 'Widgets array is required', null, headers);
    }

    // Verify that the view belongs to the user
    const { data: view, error: viewError } = await supabase
      .from('dashboard_views')
      .select('id')
      .eq('id', viewId)
      .eq('user_id', userId)
      .single();

    if (viewError) {
      return createErrorResponse(404, 'View not found or access denied', viewError, headers);
    }

    // Update each widget's position
    const updatePromises = widgets.map(({ id, position_x, position_y }) => {
      return supabase
        .from('dashboard_widgets')
        .update({ position_x, position_y })
        .eq('id', id)
        .eq('view_id', viewId);
    });

    try {
      await Promise.all(updatePromises);

      // Get the updated widgets
      const { data: updatedWidgets, error } = await supabase
        .from('dashboard_widgets')
        .select('*')
        .eq('view_id', viewId)
        .order('position_y', { ascending: true })
        .order('position_x', { ascending: true });

      if (error) {
        return createErrorResponse(500, 'Failed to fetch updated widgets', error, headers);
      }

      return new Response(
        JSON.stringify({ widgets: updatedWidgets }),
        {
          status: 200,
          headers
        }
      );
    } catch (error) {
      return createErrorResponse(500, 'Error reordering dashboard widgets', error, headers);
    }
  } catch (error) {
    return createErrorResponse(500, 'Error reordering dashboard widgets', error, headers);
  }
}
