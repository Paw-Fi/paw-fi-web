// Supabase Edge Function for dashboard views management
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";
import { corsHeaders } from "../shared/cors.ts";
import { getTemplateById } from "../shared/template-loader.ts";

console.log(`Function "dashboard-views" up and running!`);


interface CreateViewFromTemplateRequest {
  templateId: string;
  viewName: string;
  action?: string;
  userId?: string;
}

interface CreateViewRequest {
  name: string;
  description?: string;
}

interface UpdateViewRequest {
  name?: string;
  description?: string;
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
      case 'create-with-widgets':
        return await createViewWithWidgets(supabase, requestData);
      case 'update':
        return await handleUpdate(req.method, requestData, supabase, headers);
      case 'update-with-widgets':
        return await handleUpdateWithWidgets(req.method, requestData, supabase, headers);
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
      .order('order', { ascending: true });
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
        .order('order', { ascending: true })
        
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
      .order('order', { ascending: true })
      
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
    
    const { userId, templateId, viewName} = requestData;
    
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
        }
      ])
      .select()
      .single();
      
    if (viewError) {
      return createErrorResponse(500, 'Failed to create dashboard view', viewError, headers);
    }
    
    // Create the widgets
    const widgetInserts = template.widgets.map((widget: any, index: number) => ({
      view_id: view.id,
      // Don't specify widget_id, let Supabase generate it
      type: widget.type,
      title: widget.title,
      icon: widget.icon,
      column_span: widget.column_span || 1,
      row_span: widget.row_span || 1,
      data: widget.data // Use widget.data directly
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

/**
 * Creates a new dashboard view with the provided widgets
 * 
 * This allows the frontend to pass custom widget data directly instead of relying
 * on a backend template, useful for dynamic content like financial quiz results.
 * 
 * @param supabase The Supabase client
 * @param request The request object containing view data and widgets
 * @returns The created dashboard view or an error
 */
export async function createViewWithWidgets(
  supabase: SupabaseClient,
  request: any,
) {
  try {
    // Validate request
    const { viewName,userId, description, widgets } = request;
    if(!userId){
      return {
        status: 400,
        body: {
          error: 'Invalid request. userId is required.'
        }
      };
    }
    
    if (!viewName || !widgets || !Array.isArray(widgets)) {
      return {
        status: 400,
        body: {
          error: 'Invalid request. viewName and widgets array are required.'
        }
      };
    }
    
    // Create the dashboard view
    const { data: createdView, error: viewError } = await supabase
      .from('dashboard_views')
      .insert([
        {
          name: viewName,
          description: description || '',
          user_id: userId
        }
      ])
      .select('*')
      .single();
    
    if (viewError) {
      console.error('Error creating dashboard view:', viewError);
      return {
        status: 500,
        body: {
          error: 'Failed to create dashboard view',
          details: viewError
        }
      };
    }
    
    // Prepare widgets with the new view ID
    const widgetsToInsert = widgets.map((widget) => ({
      ...widget,
      view_id: createdView.id
    }));
    
    // Insert all widgets for this view
    const { error: widgetsError } = await supabase
      .from('dashboard_widgets')
      .insert(widgetsToInsert);
    
    if (widgetsError) {
      console.error('Error creating dashboard widgets:', widgetsError);
      
      // If widgets fail, delete the view to avoid orphaned views
      await supabase
        .from('dashboard_views')
        .delete()
        .eq('id', createdView.id);
      
      return {
        status: 500,
        body: {
          error: 'Failed to create dashboard widgets',
          details: widgetsError
        }
      };
    }
    
    // Return success with created view
    return {
      status: 200,
      body: {
        message: 'Dashboard view created successfully',
        view: createdView
      }
    };
  } catch (error) {
    console.error('Unexpected error in createViewWithWidgets:', error);
    return {
      status: 500,
      body: {
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : String(error)
      }
    };
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
    
    const { userId, viewId, name, description } = requestData;
    
    if (!userId || !viewId) {
      return createErrorResponse(400, 'Missing required fields', 'userId and viewId are required', headers);
    }
    
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
    
    // Update the view
    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    
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
    
    return new Response(
      JSON.stringify({ view }),
      { status: 200, headers }
    );
  } catch (error) {
    return createErrorResponse(500, 'Error updating dashboard view', error, headers);
  }
}

// Handler for updating a dashboard view with all its widgets in a single transaction
async function handleUpdateWithWidgets(
  method: string,
  requestData: any,
  supabase: any,
  headers: Record<string, string>
): Promise<Response> {
  try {
    if (method !== 'PUT') {
      return createErrorResponse(405, 'Method not allowed', `Method ${method} not allowed for update-with-widgets`, headers);
    }
    
    const { userId, viewId, name, description, widgets } = requestData;
    
    if (!userId || !viewId || !widgets) {
      return createErrorResponse(400, 'Missing required fields', 'userId, viewId, and widgets are required', headers);
    }
    
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
    
    // Update the view first
    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    
    const { data: updatedView, error: updateViewError } = await supabase
      .from('dashboard_views')
      .update(updateData)
      .eq('id', viewId)
      .eq('user_id', userId)
      .select()
      .single();
      
    if (updateViewError) {
      return createErrorResponse(500, 'Failed to update dashboard view', updateViewError, headers);
    }
    
    // Get existing widgets to determine which ones to add, update, or delete
    const { data: existingWidgets, error: widgetsError } = await supabase
      .from('dashboard_widgets')
      .select('id')
      .eq('view_id', viewId);
      
    if (widgetsError) {
      return createErrorResponse(500, 'Failed to fetch existing widgets', widgetsError, headers);
    }
    
    // Create sets of widget IDs for easier comparison
    const existingWidgetIds = new Set(existingWidgets.map((w: any) => w.id));
    
    // Separate widgets into those with IDs (to update) and those without IDs (to insert)
    const widgetsToUpdate: any[] = [];
    const widgetsToInsert: any[] = [];
    
    // Track which existing widget IDs are in the payload
    const widgetIdsInPayload = new Set<string>();
    
    // Process each widget in the payload and preserve their order
    widgets.forEach((widget: any, index: number) => {
      const baseWidget = {
        view_id: viewId,
        type: widget.type,  // Add the type field
        title: widget.title,
        icon: widget.icon,
        column_span: widget.column_span,
        row_span: widget.row_span,
        data: widget.data,
        order: index  // Set the order based on the array index to preserve frontend ordering
      };
      
      if (widget.id) {
        // If widget has an ID, add it to the update list
        widgetsToUpdate.push({
          ...baseWidget,
          id: widget.id
        });
        widgetIdsInPayload.add(widget.id);
      } else {
        // If widget has no ID, add it to the insert list (backend will generate ID)
        widgetsToInsert.push(baseWidget);
      }
    });
    
    // Widgets to delete (exist in DB but not in the new payload)
    const widgetsToDelete = [...existingWidgetIds].filter(id => !widgetIdsInPayload.has(id as string));
    
    // Delete widgets that are no longer in the dashboard
    if (widgetsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('dashboard_widgets')
        .delete()
        .eq('view_id', viewId)
        .in('id', widgetsToDelete);
        
      if (deleteError) {
        return createErrorResponse(500, 'Failed to delete removed widgets', deleteError, headers);
      }
    }
    
    // Update existing widgets
    if (widgetsToUpdate.length > 0) {
      const { error: updateError } = await supabase
        .from('dashboard_widgets')
        .upsert(widgetsToUpdate, { onConflict: 'id' });
        
      if (updateError) {
        return createErrorResponse(500, 'Failed to update existing widgets', updateError, headers);
      }
    }
    
    // Insert new widgets
    if (widgetsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('dashboard_widgets')
        .insert(widgetsToInsert);
        
      if (insertError) {
        return createErrorResponse(500, 'Failed to insert new widgets', insertError, headers);
      }
    }
    
    // Get the updated widgets to return in the response
    // Order by the new 'order' field to preserve frontend ordering
    const { data: updatedWidgets, error: getWidgetsError } = await supabase
      .from('dashboard_widgets')
      .select('*')
      .eq('view_id', viewId)
      .order('order', { ascending: true });
      
    if (getWidgetsError) {
      return createErrorResponse(500, 'Failed to fetch updated widgets', getWidgetsError, headers);
    }
    
    return new Response(
      JSON.stringify({
        view: updatedView,
        widgets: updatedWidgets
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Error updating dashboard with widgets:', error);
    return createErrorResponse(500, 'Error updating dashboard with widgets', error, headers);
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
    const { userId, name, description } = requestData;
    
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
        }
      ])
      .select()
      .single();
      
    if (viewError) {
      return createErrorResponse(500, 'Failed to create dashboard view', viewError, headers);
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
    
    const { templateId, viewName } = request;

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

    // Create the view
    const { data: view, error: viewError } = await supabase
      .from('dashboard_views')
      .insert({
        user_id: userId,
        name: viewName,
        description: template.info.description,
      })
      .select()
      .single();

    if (viewError) {
      return createErrorResponse(500, 'Failed to create dashboard view', viewError, headers);
    }

    // Create widgets for the view
    const widgets = template.widgets.map((widget: any, index: number) => ({
      view_id: view.id,
      type: widget.type,
      title: widget.title,
      icon: widget.icon,
      column_span: widget.column_span || 1,
      row_span: widget.row_span || 1,
      data: widget.data
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
    const { name, description } = request;

    if (!name) {
      return createErrorResponse(400, 'View name is required', null, headers);
    }


    // Create the view
    const { data: view, error: viewError } = await supabase
      .from('dashboard_views')
      .insert({
        user_id: userId,
        name,
        description,
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
    const { name, description } = request;

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
    // Update the view
    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

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

// Function to update a view and all its widgets in a single transaction
async function updateViewWithWidgets(
  supabase: any,
  userId: string,
  viewId: string,
  request: any,
  headers: Record<string, string>
) {
  try {
    const { name, description, widgets } = request;

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

    // Start a transaction to update both the view and widgets
    const { data, error } = await supabase.rpc('update_dashboard_with_widgets', {
      p_view_id: viewId,
      p_name: name || existingView.name,
      p_description: description !== undefined ? description : existingView.description,
      p_widgets: widgets
    });

    if (error) {
      return createErrorResponse(500, 'Failed to update dashboard with widgets', error, headers);
    }

    // Return the updated view and widgets
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Dashboard updated successfully',
        data
      }),
      {
        status: 200,
        headers
      }
    );
  } catch (error) {
    console.error('Error updating dashboard with widgets:', error);
    return createErrorResponse(500, 'Error updating dashboard with widgets', error, headers);
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
