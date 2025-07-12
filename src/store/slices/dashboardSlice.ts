import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Widget } from '@/components/profile/types/dashboard-data.typings';
import { 
  getAllDashboardViews, 
  getDashboardViewById, 
  getDefaultDashboardView,
  createDashboardViewFromTemplate,
  convertDashboardWidgetToWidget,
  getAllDashboardTemplates,
  updateDashboardViewWithWidgets
} from '@/lib/api/dashboard';
import { DashboardView, DashboardWidget } from '@/types/dashboard.types';
import { toast } from 'react-toastify';

// Define status type for better type safety
export type DashboardStatus = 'idle' | 'loading' | 'succeeded' | 'failed' | 'no_views';
export type TemplatesStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

// Define the state type - keep the original property names
interface DashboardState {
  data: Widget[] | null;
  originalData: Widget[] | null;
  views: DashboardView[];
  currentViewId: string | null;
  status: DashboardStatus;
  error: string | null;
  isEditMode: boolean;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  saveSuccess: boolean;
  isConfirmModalOpen: boolean;
  hasInitialLoad: boolean;
  isViewLoading: boolean;
  templates: any[];
  templatesStatus: TemplatesStatus;
  templatesError: string | null;
}

// Initial state - keep the original property names
const initialState: DashboardState = {
  data: null,
  originalData: null,
  views: [],
  currentViewId: null,
  status: 'idle',
  error: null,
  isEditMode: false,
  hasUnsavedChanges: false,
  isSaving: false,
  saveSuccess: false,
  isConfirmModalOpen: false,
  hasInitialLoad: false,
  isViewLoading: false,
  templates: [],
  templatesStatus: 'idle',
  templatesError: null
};

// Async thunks - keep the original function names
export const fetchDashboard = createAsyncThunk(
  'dashboard/fetchDashboard',
  async (userId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { dashboard: DashboardState };
      
      // If we've already loaded the data, return the current data
      if (state.dashboard.hasInitialLoad && state.dashboard.data) {
        return state.dashboard.data;
      }
      
      // First, get all views for this user
      const views = await getAllDashboardViews(userId);
      
      // If no views exist, return a special status
      if (!views || views.length === 0) {
        return rejectWithValue('no_views');
      }
      
      try {
        // Try to fetch the default dashboard view
        const result = await getDefaultDashboardView(userId);
        
        // Convert dashboard widgets to frontend widgets
        const widgets = result.widgets.map(convertDashboardWidgetToWidget);
        
        return { views, currentView: result.view, widgets };
      } catch (error) {
        // If no default view exists, but we have other views, use the first one
        if (views.length > 0) {
          const result = await getDashboardViewById(userId, views[0].id);
          const widgets = result.widgets.map(convertDashboardWidgetToWidget);
          return { views, currentView: result.view, widgets };
        }
        
        throw error;
      }
    } catch (error) {
      if ((error as Error).message.includes('no rows')) {
        return rejectWithValue('no_views');
      }
      return rejectWithValue((error as Error).message);
    }
  }
);

// Fetch available dashboard templates
export const fetchDashboardTemplates = createAsyncThunk(
  'dashboard/fetchDashboardTemplates',
  async (_, { rejectWithValue }) => {
    try {
      const templates = await getAllDashboardTemplates();
      
      // If no templates are returned, return an empty array but don't reject
      if (!templates || !Array.isArray(templates) || templates.length === 0) {
        console.warn('No dashboard templates found or invalid response format');
        return [];
      }
      
      return templates;
    } catch (error) {
      console.error('Error fetching dashboard templates:', error);
      return rejectWithValue((error as Error).message);
    }
  }
);

// Create a new dashboard view from a template
export const createDashboardViewFromTemplateThunk = createAsyncThunk(
  'dashboard/createDashboardViewFromTemplate',
  async ({ userId, templateId, viewName }: { userId: string, templateId: string, viewName: string }, { rejectWithValue }) => {
    try {
      const result = await createDashboardViewFromTemplate(userId, {
        templateId,
        viewName,
      });
      
      const widgets = result.widgets.map(convertDashboardWidgetToWidget);
      return { view: result.view, widgets };
    } catch (error) {
      console.error('Error creating dashboard view from template:', error);
      return rejectWithValue((error as Error).message);
    }
  }
);

export const saveDashboard = createAsyncThunk(
  'dashboard/saveDashboard',
  async ({ userId, dashboardConfig }: { userId: string, dashboardConfig: Widget[] }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { dashboard: DashboardState };
      const viewId = state.dashboard.currentViewId;
      const currentView = state.dashboard.views.find(view => view.id === viewId);
      
      if (!viewId || !currentView) {
        throw new Error('No current view selected');
      }
      
      // Send the entire dashboard view with all widgets in a single request
      const response = await updateDashboardViewWithWidgets(userId, {
        viewId,
        name: currentView.name,
        description: currentView.description,
        widgets: dashboardConfig.map(widget => ({
          id: widget.id,
          title: widget.title,
          type: widget.type,
          icon: widget.icon,
          column_span: widget.column_span as 1 | 2,
          row_span: widget.row_span as 1 | 2,
          data: widget.data
        }))
      });
      
      // Return the updated widgets from the backend (with IDs for new widgets)
      const updatedWidgets = response.widgets.map((widget: any) => ({
        id: widget.id,
        type: widget.type,
        title: widget.title,
        icon: widget.icon,
        column_span: widget.column_span,
        row_span: widget.row_span,
        data: widget.data
      }));
      
      return updatedWidgets;
    } catch (error) {
      toast.error("Error saving dashboard, Please try again later")
      console.error('Error saving dashboard:', error);
      return rejectWithValue((error as Error).message);
    }
  }
);

// Create the dashboard slice
const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setEditMode: (state, action: PayloadAction<boolean>) => {
      state.isEditMode = action.payload;
      if (!action.payload) {
        state.hasUnsavedChanges = false;
      }
    },
    updateWidgets: (state, action: PayloadAction<Widget[] | { widgets?: Widget[], hasUnsavedChanges?: boolean }>) => {
      if (!state.data) {
        state.data = [];
      }
      
      if (Array.isArray(action.payload)) {
        state.data = action.payload;
        state.hasUnsavedChanges = JSON.stringify(state.data) !== JSON.stringify(state.originalData);
      } else if (action.payload) {
        // Handle object payload
        if (action.payload.widgets) {
          state.data = action.payload.widgets;
        }
        
        if (action.payload.hasUnsavedChanges !== undefined) {
          state.hasUnsavedChanges = action.payload.hasUnsavedChanges;
        } else {
          state.hasUnsavedChanges = JSON.stringify(state.data) !== JSON.stringify(state.originalData);
        }
      }
    },
    reorderWidgets: (state, action: PayloadAction<Widget[]>) => {
      if (!state.data) {
        state.data = [];
      }
      state.data = action.payload;
      state.hasUnsavedChanges = JSON.stringify(state.data) !== JSON.stringify(state.originalData);
    },
    cancelEditing: (state) => {
      state.data = JSON.parse(JSON.stringify(state.originalData));
      state.isEditMode = false;
      state.hasUnsavedChanges = false;
      state.isConfirmModalOpen = false;
    },
    setConfirmModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isConfirmModalOpen = action.payload;
    },
    setHasUnsavedChanges: (state, action: PayloadAction<boolean>) => {
      state.hasUnsavedChanges = action.payload;
    },
    clearSaveSuccess: (state) => {
      state.saveSuccess = false;
    },
    // New action to set the current view ID
    setCurrentViewId: (state, action: PayloadAction<string>) => {
      state.currentViewId = action.payload;
    },
    // Reset the error state
    resetError: (state) => {
      state.error = null;
      state.status = 'idle';
    },
    // Reset templates error state
    resetTemplatesError: (state) => {
      state.templatesError = null;
      state.templatesStatus = 'idle';
    },
    // Set default templates for development/testing
    setDefaultTemplates: (state) => {
      if (state.templates.length === 0) {
        state.templates = [
          {
            id: 'default',
            name: 'Default Dashboard',
            description: 'A standard dashboard with common financial widgets'
          },
          {
            id: 'minimal',
            name: 'Minimal Dashboard',
            description: 'A simplified dashboard with essential widgets only'
          }
        ];
        state.templatesStatus = 'succeeded';
      }
    }
  },
  extraReducers(builder) {
    builder
      // Handle fetchDashboard
      .addCase(fetchDashboard.pending, (state) => {
        // Always set loading status when fetching dashboard data
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.status = 'succeeded';
        
        if (action.payload === 'no_views') {
          state.status = 'no_views';
          state.data = [];
          state.originalData = [];
          state.hasInitialLoad = true;
          return;
        }
        
        // Handle the response with views and widgets
        if (action.payload && typeof action.payload === 'object' && 'views' in action.payload) {
          state.views = action.payload.views;
          state.currentViewId = action.payload.currentView.id;
          state.data = action.payload.widgets;
          state.originalData = [...action.payload.widgets];
        } else {
          // Fallback to the old format for backward compatibility
          state.data = action.payload as Widget[];
          state.originalData = [...(action.payload as Widget[])];
        }
        
        state.error = null;
        state.hasInitialLoad = true; // Mark initial load as complete
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        if (action.payload === 'no_views') {
          state.status = 'no_views';
        } else {
          state.status = 'failed';
          state.error = action.payload as string || 'Failed to load dashboard';
        }
        state.hasInitialLoad = true; // Even on error, mark as loaded to prevent repeated loading
      })
      
      // Handle fetchDashboardTemplates
      .addCase(fetchDashboardTemplates.pending, (state) => {
        state.templatesStatus = 'loading';
        state.templatesError = null;
      })
      .addCase(fetchDashboardTemplates.fulfilled, (state, action) => {
        state.templatesStatus = 'succeeded';
        
        // If we got an empty array, set default templates for development
        if (!action.payload || !Array.isArray(action.payload) || action.payload.length === 0) {
          // Set default templates for development/testing
          state.templates = [
            {
              id: 'default',
              name: 'Default Dashboard',
              description: 'A standard dashboard with common financial widgets'
            },
            {
              id: 'minimal',
              name: 'Minimal Dashboard',
              description: 'A simplified dashboard with essential widgets only'
            }
          ];
        } else {
          state.templates = action.payload;
        }
      })
      .addCase(fetchDashboardTemplates.rejected, (state, action) => {
        state.templatesStatus = 'failed';
        state.templatesError = action.payload as string || 'Failed to load templates';
        
        // Set default templates even on error for development/testing
        state.templates = [
          {
            id: 'default',
            name: 'Default Dashboard',
            description: 'A standard dashboard with common financial widgets'
          },
          {
            id: 'minimal',
            name: 'Minimal Dashboard',
            description: 'A simplified dashboard with essential widgets only'
          }
        ];
      })
      
      // Handle createDashboardViewFromTemplate
      .addCase(createDashboardViewFromTemplateThunk.pending, (state) => {
        state.isSaving = true;
      })
      .addCase(createDashboardViewFromTemplateThunk.fulfilled, (state, action) => {
        state.isSaving = false;
        state.status = 'succeeded';
        state.currentViewId = action.payload.view.id;
        
        // Add the new view to the views array
        state.views.push(action.payload.view);
        
        state.data = action.payload.widgets;
        state.originalData = [...action.payload.widgets];
        
        state.hasUnsavedChanges = false;
        state.hasInitialLoad = true;
      })
      .addCase(createDashboardViewFromTemplateThunk.rejected, (state, action) => {
        state.isSaving = false;
        state.status = 'failed';
        state.error = action.payload as string;
      })
      
      // Handle saveDashboard
      .addCase(saveDashboard.pending, (state) => {
        state.isSaving = true;
        state.saveSuccess = false;
      })
      .addCase(saveDashboard.fulfilled, (state, action) => {
        state.isSaving = false;
        state.saveSuccess = true;
        state.originalData = JSON.parse(JSON.stringify(state.data));
        state.isEditMode = false;
        state.hasUnsavedChanges = false;
        
        // Auto-clear success message after 3 seconds
        setTimeout(() => {
          if (state.saveSuccess) {
            state.saveSuccess = false;
          }
        }, 3000);
      })
      .addCase(saveDashboard.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      });
  }
});

// Export actions and reducer - keep the original export names
export const { 
  setEditMode, 
  updateWidgets,
  reorderWidgets,
  cancelEditing,
  setConfirmModalOpen,
  setHasUnsavedChanges,
  clearSaveSuccess,
  setCurrentViewId,
  resetError,
  resetTemplatesError,
  setDefaultTemplates
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
