import { useAuth } from "@/contexts/auth-context";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, Fragment } from "react";
import { DraggableDashboard } from "@/components/profile/DraggableDashboard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBell,
  faGear,
  faPencilAlt,
  faCheck,
  faTimes,
  faPlus,
  faLightbulb,
  faExclamationTriangle,
  faRefresh,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";
import { ConfirmationModal } from "@/components/profile/modals/ConfirmationModal";
import { SkeletonDashboard } from "@/components/profile/SkeletonDashboard";
import { useDashboard, STORAGE_KEYS } from "@/hooks/use-dashboard";
import {
  DashboardStatus,
  fetchDashboardTemplates,
  createDashboardViewFromTemplateThunk,
  setDefaultTemplates,
  resetTemplatesError,
  setCurrentViewId,
} from "@/store/slices/dashboardSlice";
import { Widget } from "@/components/profile/types/dashboard-data.typings";
import AmbientHalo from "@/components/ui/ambient-halo";
import { AmbientHaloLayout } from "@/layouts/ambient-halo-layout";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { DashboardView } from "@/types/dashboard.types";
import { useCookie } from "@/utils/use-cookie";

export const Route = createFileRoute("/dashboard/_layout/")({
  component: Profile,
});

function Profile() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const templates = useAppSelector((state) => state.dashboard.templates);
  const templatesStatus = useAppSelector(
    (state) => state.dashboard.templatesStatus,
  );
  const templatesError = useAppSelector(
    (state) => state.dashboard.templatesError,
  );
  const views = useAppSelector((state) => state.dashboard.views);
  const currentViewId = useAppSelector(
    (state) => state.dashboard.currentViewId,
  );
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [newViewName, setNewViewName] = useState("");
  const [isCreatingView, setIsCreatingView] = useState(false);
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const { getCookie, setCookie } = useCookie();

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
    loadDashboardView,
  } = useDashboard(user?.id);

  // Load saved dashboard configuration on initial render
  useEffect(() => {
    if (user && status === "idle") {
      // Check if we have a saved view ID in cookies
      const savedViewId = getCookie(STORAGE_KEYS.CURRENT_VIEW_ID);
      if (savedViewId && views.some((view) => view.id === savedViewId)) {
        loadDashboardView(savedViewId);
      } else {
        loadDashboard();
      }
    }
  }, [user, loadDashboard, status, getCookie, views, loadDashboardView]);

  // Load templates if we need to show the template selection UI
  useEffect(() => {
    if (
      (status === "no_views" || isTemplateModalOpen) &&
      templatesStatus === "idle"
    ) {
      dispatch(fetchDashboardTemplates());
    }
  }, [status, templatesStatus, dispatch, isTemplateModalOpen]);

  // Show template modal automatically if there are no views
  useEffect(() => {
    if (status === "no_views") {
      setIsTemplateModalOpen(true);
    }
  }, [status]);

  // If templates fail to load, use default templates after a timeout
  useEffect(() => {
    let timeoutId: number;

    if (status === "no_views" && templatesStatus === "loading") {
      // If templates are still loading after 5 seconds, use default templates
      timeoutId = window.setTimeout(() => {
        if (templatesStatus === "loading") {
          dispatch(setDefaultTemplates());
        }
      }, 5000);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [status, templatesStatus, dispatch]);

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

  // Handle creating a new dashboard view from template
  const handleCreateView = async () => {
    if (!user?.id || !selectedTemplate || !newViewName.trim()) {
      return;
    }

    setIsCreatingView(true);

    try {
      const result = await dispatch(
        createDashboardViewFromTemplateThunk({
          userId: user.id,
          templateId: selectedTemplate,
          viewName: newViewName.trim(),
        }),
      ).unwrap();

      // Save the new view ID to cookies
      if (result?.view?.id) {
        setCookie(STORAGE_KEYS.CURRENT_VIEW_ID, result.view.id, { days: 30 });
      }

      // Close the modal after successful creation
      setIsTemplateModalOpen(false);
      setSelectedTemplate("");
      setNewViewName("");

      // After successful creation, the dashboard will be loaded automatically
    } catch (error) {
      console.error("Error creating dashboard view:", error);
    } finally {
      setIsCreatingView(false);
    }
  };

  // Handle retrying template loading
  const handleRetryTemplates = () => {
    dispatch(resetTemplatesError());
    dispatch(fetchDashboardTemplates());
  };

  // Handle switching dashboard views
  const handleSwitchView = (viewId: string) => {
    setIsViewDropdownOpen(false);
    if (viewId === currentViewId) {
      return;
    }

    if (hasUnsavedChanges) {
      // Show confirmation modal before switching views
      confirmCancelEditing();
      // Store the view ID to switch to after confirmation
      sessionStorage.setItem("pending_view_switch", viewId);
    } else {
      // Switch view immediately if no unsaved changes
      loadDashboardView(viewId);
      setCookie(STORAGE_KEYS.CURRENT_VIEW_ID, viewId, { days: 30 });
    }
  };

  // Handle confirmation of view switching after discarding changes
  useEffect(() => {
    if (!hasUnsavedChanges && !isConfirmModalOpen) {
      const pendingViewId = sessionStorage.getItem("pending_view_switch");
      if (pendingViewId) {
        loadDashboardView(pendingViewId);
        setCookie(STORAGE_KEYS.CURRENT_VIEW_ID, pendingViewId, { days: 30 });
        sessionStorage.removeItem("pending_view_switch");
      }
    }
  }, [hasUnsavedChanges, isConfirmModalOpen, loadDashboardView, setCookie]);

  // Show loading spinner if user is not loaded yet
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
      </div>
    );
  }

  // Show empty dashboard if user has no dashboard views yet
  if (status === "no_views") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <h2 className="mb-4 text-xl font-medium text-gray-700">
            Setting up your dashboard...
          </h2>
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
        </div>

        {/* Template selection modal will be shown automatically via useEffect */}
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
        <main className="mx-auto w-full flex flex-col gap-6">
          {/* Header with user info and controls */}
          {status === "loading" ? (
            <>
              
            </>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

                {/* View selector dropdown - always visible */}
                <div className="relative ml-4">
                  <button
                    onClick={() => setIsViewDropdownOpen(!isViewDropdownOpen)}
                    className="flex items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    disabled={isEditMode}
                  >
                    <span className="mr-2">
                      {currentViewId && views.length > 0
                        ? views.find((v) => v.id === currentViewId)?.name ||
                          "Select View"
                        : views.length === 1
                          ? views[0].name
                          : "Dashboard Views"}
                    </span>
                    <FontAwesomeIcon icon={faChevronDown} className="h-3 w-3" />
                  </button>

                  {isViewDropdownOpen && (
                    <div className="absolute left-0 z-10 mt-1 w-56 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                      <div className="py-1">
                        {views.length > 0 ? (
                          <>
                            {views.map((view) => (
                              <button
                                key={view.id}
                                onClick={() => handleSwitchView(view.id)}
                                className={`block w-full px-4 py-2 text-left text-sm ${view.id === currentViewId ? "bg-gray-100 text-gray-900" : "text-gray-700 hover:bg-gray-50"}`}
                              >
                                {view.name}
                              </button>
                            ))}
                            <div className="my-1 border-t border-gray-200"></div>
                          </>
                        ) : (
                          <div className="px-4 py-2 text-sm italic text-gray-500">
                            No dashboard views yet
                          </div>
                        )}
                        <button
                          onClick={() => {
                            setIsViewDropdownOpen(false);
                            setIsTemplateModalOpen(true);
                          }}
                          className="block w-full px-4 py-2 text-left text-sm font-medium text-primary hover:bg-gray-50"
                        >
                          <FontAwesomeIcon icon={faPlus} className="mr-2" />
                          Create New View
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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
                      <FontAwesomeIcon
                        icon={faTimes}
                        className="mr-1 h-4 w-4"
                      />
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
          )}

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

      {/* Click outside handler for view dropdown */}
      {isViewDropdownOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsViewDropdownOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Template Selection Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              aria-hidden="true"
            ></div>

            {/* Modal panel */}
            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:align-middle">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 w-full text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <h3 className="text-xl font-semibold leading-6 text-gray-900">
                      {views.length === 0
                        ? "Create Your First Dashboard"
                        : "Create New Dashboard View"}
                    </h3>

                    <div className="mt-4">
                      {templatesStatus === "loading" &&
                      templates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8">
                          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
                          <p className="text-gray-600">Loading templates...</p>
                        </div>
                      ) : templatesStatus === "failed" ? (
                        <div className="flex flex-col items-center justify-center py-8">
                          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-500">
                            <FontAwesomeIcon
                              icon={faExclamationTriangle}
                              className="h-6 w-6"
                            />
                          </div>
                          <p className="mb-4 text-center text-red-500">
                            {templatesError || "Failed to load templates"}
                          </p>
                          <div className="flex space-x-4">
                            <button
                              onClick={handleRetryTemplates}
                              className="flex items-center rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
                            >
                              <FontAwesomeIcon
                                icon={faRefresh}
                                className="mr-2 h-4 w-4"
                              />
                              Retry
                            </button>
                            <button
                              onClick={() => dispatch(setDefaultTemplates())}
                              className="hover:bg-primary-dark flex items-center rounded-md bg-primary px-4 py-2 text-white"
                            >
                              Use Default Templates
                            </button>
                          </div>
                        </div>
                      ) : templates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8">
                          <p className="mb-4 text-gray-600">
                            No templates available
                          </p>
                          <button
                            onClick={() => dispatch(setDefaultTemplates())}
                            className="hover:bg-primary-dark flex items-center rounded-md bg-primary px-4 py-2 text-white"
                          >
                            Use Default Templates
                          </button>
                        </div>
                      ) : (
                        <>
                          <h4 className="mb-4 text-lg font-medium">
                            Select a Template
                          </h4>
                          <div className="mb-6 grid gap-4 md:grid-cols-2">
                            {templates.map((template) => (
                              <div
                                key={template.id}
                                className={`cursor-pointer rounded-lg border p-4 transition-all ${
                                  selectedTemplate === template.id
                                    ? "border-primary bg-primary bg-opacity-10"
                                    : "border-gray-200 hover:border-gray-300"
                                }`}
                                onClick={() => setSelectedTemplate(template.id)}
                              >
                                <div className="mb-2 flex items-center">
                                  <div
                                    className={`mr-3 flex h-10 w-10 items-center justify-center rounded-full ${
                                      selectedTemplate === template.id
                                        ? "bg-primary text-white"
                                        : "bg-gray-100"
                                    }`}
                                  >
                                    <FontAwesomeIcon
                                      icon={faLightbulb}
                                      className="h-5 w-5"
                                    />
                                  </div>
                                  <h4 className="font-medium">
                                    {template.name}
                                  </h4>
                                </div>
                                <p className="text-sm text-gray-600">
                                  {template.description}
                                </p>
                              </div>
                            ))}
                          </div>

                          <div className="mb-4">
                            <label
                              htmlFor="viewName"
                              className="mb-1 block text-sm font-medium text-gray-700"
                            >
                              Dashboard Name
                            </label>
                            <input
                              type="text"
                              id="viewName"
                              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                              value={newViewName}
                              onChange={(e) => setNewViewName(e.target.value)}
                              placeholder="My Financial Dashboard"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={handleCreateView}
                  disabled={
                    !selectedTemplate || !newViewName.trim() || isCreatingView
                  }
                  className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto ${
                    !selectedTemplate || !newViewName.trim() || isCreatingView
                      ? "bg-gray-400"
                      : "hover:bg-primary-dark bg-primary"
                  }`}
                >
                  {isCreatingView ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-t-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    "Create Dashboard"
                  )}
                </button>
                {views.length > 0 && (
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    onClick={() => setIsTemplateModalOpen(false)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Profile;
