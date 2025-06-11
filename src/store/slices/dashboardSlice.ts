import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Widget } from '@/components/profile/types/dashboard-data.typings';
import { dashboardData as initialData } from '@/components/profile/data/profile-data';
import { supabase } from '@/lib/supabase'; // Assuming you have a supabase client setup
import { STORAGE_KEYS } from '@/hooks/use-dashboard';

// Define status type for better type safety
export type DashboardStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

// Define the state type
interface DashboardState {
  data: Widget[] | null;
  originalData: Widget[] | null;
  // expandedWidgets: Record<string, boolean>; // Removed
  status: DashboardStatus;
  error: string | null;
  isEditMode: boolean;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  saveSuccess: boolean;
  isConfirmModalOpen: boolean;
  hasInitialLoad: boolean;
}

// Initial state
const initialState: DashboardState = {
  data: [...initialData],
  originalData: [...initialData],
  // expandedWidgets: {}, // Removed
  status: 'idle',
  error: null,
  isEditMode: false,
  hasUnsavedChanges: false,
  isSaving: false,
  saveSuccess: false,
  isConfirmModalOpen: false,
  hasInitialLoad: false
};

// Async thunks
export const fetchDashboard = createAsyncThunk(
  'dashboard/fetchDashboard',
  async (userId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { dashboard: DashboardState };
      
      // If we've already loaded the data, return the current data
      if (state.dashboard.hasInitialLoad && state.dashboard.data) {
        return state.dashboard.data;
      }
      
      // For now, we'll simulate a delay to demonstrate loading state
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real implementation, fetch from Supabase
      // const { data, error } = await supabase
      //   .from('user_dashboards')
      //   .select('dashboard_config')
      //   .eq('user_id', userId)
      //   .single();
      
      // if (error) throw error;
      
      // Get from localStorage as fallback
      const savedConfig = localStorage.getItem(STORAGE_KEYS.DASHBOARD_DATA);
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        // Ensure we're returning an array
        return Array.isArray(parsedConfig) ? parsedConfig : [...initialData];
      }
      
      // If no saved config, use initial data
      return [...initialData];
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const saveDashboard = createAsyncThunk(
  'dashboard/saveDashboard',
  async ({ userId, dashboardConfig }: { userId: string, dashboardConfig: Widget[] }, { rejectWithValue }) => {
    try {
      // For now, we'll simulate a delay to demonstrate saving state
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real implementation, save to Supabase
      // const { error } = await supabase
      //   .from('user_dashboards')
      //   .upsert({ 
      //     user_id: userId, 
      //     dashboard_config: dashboardConfig 
      //   });
      
      // if (error) throw error;
      
      // Save to localStorage as backup
      localStorage.setItem(STORAGE_KEYS.DASHBOARD_DATA, JSON.stringify(dashboardConfig));
      
      return dashboardConfig;
    } catch (error) {
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
        state.data = [] ;
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
    }
  },
  extraReducers(builder) {
    builder
      // Handle fetchDashboard
      .addCase(fetchDashboard.pending, (state) => {
        // Only set loading status if it's the initial load
        if (!state.hasInitialLoad) {
          state.status = 'loading';
        }
        state.error = null;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
        state.originalData = action.payload;
        state.error = null;
        state.hasInitialLoad = true; // Mark initial load as complete
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string || 'Failed to load dashboard';
        state.hasInitialLoad = true; // Even on error, mark as loaded to prevent repeated loading
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

// Export actions and reducer
export const { 
  setEditMode, 
  updateWidgets,
  reorderWidgets,
  cancelEditing,
  setConfirmModalOpen,
  setHasUnsavedChanges,
  clearSaveSuccess
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
