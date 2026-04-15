import { useState } from "react";
import { useAppDispatch } from "@/store/hooks";
import { useAuth } from "@/contexts/auth-context";
import { useCookie } from "@/utils/use-cookie";
import { Widget } from "../profile/types/dashboard-data.typings";
import { STORAGE_KEYS } from "@/hooks/use-dashboard";
import { setCurrentViewId } from "@/store/slices/dashboardSlice";
import { createDashboardWithWidgets } from "../../lib/api/dashboard";

/**
 * Custom hook for handling Financial Health Quiz dashboard integration
 */
export function useQuizDashboard() {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { setCookie } = useCookie();

  const [status, setStatus] = useState<
    "idle" | "creating" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [createdViewId, setCreatedViewId] = useState<string | null>(null);

  /**
   * Create a new dashboard view with the quiz results widgets
   * @deprecated Use the createDashboardWithWidgets function from dashboard.ts instead
   */
  const createDashboardFromQuiz = async (
    viewName: string,
    widgets: Widget[],
  ) => {
    if (!user?.id) {
      setError("User not authenticated");
      setStatus("error");
      return null;
    }

    if (!viewName.trim()) {
      setError("Dashboard name is required");
      setStatus("error");
      return null;
    }

    setStatus("creating");
    setError(null);

    try {
      // Use the centralized API function
      const result = await createDashboardWithWidgets({
        viewName,
        description: "",
        widgets,
        userId: user.id,
      });

      // Save the new view ID to cookies
      if (result?.view?.id) {
        setCookie(STORAGE_KEYS.CURRENT_VIEW_ID, result.view.id, { days: 30 });
        setCreatedViewId(result.view.id);

        // Set this as the current view in Redux store
        dispatch(setCurrentViewId(result.view.id));

        setStatus("success");
        return result.view.id;
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      setStatus("error");
      return null;
    }
  };

  return {
    status,
    error,
    createdViewId,
    createDashboardFromQuiz,
  };
}
