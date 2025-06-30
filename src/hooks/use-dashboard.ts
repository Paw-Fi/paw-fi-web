import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { 
  fetchDashboard, 
  saveDashboard, 
  setEditMode, 
  updateWidgets, 
  cancelEditing,
  setHasUnsavedChanges,
  setConfirmModalOpen,
  setCurrentViewId
} from '@/store/slices/dashboardSlice';
import { useDashboardViewById, convertDashboardWidgetToWidget } from '@/lib/api/dashboard';
import { Widget } from '@/components/profile/types/dashboard-data.typings';
import { DashboardView, DashboardWidget } from '@/types/dashboard.types';
import { useQuery } from '@tanstack/react-query';

// Define localStorage keys as constants for reuse
export const STORAGE_KEYS = {
  DASHBOARD_DATA: 'pawfi-dashboard-data',
  CURRENT_VIEW_ID: 'pawfi-dashboard-view-id'
};

/**
 * Custom hook for managing dashboard state and operations
 */
export function useDashboard(userId?: string) {
  const dispatch = useAppDispatch();
  const { 
    data, 
    originalData, 
    status, 
    error, 
    isEditMode, 
    hasUnsavedChanges, 
    isSaving, 
    saveSuccess,
    isConfirmModalOpen,
    views,
    currentViewId,
    isViewLoading
  } = useAppSelector(state => state.dashboard);

  // Load dashboard data
  const loadDashboard = useCallback(() => {
    if (userId) {
      dispatch(fetchDashboard(userId));
    }
  }, [userId, dispatch]);

  // Load a specific dashboard view using TanStack Query
  const { data: viewData, isLoading: isViewDataLoading, error: viewError } = useDashboardViewById(
    userId || '',
    currentViewId || '',
    {
      enabled: !!userId && !!currentViewId
    }
  );
  
  // Handle view data changes with an effect
  useEffect(() => {
    if (viewData && viewData.widgets) {
      const widgets = viewData.widgets.map(w => convertDashboardWidgetToWidget(w));
      
      dispatch(updateWidgets({ 
        widgets, 
        hasUnsavedChanges: false 
      }));
    }
  }, [viewData, dispatch]);
  
  // Handle view errors with an effect
  useEffect(() => {
    if (viewError) {
      console.error('Error loading dashboard view:', viewError);
    }
  }, [viewError]);

  // Load a specific dashboard view
  const loadDashboardView = useCallback((viewId: string) => {
    if (!userId) return;
    
    // Set the current view ID in the Redux store
    dispatch(setCurrentViewId(viewId));
    
    // The actual data fetching is handled by the useDashboardViewById hook above
    // which will automatically trigger when currentViewId changes
  }, [userId, dispatch]);

  // Save dashboard data
  const saveDashboardData = useCallback(() => {
    if (userId && data) {
      dispatch(saveDashboard({ 
        userId, 
        dashboardConfig: data 
      }));
    }
  }, [userId, data, dispatch]);

  // Toggle edit mode
  const toggleEditMode = useCallback(() => {
    if (isEditMode) {
      // If exiting edit mode, check for unsaved changes
      if (hasUnsavedChanges) {
        // Save changes before exiting
        saveDashboardData();
      } else {
        dispatch(setEditMode(false));
      }
    } else {
      // Entering edit mode
      dispatch(setEditMode(true));
    }
  }, [isEditMode, hasUnsavedChanges, saveDashboardData, dispatch]);

  // Handle cancel button click
  const handleCancelEditing = useCallback(() => {
    // If there are unsaved changes, show confirmation modal
    if (hasUnsavedChanges) {
      dispatch(setConfirmModalOpen(true));
    } else {
      dispatch(cancelEditing());
    }
  }, [hasUnsavedChanges, dispatch]);

  // Confirm cancel editing (discard changes)
  const confirmCancelEditing = useCallback(() => {
    dispatch(cancelEditing());
  }, [dispatch]);

  // Close confirmation modal
  const closeConfirmModal = useCallback(() => {
    dispatch(setConfirmModalOpen(false));
  }, [dispatch]);

  // Update widgets
  const updateDashboardWidgets = useCallback((updatedWidgets: Widget[]) => {
    dispatch(updateWidgets({ widgets: updatedWidgets }));
  }, [dispatch]);



  // Check for unsaved changes
  useEffect(() => {
    if (!data) return;
    
    const currentWidgetsJson = JSON.stringify(data);
    const originalWidgetsJson = JSON.stringify(originalData);
    
    if (currentWidgetsJson !== originalWidgetsJson) {
      dispatch(setHasUnsavedChanges(true));
    } else {
      dispatch(setHasUnsavedChanges(false));
    }
  }, [data, originalData, dispatch]);

  // Warn user about unsaved changes when leaving the page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        const message = 'You have unsaved changes. Are you sure you want to leave?';
        e.returnValue = message;
        return message;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return {
    // State
    dashboardData: data,
    originalDashboardData: originalData,
    status,
    error,
    isEditMode,
    hasUnsavedChanges,
    isSaving,
    saveSuccess,
    isConfirmModalOpen,
    views,
    currentViewId,
    isViewLoading,
    
    // Actions
    loadDashboard,
    loadDashboardView,
    saveDashboard: saveDashboardData,
    toggleEditMode,
    cancelEditing: handleCancelEditing,
    confirmCancelEditing,
    closeConfirmModal,
    updateWidgets: updateDashboardWidgets
  };
}
