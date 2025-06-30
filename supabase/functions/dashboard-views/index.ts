// Supabase Edge Function for dashboard views management
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";
import { corsHeaders } from "../shared/cors.ts";
import { getTemplateById } from "../shared/template-loader.ts";

console.log(`Function "dashboard-views" up and running!`);

// Types for dashboard views
interface DashboardView {
  id?: string;
  user_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

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

interface CreateViewFromTemplateRequest {
  templateId: string;
  viewName: string;
  isDefault: boolean;
  action?: string;
  userId?: string;
}

interface CreateViewRequest {
  name: string;
  description?: string;
  isDefault: boolean;
}

interface UpdateViewRequest {
  name?: string;
  description?: string;
  isDefault?: boolean;
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

// Helper function to validate required environment variables
function validateEnv(): { supabaseUrl: string; supabaseKey: string } {
  // @ts-ignore: Deno namespace is available in Supabase Edge Functions
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  // @ts-ignore: Deno namespace is available in Supabase Edge Functions
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
        'X-Client-Info': 'paw-fi-dashboard-views-function'
      }
    }
  });
}

// Main function handler
// @ts-ignore: Deno namespace is available in Supabase Edge Functions
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
    
    // Parse the request body if it exists
    let requestData: any = {};
    if (req.body) {
      try {
        requestData = await req.json();
      } catch (e) {
        return createErrorResponse(400, 'Invalid JSON in request body', e, headers);
      }
    }

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

    // Handle different request paths and methods
    const url = new URL(req.url);
    const path = url.pathname.split('/').filter(Boolean);
    const pathAction = path[1]; // e.g., /dashboard-views/create-from-template -> create-from-template
    
    // Support both path-based and action parameter-based routing
    const action = requestData.action || pathAction;

    // Handle the different actions
    switch (action) {
      case 'create-from-template':
        return await handleCreateFromTemplate(req.method, requestData, supabase, headers);
      case 'update':
        return await handleUpdate(req.method, requestData, supabase, headers);
      case 'delete':
        return await handleDelete(req.method, requestData, supabase, headers);
      case 'get-all':
        return await handleGetAll(requestData, supabase, headers);
      case 'get-by-id':
        return await handleGetById(requestData, supabase, headers);
      case 'get-default':
        return await handleGetDefault(requestData, supabase, headers);
      default:
        // If no specific action is provided, handle based on HTTP method
        switch (req.method) {
          case 'GET':
            return await handleGet(url, supabase, headers);
          case 'POST':
            return await handleCreate(requestData, supabase, headers);
          case 'PUT':
            return await handleUpdate(req.method, requestData, supabase, headers);
          case 'DELETE':
            return await handleDelete(req.method, requestData, supabase, headers);
          default:
            return createErrorResponse(405, 'Method not allowed', null, headers);
        }
    }
  } catch (error) {
    console.error('Unhandled error in dashboard-views function:', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
});

// Handler for getting all dashboard views for a user
async function handleGetAll(
  requestData: any,
  supabase: any,
  headers: Record<string, string>
): Promise<Response> {
  try {
    const { userId } = requestData;
    
    if (!userId) {
      return createErrorResponse(400, 'Missing userId parameter', null, headers);
    }
    
    // Get all views for the user
    const { data: views, error } = await supabase
      .from('dashboard_views')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
      
    if (error) {
      return createErrorResponse(500, 'Failed to fetch dashboard views', error, headers);
    }
    
    return new Response(
      JSON.stringify({ views }),
      { status: 200, headers }
    );
  } catch (error) {
    return createErrorResponse(500, 'Error getting dashboard views', error, headers);
  }
}

// Handler for getting a specific dashboard view by ID
async function handleGetById(
  requestData: any,
  supabase: any,
  headers: Record<string, string>
): Promise<Response> {
  try {
    const { userId, viewId } = requestData;
    
    if (!userId || !viewId) {
      return createErrorResponse(400, 'Missing userId or viewId parameter', null, headers);
    }
    
    // Get the view
    const { data: view, error: viewError } = await supabase
      .from('dashboard_views')
      .select('*')
      .eq('id', viewId)
      .eq('user_id', userId)
      .single();
      
    if (viewError) {
      return createErrorResponse(404, 'Dashboard view not found', viewError, headers);
    }
    
    // Get the widgets for this view
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
      JSON.stringify({ view, widgets }),
      { status: 200, headers }
    );
  } catch (error) {
    return createErrorResponse(500, 'Error getting dashboard view', error, headers);
  }
}

// Handler for getting the default dashboard view for a user
async function handleGetDefault(
  requestData: any,
  supabase: any,
  headers: Record<string, string>
): Promise<Response> {
  try {
    const { userId } = requestData;
    
    if (!userId) {
      return createErrorResponse(400, 'Missing userId parameter', null, headers);
    }
    
    // Get the default view
    const { data: view, error: viewError } = await supabase
      .from('dashboard_views')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single();
      
    if (viewError) {
      // If no default view is found, get the most recent view
      const { data: recentView, error: recentViewError } = await supabase
        .from('dashboard_views')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (recentViewError) {
        return createErrorResponse(404, 'No dashboard views found for user', recentViewError, headers);
      }
      
      // Get the widgets for this view
      const { data: widgets, error: widgetsError } = await supabase
        .from('dashboard_widgets')
        .select('*')
        .eq('view_id', recentView.id)
        .order('position_y', { ascending: true })
        .order('position_x', { ascending: true });
        
      if (widgetsError) {
        return createErrorResponse(500, 'Failed to fetch dashboard widgets', widgetsError, headers);
      }
      
      return new Response(
        JSON.stringify({ view: recentView, widgets }),
        { status: 200, headers }
      );
    }
    
    // Get the widgets for the default view
    const { data: widgets, error: widgetsError } = await supabase
      .from('dashboard_widgets')
      .select('*')
      .eq('view_id', view.id)
      .order('position_y', { ascending: true })
      .order('position_x', { ascending: true });
      
    if (widgetsError) {
      return createErrorResponse(500, 'Failed to fetch dashboard widgets', widgetsError, headers);
    }
    
    return new Response(
      JSON.stringify({ view, widgets }),
      { status: 200, headers }
    );
  } catch (error) {
    return createErrorResponse(500, 'Error getting default dashboard view', error, headers);
  }
}

// Handler for creating a dashboard view from a template
async function handleCreateFromTemplate(
  method: string,
  requestData: any,
  supabase: any,
  headers: Record<string, string>
): Promise<Response> {
  try {
    if (method !== 'POST') {
      return createErrorResponse(405, 'Method not allowed', `Method ${method} not allowed for create-from-template`, headers);
    }
    
    const { userId, templateId, viewName, isDefault = false } = requestData;
    
    if (!userId || !templateId || !viewName) {
      return createErrorResponse(400, 'Missing required parameters', 'userId, templateId, and viewName are required', headers);
    }
    
    // Get the template
    const template = await getTemplateById(templateId);
    if (!template) {
      return createErrorResponse(404, 'Template not found', `Template with ID ${templateId} not found`, headers);
    }
    
    // Create the view
    const { data: view, error: viewError } = await supabase
      .from('dashboard_views')
      .insert([
        {
          user_id: userId,
          name: viewName,
          description: template.info?.description || '',
          is_default: isDefault
        }
      ])
      .select()
      .single();
      
    if (viewError) {
      return createErrorResponse(500, 'Failed to create dashboard view', viewError, headers);
    }
    
    // Create the widgets
    const widgetInserts = template.widgets.map((widget: any) => ({
      view_id: view.id,
      widget_id: widget.id,
      widget_type: widget.type,
      title: widget.title,
      icon: widget.icon,
      column_span: widget.columnSpan,
      row_span: widget.rowSpan || 1,
      position_x: widget.position?.x || 0,
      position_y: widget.position?.y || 0,
      widget_data: widget.data
    }));
    
    const { data: widgets, error: widgetsError } = await supabase
      .from('dashboard_widgets')
      .insert(widgetInserts)
      .select();
      
    if (widgetsError) {
      return createErrorResponse(500, 'Failed to create dashboard widgets', widgetsError, headers);
    }
    
    return new Response(
      JSON.stringify({ view, widgets }),
      { status: 201, headers }
    );
  } catch (error) {
    return createErrorResponse(500, 'Error creating dashboard view from template', error, headers);
  }
}

// Handler for updating a dashboard view
async function handleUpdate(
  method: string,
  requestData: any,
  supabase: any,
  headers: Record<string, string>
): Promise<Response> {
  try {
    if (method !== 'PUT') {
      return createErrorResponse(405, 'Method not allowed', `Method ${method} not allowed for update`, headers);
    }
    
    const { userId, viewId, name, description, isDefault } = requestData;
    
    if (!userId || !viewId) {
      return createErrorResponse(400, 'Missing required parameters', 'userId and viewId are required', headers);
    }
    
    // Check if the view exists and belongs to the user
    const { data: existingView, error: checkError } = await supabase
      .from('dashboard_views')
      .select('id')
      .eq('id', viewId)
      .eq('user_id', userId)
      .single();
      
    if (checkError) {
      return createErrorResponse(404, 'Dashboard view not found', checkError, headers);
    }
    
    // Update the view
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isDefault !== undefined) updateData.is_default = isDefault;
    
    const { data: view, error: updateError } = await supabase
      .from('dashboard_views')
      .update(updateData)
      .eq('id', viewId)
      .eq('user_id', userId)
      .select()
      .single();
      
    if (updateError) {
      return createErrorResponse(500, 'Failed to update dashboard view', updateError, headers);
    }
    
    // If this view is set as default, unset default flag on all other views
    if (isDefault) {
      await supabase
        .from('dashboard_views')
        .update({ is_default: false })
        .eq('user_id', userId)
        .neq('id', viewId);
    }
    
    return new Response(
      JSON.stringify({ view }),
      { status: 200, headers }
    );
  } catch (error) {
    return createErrorResponse(500, 'Error updating dashboard view', error, headers);
  }
}

// Handler for deleting a dashboard view
async function handleDelete(
  method: string,
  requestData: any,
  supabase: any,
  headers: Record<string, string>
): Promise<Response> {
  try {
    if (method !== 'DELETE') {
      return createErrorResponse(405, 'Method not allowed', `Method ${method} not allowed for delete`, headers);
    }
    
    const { userId, viewId } = requestData;
    
    if (!userId || !viewId) {
      return createErrorResponse(400, 'Missing required parameters', 'userId and viewId are required', headers);
    }
    
    // Check if the view exists and belongs to the user
    const { data: existingView, error: checkError } = await supabase
      .from('dashboard_views')
      .select('id, is_default')
      .eq('id', viewId)
      .eq('user_id', userId)
      .single();
      
    if (checkError) {
      return createErrorResponse(404, 'Dashboard view not found', checkError, headers);
    }
    
    // Check if this is the only view for the user
    const { count, error: countError } = await supabase
      .from('dashboard_views')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
      
    if (countError) {
      return createErrorResponse(500, 'Failed to check dashboard view count', countError, headers);
    }
    
    if (count === 1) {
      return createErrorResponse(400, 'Cannot delete the only dashboard view', 'User must have at least one dashboard view', headers);
    }
    
    // Delete the widgets first
    const { error: widgetsError } = await supabase
      .from('dashboard_widgets')
      .delete()
      .eq('view_id', viewId);
      
    if (widgetsError) {
      return createErrorResponse(500, 'Failed to delete dashboard widgets', widgetsError, headers);
    }
    
    // Delete the view
    const { error: viewError } = await supabase
      .from('dashboard_views')
      .delete()
      .eq('id', viewId)
      .eq('user_id', userId);
      
    if (viewError) {
      return createErrorResponse(500, 'Failed to delete dashboard view', viewError, headers);
    }
    
    // If the deleted view was the default, set another view as default
    if (existingView.is_default) {
      const { data: otherView, error: otherViewError } = await supabase
        .from('dashboard_views')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (!otherViewError && otherView) {
        await supabase
          .from('dashboard_views')
          .update({ is_default: true })
          .eq('id', otherView.id);
      }
    }
    
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers }
    );
  } catch (error) {
    return createErrorResponse(500, 'Error deleting dashboard view', error, headers);
  }
}

// Handler for GET requests
async function handleGet(
  url: URL,
  supabase: any,
  headers: Record<string, string>
): Promise<Response> {
  try {
    // Legacy path-based routing
    const path = url.pathname.split('/').filter(Boolean);
    const action = path[1]; // e.g., /dashboard-views/default -> default
    
    if (action === 'default') {
      // Get the default view for the user
      return createErrorResponse(400, 'Missing userId parameter', 'Use POST with action=get-default instead', headers);
    } else if (action === 'all') {
      // Get all views for the user
      return createErrorResponse(400, 'Missing userId parameter', 'Use POST with action=get-all instead', headers);
    } else if (action && action !== 'dashboard-views') {
      // Get a specific view by ID
      return createErrorResponse(400, 'Missing userId parameter', 'Use POST with action=get-by-id instead', headers);
    } else {
      // No specific action
      return createErrorResponse(400, 'Invalid request', 'Use POST with appropriate action parameter', headers);
    }
  } catch (error) {
    return createErrorResponse(500, 'Error handling GET request', error, headers);
  }
}

// Handler for creating a new empty dashboard view
async function handleCreate(
  requestData: any,
  supabase: any,
  headers: Record<string, string>
): Promise<Response> {
  try {
    const { userId, name, description, isDefault = false } = requestData;
    
    if (!userId || !name) {
      return createErrorResponse(400, 'Missing required parameters', 'userId and name are required', headers);
    }
    
    // Create the view
    const { data: view, error: viewError } = await supabase
      .from('dashboard_views')
      .insert([
        {
          user_id: userId,
          name,
          description,
          is_default: isDefault
        }
      ])
      .select()
      .single();
      
    if (viewError) {
      return createErrorResponse(500, 'Failed to create dashboard view', viewError, headers);
    }
    
    // If this view is set as default, unset default flag on all other views
    if (isDefault) {
      await supabase
        .from('dashboard_views')
        .update({ is_default: false })
        .eq('user_id', userId)
        .neq('id', view.id);
    }
    
    return new Response(
      JSON.stringify({ view }),
      { status: 201, headers }
    );
  } catch (error) {
    return createErrorResponse(500, 'Error creating dashboard view', error, headers);
  }
}

// Function to get all views for a user
async function getAllViews(supabase: any, userId: string, headers: Record<string, string>) {
  try {
    const { data: views, error } = await supabase
      .from('dashboard_views')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      return createErrorResponse(500, 'Failed to fetch dashboard views', error, headers);
    }

    return new Response(
      JSON.stringify(views || []),
      {
        status: 200,
        headers
      }
    );
  } catch (error) {
    return createErrorResponse(500, 'Error fetching dashboard views', error, headers);
  }
}

// Function to get a specific view by ID
async function getViewById(supabase: any, userId: string, viewId: string, headers: Record<string, string>) {
  try {
    // Get the view
    const { data: view, error: viewError } = await supabase
      .from('dashboard_views')
      .select('*')
      .eq('id', viewId)
      .eq('user_id', userId)
      .single();

    if (viewError) {
      return createErrorResponse(404, 'Dashboard view not found', viewError, headers);
    }

    // Get the widgets for this view
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
      JSON.stringify({
        view,
        widgets: widgets || []
      }),
      {
        status: 200,
        headers
      }
    );
  } catch (error) {
    return createErrorResponse(500, 'Error fetching dashboard view', error, headers);
  }
}

// Function to get the default view for a user
async function getDefaultView(supabase: any, userId: string, headers: Record<string, string>) {
  try {
    // Get the default view
    const { data: view, error: viewError } = await supabase
      .from('dashboard_views')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single();

    if (viewError) {
      // If no default view is found, get the most recent view
      const { data: recentView, error: recentViewError } = await supabase
        .from('dashboard_views')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (recentViewError) {
        return createErrorResponse(404, 'No dashboard views found for user', recentViewError, headers);
      }

      return await getViewById(supabase, userId, recentView.id, headers);
    }

    return await getViewById(supabase, userId, view.id, headers);
  } catch (error) {
    return createErrorResponse(500, 'Error fetching default dashboard view', error, headers);
  }
}

// Function to create a new view from a template
async function createViewFromTemplate(
  supabase: any,
  userId: string,
  request: CreateViewFromTemplateRequest,
  headers: Record<string, string>
) {
  try {
    console.log('Creating view from template:', request);
    
    const { templateId, viewName, isDefault } = request;

    if (!templateId) {
      return createErrorResponse(400, 'Template ID is required', null, headers);
    }

    if (!viewName) {
      return createErrorResponse(400, 'View name is required', null, headers);
    }

    // Get the template
    const template = getTemplateById(templateId);
    if (!template) {
      return createErrorResponse(404, 'Template not found', null, headers);
    }

    // If this is the default view, unset any existing default views
    if (isDefault) {
      const { error: updateError } = await supabase
        .from('dashboard_views')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('is_default', true);

      if (updateError) {
        console.error('Error unsetting existing default views:', updateError);
      }
    }

    // Create the view
    const { data: view, error: viewError } = await supabase
      .from('dashboard_views')
      .insert({
        user_id: userId,
        name: viewName,
        description: template.info.description,
        is_default: isDefault
      })
      .select()
      .single();

    if (viewError) {
      return createErrorResponse(500, 'Failed to create dashboard view', viewError, headers);
    }

    // Create widgets for the view
    const widgets = template.widgets.map((widget: any, index: number) => ({
      view_id: view.id,
      widget_id: widget.id,
      widget_type: widget.type,
      title: widget.title,
      icon: widget.icon,
      column_span: widget.columnSpan || 1,
      row_span: widget.rowSpan || 1,
      position_x: widget.position?.x || index % 2,
      position_y: widget.position?.y || Math.floor(index / 2),
      widget_data: widget.data
    }));

    const { data: createdWidgets, error: widgetsError } = await supabase
      .from('dashboard_widgets')
      .insert(widgets)
      .select();

    if (widgetsError) {
      return createErrorResponse(500, 'Failed to create dashboard widgets', widgetsError, headers);
    }

    return new Response(
      JSON.stringify({
        view,
        widgets: createdWidgets
      }),
      {
        status: 201,
        headers
      }
    );
  } catch (error) {
    return createErrorResponse(500, 'Error creating dashboard view from template', error, headers);
  }
}

// Function to create a new empty view
async function createEmptyView(
  supabase: any,
  userId: string,
  request: CreateViewRequest,
  headers: Record<string, string>
) {
  try {
    const { name, description, isDefault } = request;

    if (!name) {
      return createErrorResponse(400, 'View name is required', null, headers);
    }

    // If this is the default view, unset any existing default views
    if (isDefault) {
      const { error: updateError } = await supabase
        .from('dashboard_views')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('is_default', true);

      if (updateError) {
        console.error('Error unsetting existing default views:', updateError);
      }
    }

    // Create the view
    const { data: view, error: viewError } = await supabase
      .from('dashboard_views')
      .insert({
        user_id: userId,
        name,
        description,
        is_default: isDefault
      })
      .select()
      .single();

    if (viewError) {
      return createErrorResponse(500, 'Failed to create dashboard view', viewError, headers);
    }

    return new Response(
      JSON.stringify({
        view,
        widgets: []
      }),
      {
        status: 201,
        headers
      }
    );
  } catch (error) {
    return createErrorResponse(500, 'Error creating empty dashboard view', error, headers);
  }
}

// Function to update a view
async function updateView(
  supabase: any,
  userId: string,
  viewId: string,
  request: UpdateViewRequest,
  headers: Record<string, string>
) {
  try {
    const { name, description, isDefault } = request;

    // Verify the user owns this view
    const { data: existingView, error: checkError } = await supabase
      .from('dashboard_views')
      .select('*')
      .eq('id', viewId)
      .eq('user_id', userId)
      .single();

    if (checkError) {
      return createErrorResponse(404, 'Dashboard view not found or access denied', checkError, headers);
    }

    // If this is being set as the default view, unset any existing default views
    if (isDefault) {
      const { error: updateError } = await supabase
        .from('dashboard_views')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('is_default', true);

      if (updateError) {
        console.error('Error unsetting existing default views:', updateError);
      }
    }

    // Update the view
    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isDefault !== undefined) updateData.is_default = isDefault;

    const { data: updatedView, error: updateError } = await supabase
      .from('dashboard_views')
      .update(updateData)
      .eq('id', viewId)
      .select()
      .single();

    if (updateError) {
      return createErrorResponse(500, 'Failed to update dashboard view', updateError, headers);
    }

    return new Response(
      JSON.stringify(updatedView),
      {
        status: 200,
        headers
      }
    );
  } catch (error) {
    return createErrorResponse(500, 'Error updating dashboard view', error, headers);
  }
}

// Function to delete a view
async function deleteView(
  supabase: any,
  userId: string,
  viewId: string,
  headers: Record<string, string>
) {
  try {
    // Verify the user owns this view
    const { data: existingView, error: checkError } = await supabase
      .from('dashboard_views')
      .select('*')
      .eq('id', viewId)
      .eq('user_id', userId)
      .single();

    if (checkError) {
      return createErrorResponse(404, 'Dashboard view not found or access denied', checkError, headers);
    }

    // Delete the widgets for this view
    const { error: widgetsError } = await supabase
      .from('dashboard_widgets')
      .delete()
      .eq('view_id', viewId);

    if (widgetsError) {
      return createErrorResponse(500, 'Failed to delete dashboard widgets', widgetsError, headers);
    }

    // Delete the view
    const { error: deleteError } = await supabase
      .from('dashboard_views')
      .delete()
      .eq('id', viewId);

    if (deleteError) {
      return createErrorResponse(500, 'Failed to delete dashboard view', deleteError, headers);
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers
      }
    );
  } catch (error) {
    return createErrorResponse(500, 'Error deleting dashboard view', error, headers);
  }
}
