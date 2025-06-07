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
  toggleExpandedWidget,
  setExpandedWidgets
} from '@/store/slices/dashboardSlice';
import { Widget } from '@/components/profile/types/dashboard-data.typings';

// Define localStorage keys as constants for reuse
export const STORAGE_KEYS = {
  DASHBOARD_DATA: 'pawfi-dashboard-data',
  EXPANDED_WIDGETS: 'pawfi-dashboard-expanded'
};

/**
 * Custom hook for managing dashboard state and operations
 */
export function useDashboard(userId?: string) {
  const dispatch = useAppDispatch();
  const { 
    data, 
    originalData, 
    expandedWidgets,
    status, 
    error, 
    isEditMode, 
    hasUnsavedChanges, 
    isSaving, 
    saveSuccess,
    isConfirmModalOpen
  } = useAppSelector(state => state.dashboard);

  // Load dashboard data
  const loadDashboard = useCallback(() => {
    if (userId) {
      dispatch(fetchDashboard(userId));
    }
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

  // Toggle widget expanded state
  const toggleWidgetExpanded = useCallback((widgetId: string) => {
    dispatch(toggleExpandedWidget(widgetId));
  }, [dispatch]);

  // Set expanded widgets state
  const setWidgetsExpandedState = useCallback((expandedState: Record<string, boolean>) => {
    dispatch(setExpandedWidgets(expandedState));
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
    expandedWidgets,
    status,
    error,
    isEditMode,
    hasUnsavedChanges,
    isSaving,
    saveSuccess,
    isConfirmModalOpen,
    
    // Actions
    loadDashboard,
    saveDashboard: saveDashboardData,
    toggleEditMode,
    cancelEditing: handleCancelEditing,
    confirmCancelEditing,
    closeConfirmModal,
    updateWidgets: updateDashboardWidgets,
    toggleWidgetExpanded,
    setExpandedWidgets: setWidgetsExpandedState
  };
}
