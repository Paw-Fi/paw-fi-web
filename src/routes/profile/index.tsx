import { useAuth } from '@/contexts/auth-context';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { DraggableDashboard } from '@/components/profile/DraggableDashboard';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faGear, faPencilAlt, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import { ConfirmationModal } from '@/components/profile/modals/ConfirmationModal';
import { SkeletonDashboard } from '@/components/profile/SkeletonDashboard';
import { useDashboard, STORAGE_KEYS } from '@/hooks/use-dashboard';
import { DashboardStatus } from '@/store/slices/dashboardSlice';
import { Widget } from '@/components/profile/types/dashboard-data.typings';

export const Route = createFileRoute('/profile/')({  
  component: Profile,
});

function Profile() {
  const { user,isLoading } = useAuth();
  const navigate = useNavigate();
  
  // Use our custom dashboard hook
  const { 
    dashboardData: data, 
    status, 
    error, 
    isEditMode, 
    hasUnsavedChanges, 
    isSaving, 
    saveSuccess,
    isConfirmModalOpen,
    loadDashboard,
    saveDashboard,
    toggleEditMode,
    cancelEditing,
    confirmCancelEditing,
    closeConfirmModal,
    updateWidgets
  } = useDashboard(user?.id);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && !isLoading) {
      navigate({ to: '/login' });
    }
  }, [user, isLoading, navigate]);

  // Load saved dashboard configuration on initial render
  useEffect(() => {
    if (user && status === 'idle') {
      loadDashboard();
    }
  }, [user, loadDashboard, status]);

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

  const handleUpdateWidgets = (updatedWidgets: Widget[]) => {
    updateWidgets(updatedWidgets);
  };

  // Handle cancel button click
  const handleCancelClick = () => {
    if (hasUnsavedChanges) {
      confirmCancelEditing();
    } else {
      cancelEditing();
    }
  };

  // Show loading spinner if user is not loaded yet
  if (!user) {
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-primary rounded-full"></div>
    </div>;
  }

  // Show error state if dashboard loading failed
  if (status === 'failed') {
    return <div className="flex flex-col items-center justify-center h-screen">
      <div className="text-red-500 text-xl mb-4">Failed to load dashboard</div>
      <div className="text-gray-600">{error}</div>
      <button 
        onClick={loadDashboard}
        className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
      >
        Try Again
      </button>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 pointer-events-none"></div>
 
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with user info and controls */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Welcome back, {user?.user_metadata?.full_name || 'User'}!
            </h2>
            <p className="text-gray-600">
              {isEditMode 
                ? 'Edit mode: Add, remove, resize, and edit widgets to customize your dashboard.' 
                : 'Here\'s your personalized financial dashboard. Drag and drop widgets to customize your view.'}
            </p>
          </div>
          
          {/* User controls */}
          <div className="flex items-center space-x-2">
            {saveSuccess && (
              <span className="text-green-600 text-sm mr-2 bg-green-50 px-3 py-1 rounded-full">
                Dashboard saved!
              </span>
            )}
            
            {isEditMode ? (
              <>
                {hasUnsavedChanges && (
                  <span className="text-amber-600 text-sm mr-2 bg-amber-50 px-3 py-1 rounded-full">
                    Unsaved changes
                  </span>
                )}
                <button 
                  onClick={handleCancelClick} 
                  className="px-3 py-1.5 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-700"
                  title="Cancel editing"
                >
                  <FontAwesomeIcon icon={faTimes} className="h-4 w-4 mr-1" />
                  <span>Cancel</span>
                </button>
                <button 
                  onClick={saveDashboard} 
                  disabled={isSaving}
                  className="px-3 py-1.5 rounded-md bg-primary hover:bg-primary-dark flex items-center justify-center text-white transition-colors"
                  title="Save dashboard"
                >
                  {isSaving ? (
                    <>
                      <div className="h-4 w-4 border-t-2 border-b-2 border-white rounded-full animate-spin mr-1" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faCheck} className="h-4 w-4 mr-1" />
                      <span>Save</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={toggleEditMode} 
                  className="p-2 rounded-full hover:bg-gray-100 flex items-center justify-center"
                  title="Edit dashboard"
                >
                  <FontAwesomeIcon icon={faPencilAlt} className="h-5 w-5 text-gray-600" />
                </button>
               
              
              </>
            )}
          </div>
        </div>
        
        {/* Dashboard with loading state */}
        {(() => {
          // Using an IIFE to handle complex conditional rendering with proper typing
          if (status === 'loading' && (!data || data.length === 0)) {
            return (
              <div className="mt-4">
                <SkeletonDashboard />
              </div>
            );
          } else if (status === 'failed' as DashboardStatus) {
            return (
              <div className="mt-4 p-6 bg-red-50 rounded-lg text-center">
                <p className="text-red-600 mb-2">{error || 'Failed to load dashboard'}</p>
                <button 
                  onClick={loadDashboard}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
                >
                  Retry
                </button>
              </div>
            );
          } else if (data && data.length > 0) {
            return (
              <DraggableDashboard 
                widgets={Array.isArray(data) ? data : []} 
                isEditMode={isEditMode}
                onUpdateWidgets={handleUpdateWidgets}
              />
            );
          } else {
            return (
              <div className="mt-4 p-6 bg-gray-50 rounded-lg text-center">
                <p className="text-gray-600">No dashboard data available</p>
              </div>
            );
          }
        })()}
      </main>
      
      {/* Confirmation Modal for unsaved changes */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={closeConfirmModal}
        onConfirm={cancelEditing}
        title="Discard Changes?"
        message="You have unsaved changes to your dashboard. If you cancel now, all changes will be lost. Are you sure you want to discard your changes?"
        confirmText="Discard Changes"
        cancelText="Continue Editing"
      />
    </div>
  );
}

export default Profile;
