import { useAuth } from "@/contexts/auth-context";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { DraggableDashboard } from "@/components/profile/DraggableDashboard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBell,
  faGear,
  faPencilAlt,
  faCheck,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { ConfirmationModal } from "@/components/profile/modals/ConfirmationModal";
import { SkeletonDashboard } from "@/components/profile/SkeletonDashboard";
import { useDashboard, STORAGE_KEYS } from "@/hooks/use-dashboard";
import { DashboardStatus } from "@/store/slices/dashboardSlice";
import { Widget } from "@/components/profile/types/dashboard-data.typings";
import AmbientHalo from "@/components/ui/ambient-halo";
import { AmbientHaloLayout } from "@/layouts/ambient-halo-layout";

export const Route = createFileRoute("/dashboard/_layout/")({
  component: Profile,
});

function Profile() {
  const { user, isLoading } = useAuth();
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
    updateWidgets,
  } = useDashboard(user?.id);

  // Load saved dashboard configuration on initial render
  useEffect(() => {
    if (user && status === "idle") {
      loadDashboard();
    }
  }, [user, loadDashboard, status]);

  // Warn user about unsaved changes when leaving the page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        const message =
          "You have unsaved changes. Are you sure you want to leave?";
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
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
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
      </div>
    );
  }

  // Show error state if dashboard loading failed
  if (status === "failed") {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <div className="mb-4 text-xl text-red-500">
          Failed to load dashboard
        </div>
        <div className="text-gray-600">{error}</div>
        <button
          onClick={loadDashboard}
          className="hover:bg-primary-dark mt-4 rounded-md bg-primary px-4 py-2 text-white"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex">
        <main className="mx-auto w-full">
          {/* Header with user info and controls */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="mb-2 text-2xl font-bold text-gray-800">
                Welcome back, {user?.user_metadata?.full_name || "User"}!
              </h2>
              <p className="text-gray-600">
                {isEditMode
                  ? "Edit mode: Add, remove, resize, and edit widgets to customize your dashboard."
                  : "Here's your personalized financial dashboard. Drag and drop widgets to customize your view."}
              </p>
            </div>

            {/* User controls */}
            <div className="flex items-center space-x-2">
              {saveSuccess && (
                <span className="mr-2 rounded-full bg-green-50 px-3 py-1 text-sm text-green-600">
                  Dashboard saved!
                </span>
              )}

              {isEditMode ? (
                <>
                  {hasUnsavedChanges && (
                    <span className="mr-2 rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-600">
                      Unsaved changes
                    </span>
                  )}
                  <button
                    onClick={handleCancelClick}
                    className="flex items-center justify-center rounded-md px-3 py-1.5 text-gray-700 hover:bg-gray-100"
                    title="Cancel editing"
                  >
                    <FontAwesomeIcon icon={faTimes} className="mr-1 h-4 w-4" />
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={saveDashboard}
                    disabled={isSaving}
                    className="hover:bg-primary-dark flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-white transition-colors"
                    title="Save dashboard"
                  >
                    {isSaving ? (
                      <>
                        <div className="mr-1 h-4 w-4 animate-spin rounded-full border-b-2 border-t-2 border-white" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon
                          icon={faCheck}
                          className="mr-1 h-4 w-4"
                        />
                        <span>Save</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={toggleEditMode}
                    className="flex items-center justify-center rounded-full p-2 hover:bg-gray-100"
                    title="Edit dashboard"
                  >
                    <FontAwesomeIcon
                      icon={faPencilAlt}
                      className="h-5 w-5 text-gray-600"
                    />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Dashboard with loading state */}
          {(() => {
            // Using an IIFE to handle complex conditional rendering with proper typing
            if (status === "loading" && (!data || data.length === 0)) {
              return (
                <div className="mt-4">
                  <SkeletonDashboard />
                </div>
              );
            } else if (status === ("failed" as DashboardStatus)) {
              return (
                <div className="mt-4 rounded-lg bg-red-50 p-6 text-center">
                  <p className="mb-2 text-red-600">
                    {error || "Failed to load dashboard"}
                  </p>
                  <button
                    onClick={loadDashboard}
                    className="rounded-md bg-red-100 px-4 py-2 text-red-700 transition-colors hover:bg-red-200"
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
                <div className="mt-4 rounded-lg bg-gray-50 p-6 text-center">
                  <p className="text-gray-600">No dashboard data available</p>
                </div>
              );
            }
          })()}
        </main>
      </div>
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
    </>
  );
}

export default Profile;
