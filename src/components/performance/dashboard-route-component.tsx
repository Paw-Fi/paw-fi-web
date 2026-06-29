import BreadCrumbsHeader from "@/components/ui/breadcrumbs";
import { Outlet, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { useChatContext } from "@/contexts/chat-context";
// Removed useAuthQuerySync import - now handled at root level
import { getCanonicalUrl } from "@/utils/canonical";
import { seo } from "@/utils/seo";
import { supabase } from "@/lib/supabase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChessKnight,
  faCog,
  faUser,
  faSignInAlt,
  faSignOut,
  faBars,
  faTimes,
  faHandHoldingDollar,
  faHouseChimney,
  faHome,
  faIdCard,
  faHeadphones,
  faTrophy,
  faLightbulb,
  faHammer,
  faDownload,
} from "@fortawesome/free-solid-svg-icons";
import { AnimatePresence, motion } from "framer-motion";
import logo from "@assets/images/icon.svg";

import { toast } from "react-toastify";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import classNames from "classnames";
import { useSubscription } from "@/hooks/use-subscription";
import { FloatingGuideWindow } from "@/components/dashboard-chat/FloatingGuideWindow";
import { useLocalProgress } from "@/hooks/use-local-progress";
import { useCookie } from "@/utils/use-cookie";
import { useGoals } from "@/hooks/goal-tracker";
import { logUserActivity } from "@/utils/activity-logger-clone";
import { ActivityActions } from "@/utils/reward-actions-clone";
import { OptimizedImage } from "@/components/seo/optimized-image";
import { useFinancialHealthProfile } from "@/hooks/use-financial-health-profile";
import { FinancialAdvisorChatInterface } from "@/components/chat/financial-advisor-chat-interface";
import { FinancialEducatorChatInterface } from "@/components/chat/financial-educator-chat-interface";
import { ExpandableFAB } from "@/components/ui/expandable-fab";
import { useAIChat } from "@/contexts/ai-chat-context";
import {
  RightSidebar,
  RightSidebarRef,
} from "@/components/dashboard/RightSidebar";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ProtectedRouteSubscription } from "@/components/auth/ProtectedRouteSubscription";
import { useDashboardGuidance } from "@/hooks/useDashboardGuidance";
import { Button } from "@/components/ui/button";
import monekoLogo from "@/assets/images/logo/moneko.png";
import finniLogo from "@/assets/images/logo/finni.png";
import { DashboardAppProviders } from "@/providers/dashboard-app-providers";
import { isSystemGrantedFreeTrialUser } from "@/utils/subscription";

// Custom CSS for hiding scrollbars while maintaining functionality
const scrollbarHideStyles = `
  .scrollbar-hide {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none; /* Chrome, Safari and Opera */
  }
`;

// Type definitions for menu items
interface SubMenuItem {
  id: string; // ID is required
  label: string;
  path: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: IconDefinition;
  path: string;
  submenu?: SubMenuItem[];
  comingSoon?: boolean;
}

export function DashboardRouteComponent() {
  return (
    <DashboardAppProviders>
      <Dashboard />
    </DashboardAppProviders>
  );
}

export function Dashboard() {
  // Auth query sync is now handled at root level - removed redundant call
  // Query client for cache invalidation
  const queryClient = useQueryClient();

  // AI Chat context
  const {
    isOpen: aiChatOpen,
    selectedAI,
    openChat,
    closeChat,
    clearAllMessages,
  } = useAIChat();

  // Chat context for conversation management
  const { clearAllConversations } = useChatContext();

  // Track chat usage
  useEffect(() => {
    if (aiChatOpen) {
      trackUserAction("chat_used", { aiType: selectedAI });
    }
  }, [aiChatOpen, selectedAI]);

  // Use route matching instead of local state for active menu
  const location = useLocation();
  const [expandedMenu, setExpandedMenu] = useState<MenuItem | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const rightSidebarRef = useRef<RightSidebarRef>(null);

  // Initialize dashboard guidance system
  const {
    trackUserAction,
    setTrialEligibility,
    updatePreferences,
    hideAllTooltips,
    resetGuidanceState,
    getGuidanceStats,
  } = useDashboardGuidance({
    enabled: true,
    frequencyLevel: "medium",
    sidebarRef: rightSidebarRef,
  });

  const { user, signOut, isLoading } = useAuth();

  const {
    subscription,
    isActive,
    isLoading: isSubscriptionLoading,
  } = useSubscription(user?.id);
  const isSystemGrantedTrial = isSystemGrantedFreeTrialUser(subscription);

  // Set trial eligibility based on subscription status
  // User is eligible only if they have NEVER had a subscription (no row exists)
  useEffect(() => {
    if (!isSubscriptionLoading && user) {
      // If subscription is null, it means no row exists in subscriptions table
      // This means the user has never tried the trial before
      const isEligible = subscription === null;
      setTrialEligibility(isEligible);
    }
  }, [subscription, isSubscriptionLoading, user, setTrialEligibility]);
  const { markCalculatorsVisited } = useLocalProgress();
  const { getCookie, setCookie } = useCookie();
  const [isGuideHidden, setIsGuideHidden] = useState(
    getCookie("moneko-guide-hidden") === "true",
  );
  const [hasCheckedGuestGoals, setHasCheckedGuestGoals] = useState(false);
  const [hasCheckedGuestProfiles, setHasCheckedGuestProfiles] = useState(false);
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);
  const { goals, isLoading: isGoalsLoading, refetch } = useGoals(user?.id);
  const {
    profile,
    hasProfile,
    isLoading: isProfileLoading,
  } = useFinancialHealthProfile(user?.id);
  const showGuide = () => {
    setCookie("moneko-guide-hidden", "false", { days: 365 });
    setIsGuideHidden(false);
  };

  // Guest goals migration utility functions
  const getGuestGoalIds = () => {
    const goalIds = getCookie("moneko-guest-goals");
    return goalIds ? JSON.parse(goalIds) : [];
  };

  const clearGuestGoalIds = () => {
    document.cookie =
      "moneko-guest-goals=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  };

  // Guest financial health profile migration utility functions
  const getGuestProfileIds = () => {
    const profileIds = getCookie("moneko-guest-profiles");
    return profileIds ? JSON.parse(profileIds) : [];
  };

  const clearGuestProfileIds = () => {
    document.cookie =
      "moneko-guest-profiles=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  };

  // Migrate guest goals to authenticated user
  const migrateGuestGoals = async (userId: string) => {
    if (!userId) {
      return;
    }
    const guestGoalIds = getGuestGoalIds();

    if (guestGoalIds.length === 0) {
      return;
    }

    try {
      // Update each guest goal with the user ID and log activity
      for (const goalId of guestGoalIds) {
        // Update the goal with user ID
        const { data: goalData, error: updateError } = await supabase
          .from("financial_goals")
          .update({ user_id: userId })
          .eq("id", goalId)
          .is("user_id", null)
          .select()
          .single();
        if (updateError) {
          console.error(`Failed to migrate guest goal ${goalId}:`, updateError);
          return;
        }

        // Track goal creation for guidance system
        trackUserAction("goal_created", {
          goalId: goalData.id,
          goalTitle: goalData.title,
        });

        // Log the goal creation activity with original creation timestamp
        try {
          await logUserActivity(userId, {
            type: "goal",
            action: ActivityActions.GOAL_CREATED,
            source: "ai-goal-generator-migration",
            metadata: {
              goalId: goalData.id,
              goalTitle: goalData.title,
              goalType: goalData.goal_type,
              targetAmount: goalData.target_amount,
              targetDate: goalData.target_date,
              migratedFromGuest: true,
              originalCreatedAt: goalData.created_at,
            },
            timestamp: goalData.created_at, // Use original creation time
          });
        } catch (activityError) {
          console.warn(
            `Failed to log activity for migrated goal ${goalId}:`,
            activityError,
          );
          // Continue even if activity logging fails
        }
      }

      // Clear guest goal IDs after successful migration
      clearGuestGoalIds();

      // Refetch goals once after all migrations complete
      refetch();
    } catch (error) {
      console.error("Failed to migrate guest goals:", error);
    }
  };

  // Migrate guest financial health profiles to authenticated user
  const migrateGuestProfiles = async (userId: string) => {
    if (!userId) {
      return;
    }
    const guestProfileIds = getGuestProfileIds();

    if (guestProfileIds.length === 0) {
      return;
    }

    try {
      let successfulMigrations = 0;

      // Update each guest profile with the user ID
      for (const profileId of guestProfileIds) {
        // Update the profile with user ID and get the updated data
        const { data: updatedProfile, error: updateError } = await supabase
          .from("financial_health_profiles")
          .update({ user_id: userId })
          .eq("id", profileId)
          .is("user_id", null)
          .select("id, profile_description, created_at")
          .single();

        if (updateError) {
          console.error(
            `Failed to migrate guest profile ${profileId}:`,
            updateError,
          );
          continue;
        }

        if (updatedProfile) {
          successfulMigrations++;
        }
      }

      // Clear guest profile IDs after migration attempt
      clearGuestProfileIds();
      setHasCheckedGuestProfiles(true);

      if (successfulMigrations > 0) {
        // Show a toast notification to the user about the successful migration
        if (typeof toast !== "undefined") {
          toast.success(
            `Successfully migrated your ${successfulMigrations} financial profile${successfulMigrations > 1 ? "s" : ""} to your account!`,
          );
        }
      } else if (guestProfileIds.length > 0) {
        console.warn("No guest profiles were successfully migrated");
      }
    } catch (error) {
      console.error("Failed to migrate guest profiles:", error);
    }
  };

  // Handle guest goal and profile migration on login
  useEffect(() => {
    const runMigrations = async () => {
      if (user?.id && !hasCheckedGuestGoals) {
        await migrateGuestGoals(user.id);
        // Always set the flag after migration attempt, even if no goals to migrate
        setHasCheckedGuestGoals(true);
      }
      if (user?.id && !hasCheckedGuestProfiles) {
        await migrateGuestProfiles(user.id);
        setHasCheckedGuestProfiles(true);
      }
    };

    runMigrations();
  }, [user]);

  // Redirect to onboarding if user hasn't completed it
  // Only redirect if:
  // 1. User is logged in
  // 2. User has no goals created AND no complete financial profile
  // 3. No guest goal/profile cookies exist (user hasn't completed onboarding as guest)
  // 4. Goals and profile have finished loading
  // 5. Guest goal and profile migrations have completed (prevent race condition)
  // 6. We haven't already checked
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for both migrations to complete before checking onboarding status
    // This prevents redirecting users while their guest data is being migrated
    if (
      user &&
      !isGoalsLoading &&
      !isProfileLoading &&
      hasCheckedGuestGoals &&
      hasCheckedGuestProfiles &&
      !hasCheckedOnboarding
    ) {
      const guestGoalIds = getGuestGoalIds();
      const guestProfileIds = getGuestProfileIds();
      const hasGoals = goals && goals.length > 0;
      const hasPendingGuestGoals = guestGoalIds.length > 0;
      const hasPendingGuestProfiles = guestProfileIds.length > 0;

      // Redirect to onboarding only if user has never created any goals OR complete profile
      // and has no pending guest goals/profiles to migrate
      // if (!hasGoals && !hasProfile && !hasPendingGuestGoals && !hasPendingGuestProfiles) {
      //   navigate({ to: '/onboarding' });
      // }

      setHasCheckedOnboarding(true);
    }
  }, [
    user,
    goals,
    profile,
    hasProfile,
    isGoalsLoading,
    isProfileLoading,
    hasCheckedGuestGoals,
    hasCheckedGuestProfiles,
    hasCheckedOnboarding,
    navigate,
  ]);

  // Helper function to check if a route is active
  const isRouteActive = (path: string) => {
    const currentPath = location.pathname;

    // Special case for dashboard root - exact match only
    if (path === "/dashboard") {
      return currentPath === "/dashboard" || currentPath === "/dashboard/";
    }

    // For main menu items (not submenu items)
    const mainMenuPaths = menuItems.map((item) => item.path);
    if (mainMenuPaths.includes(path)) {
      // Extract the section from both paths
      const pathSection = path.split("/")[2];
      const currentSection = currentPath.split("/")[2];

      // If the section matches, this main menu item is active
      if (pathSection && currentSection && pathSection === currentSection) {
        return true;
      }
    }

    // For submenu items, use exact matching
    return currentPath === path;
  };

  const menuItems = [
    {
      id: "home",
      label: "Home",
      icon: faHouseChimney,
      path: "/dashboard",
    },
    // {
    //   id: "export",
    //   label: "Export",
    //   icon: faDownload,
    //   path: "/dashboard/export",
    // },
  ];

  // Handle menu item click - show coming soon for all except membership
  const handleMenuItemClick = (e: React.MouseEvent, item: MenuItem) => {
    // Allow membership to navigate normally
    if (item.id === "membership") {
      setMobileMenuOpen(false);
      return;
    }

    // For items marked as coming soon, prevent navigation and show toast
    if (item.comingSoon) {
      e.preventDefault();
      setMobileMenuOpen(false);
      toast.info("Coming soon! This feature is under development.");
    }
  };
  useEffect(() => {
    // Clear expanded menu since we no longer use submenus
    setExpandedMenu(null);
  }, [location.pathname]);

  const handleSignOut = async () => {
    try {
      const result = await signOut();
      if (result.success) {
        // 1. Clear all chat context state immediately
        clearAllMessages(); // Clear AI chat messages (ai-chat-context)
        clearAllConversations(); // Clear all conversations (chat-context)

        // 2. Clear all chat-related localStorage data
        if (typeof window !== "undefined") {
          localStorage.removeItem("ai-chat-messages");
          // Clear any other chat-related storage
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (
              key &&
              (key.includes("chat") ||
                key.includes("conversation") ||
                key.includes("message"))
            ) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach((key) => localStorage.removeItem(key));

          // Clear guest session cookies
          document.cookie =
            "moneko-guest-session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        }

        toast.success("You have been signed out.");

        // 3. CRITICAL FIX: Navigate FIRST, then clear cache
        // This prevents race condition where new route tries to fetch cleared queries
        await navigate({ to: "/login", search: { redirect: undefined } });

        // 4. Clear query cache AFTER navigation completes
        // Use setTimeout to ensure navigation finishes before cache clear
        setTimeout(() => {
          queryClient.clear();
        }, 100);
      }
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <ProtectedRouteSubscription>
      {/* Add style tag for custom scrollbar hiding */}
      <style dangerouslySetInnerHTML={{ __html: scrollbarHideStyles }} />
      <div className="mobile-text-optimize bg-gradient-to-br from-purple-50/30 to-blue-50/20 p-4 font-sans sm:p-5 md:p-6 lg:h-screen lg:overflow-hidden lg:p-4 dark:from-slate-900 dark:to-purple-900/20">
        <div className="flex h-full flex-col gap-3 overflow-hidden sm:gap-4 md:flex-row md:gap-3">
          {/* Mobile Header - Optimized for touch and readability */}
          <div className="mb-3 flex items-center justify-between px-3 py-2 sm:mb-4 sm:px-4 md:hidden">
            <Link
              to="/"
              className="hover:bg-muted/30 dark:hover:bg-muted/50 flex min-h-[44px] items-center gap-2 rounded-lg px-2 py-2 transition-colors sm:gap-3"
            >
              <div className="bg-icon flex h-10 w-10 items-center justify-center rounded-xl shadow-sm">
                <OptimizedImage
                  src={logo}
                  alt="Moneko Logo"
                  className="h-6 w-6"
                />
              </div>
              <span className="text-foreground dark:text-foreground text-lg font-bold tracking-tight sm:text-xl">
                Moneko
              </span>
            </Link>
            <Button
              onClick={toggleMobileMenu}
              variant="ghost"
              size="icon"
              className={classNames(
                "h-11 min-h-[44px] w-11 min-w-[44px] rounded-lg shadow-sm transition-all duration-300",
                mobileMenuOpen
                  ? "bg-red-50/70 text-red-600 hover:bg-red-100/70 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                  : "bg-moneko-background/70 text-foreground hover:bg-muted/70",
              )}
              asChild
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center justify-center"
              >
                <FontAwesomeIcon
                  icon={mobileMenuOpen ? faTimes : faBars}
                  className={classNames(
                    "h-5 w-5 transition-all duration-300",
                    mobileMenuOpen
                      ? "text-red-600 dark:text-red-400"
                      : "text-foreground",
                  )}
                />
              </motion.div>
            </Button>
          </div>

          {/* Main Sidebar - Card-based Design */}
          <motion.div
            className={classNames(
              "flex-shrink-0 transition-all duration-300 ease-in-out",
              mobileMenuOpen ? "block" : "hidden md:block",
              "w-full md:max-h-full md:w-48 md:overflow-y-auto lg:w-52 xl:w-64",
            )}
            initial={{ x: -64, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="border-border dark:border-border bg-card/70 dark:bg-card/70 flex h-full flex-col rounded-xl border shadow-sm backdrop-blur-sm md:rounded-2xl">
              <div className="flex-1 py-3 sm:py-4 md:py-6">
                {/* Logo Section - Hidden on mobile (shown in top bar) */}
                <div className="mb-4 ml-3 hidden md:mb-6 md:ml-4 md:block">
                  <Link
                    to="/"
                    className="hover:bg-muted/30 dark:hover:bg-muted/50 mb-4 flex items-center space-x-3 rounded-lg px-2 py-2 transition-colors"
                  >
                    <div className="bg-icon flex h-10 w-10 items-center justify-center rounded-xl shadow-sm">
                      <OptimizedImage
                        src={logo}
                        alt="Moneko Logo"
                        className="h-6 w-6"
                      />
                    </div>
                    <span className="text-card-foreground dark:text-card-foreground text-xl font-bold tracking-tight">
                      Moneko
                    </span>
                  </Link>
                </div>

                {/* Navigation Menu - Mobile optimized spacing and touch targets */}
                <nav className="mobile-scroll h-full flex-1 space-y-2 px-3 sm:px-4 md:px-4">
                  {menuItems.map((item) => (
                    <div key={item.id}>
                      <Link
                        to={item.path}
                        className="group"
                        onClick={(e) => handleMenuItemClick(e, item)}
                      >
                        <motion.div
                          className={`dashboard-nav-item flex min-h-[44px] w-full items-center justify-between rounded-lg px-3 py-3 transition-all duration-200 sm:px-4 sm:py-3.5 ${
                            isRouteActive(item.path)
                              ? "bg-primary/10 dark:bg-primary/20 border-primary dark:border-primary text-primary dark:text-primary border-l-4 shadow-sm"
                              : "text-muted-foreground dark:text-muted-foreground hover:bg-muted/70 dark:hover:bg-muted/50 hover:text-foreground dark:hover:text-foreground active:bg-muted/90 dark:active:bg-muted/70 border-l-4 border-transparent"
                          }`}
                          whileTap={{ scale: 0.98 }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 25,
                          }}
                        >
                          <div className="flex items-center gap-2.5 sm:gap-3">
                            <div
                              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                                isRouteActive(item.path)
                                  ? "bg-primary/15 dark:bg-primary/25"
                                  : "group-hover:bg-muted dark:group-hover:bg-muted"
                              }`}
                            >
                              <FontAwesomeIcon
                                className={`h-4 w-4 sm:h-5 sm:w-5 ${
                                  isRouteActive(item.path)
                                    ? "text-primary dark:text-primary"
                                    : "text-muted-foreground dark:text-muted-foreground"
                                }`}
                                icon={item.icon}
                              />
                            </div>
                            <span className="text-sm leading-tight font-medium sm:text-base">
                              {item.label}
                            </span>
                          </div>
                        </motion.div>
                      </Link>
                    </div>
                  ))}
                </nav>
              </div>

              {/* User Profile Section - Mobile optimized */}
              <div className="border-border dark:border-border relative border-t p-3 sm:p-4">
                {isLoading || isSubscriptionLoading ? (
                  <div className="flex animate-pulse items-center gap-2.5 rounded-lg px-2 py-2.5 sm:gap-3">
                    <div className="bg-muted dark:bg-muted h-10 w-10 rounded-full"></div>
                    <div className="min-w-0 flex-1">
                      <div className="bg-muted dark:bg-muted mb-1 h-3 w-20 rounded sm:w-24"></div>
                      <div className="bg-muted dark:bg-muted h-2 w-28 rounded sm:w-32"></div>
                    </div>
                  </div>
                ) : user ? (
                  <>
                    <motion.div
                      className="dashboard-user-menu hover:bg-muted/50 dark:hover:bg-muted/50 active:bg-muted/70 dark:active:bg-muted/70 flex min-h-[44px] w-full cursor-pointer items-center gap-2.5 overflow-x-hidden rounded-lg px-2 py-2.5 transition-all duration-200 sm:gap-3"
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <UserAvatar
                        size="md"
                        showPremiumBorder={true}
                        showPremiumCrown={!isSystemGrantedTrial}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-card-foreground dark:text-card-foreground truncate text-sm font-medium">
                          {user.user_metadata?.full_name || "User"}
                        </p>
                        <p className="text-muted-foreground dark:text-muted-foreground truncate text-xs">
                          {user.email}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <FontAwesomeIcon
                          icon={userMenuOpen ? faTimes : faBars}
                          className="text-muted-foreground dark:text-muted-foreground h-4 w-4"
                        />
                      </div>
                    </motion.div>

                    {/* User Menu Popup */}
                    <AnimatePresence>
                      {userMenuOpen && (
                        <motion.div
                          className="bg-popover dark:bg-popover border-border dark:border-border absolute right-4 bottom-full left-4 z-50 mb-2 overflow-hidden rounded-xl border shadow-lg"
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                        >
                          {/* Settings Option */}
                          <Link to="/dashboard/user-settings" className="block">
                            <motion.div
                              className="hover:bg-muted/50 dark:hover:bg-muted/50 active:bg-muted/70 dark:active:bg-muted/70 flex min-h-[44px] items-center gap-2.5 px-3 py-3 transition-colors duration-200 sm:gap-3 sm:px-4"
                              whileHover={{ x: 1 }}
                            >
                              <div className="bg-muted dark:bg-muted flex h-9 w-9 items-center justify-center rounded-lg">
                                <FontAwesomeIcon
                                  className="text-muted-foreground dark:text-muted-foreground h-4 w-4"
                                  icon={faCog}
                                />
                              </div>
                              <span className="text-popover-foreground dark:text-popover-foreground text-sm font-medium">
                                Settings
                              </span>
                            </motion.div>
                          </Link>

                          {/* Membership Option */}
                          <Link
                            to="/dashboard/user-settings/membership"
                            className="block"
                            onClick={() => {
                              setUserMenuOpen(false);
                              setMobileMenuOpen(false);
                            }}
                          >
                            <motion.div
                              className="hover:bg-muted/50 dark:hover:bg-muted/50 active:bg-muted/70 dark:active:bg-muted/70 flex min-h-[44px] items-center gap-2.5 px-3 py-3 transition-colors duration-200 sm:gap-3 sm:px-4"
                              whileHover={{ x: 1 }}
                            >
                              <div className="bg-muted dark:bg-muted flex h-9 w-9 items-center justify-center rounded-lg">
                                <FontAwesomeIcon
                                  className="text-muted-foreground dark:text-muted-foreground h-4 w-4"
                                  icon={faIdCard}
                                />
                              </div>
                              <span className="text-popover-foreground dark:text-popover-foreground text-sm font-medium">
                                Membership
                              </span>
                            </motion.div>
                          </Link>
                          {/* Divider */}
                          <div className="border-border dark:border-border border-t" />

                          {/* Logout Option */}
                          <motion.div
                            className="flex min-h-[44px] cursor-pointer items-center gap-2.5 px-3 py-3 transition-colors duration-200 hover:bg-red-50/50 active:bg-red-50/70 sm:gap-3 sm:px-4 dark:hover:bg-red-900/20 dark:active:bg-red-900/30"
                            onClick={() => {
                              setUserMenuOpen(false);
                              setMobileMenuOpen(false);
                              handleSignOut();
                            }}
                            whileHover={{ x: 1 }}
                          >
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100/70 dark:bg-red-900/30">
                              <FontAwesomeIcon
                                className="h-4 w-4 text-red-600 dark:text-red-400"
                                icon={faSignOut}
                              />
                            </div>
                            <span className="text-sm font-medium text-red-600 dark:text-red-400">
                              Logout
                            </span>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <Link
                    to="/login"
                    search={{ redirect: "/dashboard" }}
                    className="group"
                  >
                    <motion.div
                      className="hover:bg-muted/50 dark:hover:bg-muted/50 active:bg-muted/70 dark:active:bg-muted/70 flex min-h-[44px] touch-manipulation items-center gap-2.5 rounded-lg px-3 py-3 transition-all duration-200 sm:gap-3 sm:px-4 sm:py-3.5"
                      whileHover={{ x: 2 }}
                    >
                      <div className="bg-primary/10 dark:bg-primary/20 flex h-9 w-9 items-center justify-center rounded-full sm:h-10 sm:w-10">
                        <FontAwesomeIcon
                          icon={faSignInAlt}
                          className="text-primary dark:text-primary h-4 w-4 sm:h-5 sm:w-5"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-card-foreground dark:text-card-foreground text-sm font-medium sm:text-sm">
                          Sign In
                        </p>
                      </div>
                    </motion.div>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>

          {/* Secondary Sidebar - Desktop Card Style or Mobile/Tablet Horizontal Scroll */}
          <AnimatePresence>
            {expandedMenu?.submenu && expandedMenu?.submenu.length > 0 && (
              <>
                {/* Desktop Version - Vertical Sidebar */}
                <motion.div
                  className={classNames(
                    "hidden w-56 lg:block",
                    "transition-all duration-300 ease-in-out",
                  )}
                  initial={{ x: -64, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -64, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <div className="border-border dark:border-border bg-card/70 dark:bg-card/70 h-full rounded-2xl border shadow-sm backdrop-blur-sm">
                    <div className="p-6">
                      <div className="mb-6 flex items-center gap-3">
                        <div className="bg-primary/10 dark:bg-primary/20 flex h-8 w-8 items-center justify-center rounded-lg">
                          <FontAwesomeIcon
                            className="text-primary dark:text-primary h-4 w-4"
                            icon={expandedMenu?.icon || faHome}
                          />
                        </div>
                        <h3 className="text-card-foreground dark:text-card-foreground text-sm font-bold capitalize">
                          {expandedMenu.label}
                        </h3>
                      </div>

                      <div className="space-y-2">
                        {expandedMenu?.submenu?.map((subItem, index) => (
                          <motion.div
                            key={subItem.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <Link to={subItem.path} className="group">
                              <motion.div
                                className={`block min-h-[44px] w-full rounded-lg px-4 py-3 text-left text-sm transition-all duration-200 ${
                                  isRouteActive(subItem.path)
                                    ? "border-primary dark:border-primary bg-primary/5 dark:bg-primary/10 text-primary dark:text-primary border-l-3 font-medium"
                                    : "text-muted-foreground dark:text-muted-foreground hover:bg-muted/50 dark:hover:bg-muted/50 hover:text-foreground dark:hover:text-foreground border-l-3 border-transparent"
                                }`}
                                transition={{
                                  type: "spring",
                                  stiffness: 400,
                                  damping: 25,
                                }}
                              >
                                <p className="line-clamp-2">{subItem.label}</p>
                              </motion.div>
                            </Link>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Mobile/Tablet Version - Horizontal Scroll */}
                <motion.div
                  className="fixed top-0 right-0 left-0 z-50 mb-3 w-full overflow-visible lg:hidden"
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="border-border dark:border-border bg-popover/90 dark:bg-popover/90 rounded-xl border p-3 shadow-md backdrop-blur-md">
                    <div className="mb-2 flex items-center justify-between px-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-primary/10 dark:bg-primary/20 flex h-6 w-6 items-center justify-center rounded-lg">
                          <FontAwesomeIcon
                            className="text-primary dark:text-primary h-3 w-3"
                            icon={expandedMenu?.icon || faHome}
                          />
                        </div>
                        <h3 className="text-popover-foreground dark:text-popover-foreground text-xs font-bold capitalize">
                          {expandedMenu.label}
                        </h3>
                      </div>

                      {/* Close submenu button on mobile */}
                      <Button
                        onClick={() => setExpandedMenu(null)}
                        variant="ghost"
                        size="icon"
                        className="bg-muted/70 dark:bg-muted/70 text-muted-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-muted h-10 min-h-[44px] w-10 min-w-[44px] rounded-full"
                        asChild
                      >
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex items-center justify-center"
                        >
                          <FontAwesomeIcon icon={faTimes} className="h-4 w-4" />
                        </motion.div>
                      </Button>
                    </div>

                    <div className="scrollbar-hide -mx-3 flex overflow-x-auto px-3 pb-2">
                      <div className="flex gap-3 py-1">
                        {expandedMenu?.submenu?.map((subItem, index) => (
                          <motion.div
                            key={subItem.id}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex-shrink-0"
                          >
                            <Link
                              to={subItem.path}
                              className="group"
                              onClick={() => setExpandedMenu(null)}
                            >
                              <motion.div
                                className={classNames(
                                  "flex min-h-[44px] items-center rounded-lg px-4 py-2.5 text-sm whitespace-nowrap transition-all duration-200",
                                  isRouteActive(subItem.path)
                                    ? "from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 border-primary dark:border-primary text-primary dark:text-primary border-b-2 bg-gradient-to-r font-medium"
                                    : "text-muted-foreground dark:text-muted-foreground hover:bg-muted/50 dark:hover:bg-muted/50 hover:text-foreground dark:hover:text-foreground border-b-2 border-transparent",
                                )}
                                whileHover={{ y: -2 }}
                                transition={{
                                  type: "spring",
                                  stiffness: 400,
                                  damping: 25,
                                }}
                              >
                                {subItem.label}
                              </motion.div>
                            </Link>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Main Content Area - Mobile optimized spacing and layout */}
          <div
            className={classNames(
              "flex min-w-0 flex-1 flex-col gap-2 overflow-auto sm:gap-3 md:gap-4",
              expandedMenu?.submenu && expandedMenu?.submenu.length > 0
                ? "pt-16 sm:pt-18 md:pt-20 lg:pt-0"
                : "",
            )}
          >
            {/* Header - Responsive spacing */}
            <motion.div
              className="transition-all duration-300"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <BreadCrumbsHeader />
            </motion.div>

            {/* Dashboard Content - Mobile optimized padding and layout */}
            <motion.main
              className="border-border dark:border-border bg-moneko-background mobile-scroll h-full flex-1 overflow-auto rounded-lg p-0 sm:rounded-xl lg:border lg:shadow-md lg:backdrop-blur-md xl:p-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Outlet />
            </motion.main>
          </div>

          {/* Right Sidebar - Desktop */}
          <RightSidebar
            className="hidden lg:block"
            ref={rightSidebarRef}
            isGuideHidden={isGuideHidden}
            showGuide={showGuide}
          />

          {/* Mobile Expandable FAB - Only visible on mobile */}
          <div className="lg:hidden">
            <ExpandableFAB
              options={[
                {
                  id: "advisor",
                  label: "Financial Advisor",
                  icon: monekoLogo,
                  gradient:
                    "bg-gradient-to-br from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90",
                  onClick: () => openChat("advisor"),
                },
                {
                  id: "educator",
                  label: "Financial Educator",
                  icon: finniLogo,
                  gradient:
                    "bg-gradient-to-br from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600",
                  onClick: () => openChat("educator"),
                },
                ...(isGuideHidden && showGuide
                  ? [
                      {
                        id: "guide",
                        label: "",
                        icon: faLightbulb,
                        gradient:
                          "bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700",
                        onClick: showGuide,
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        </div>
      </div>
      {/* AI Chat Drawer - Mobile optimized full screen experience */}
      <AnimatePresence>
        {aiChatOpen && (
          <>
            {/* Backdrop - More prominent on mobile */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm sm:bg-black/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => closeChat()}
            />

            {/* Drawer - Mobile-first responsive sizing */}
            <motion.div
              className="fixed top-0 right-0 z-50 flex h-full w-full flex-col overflow-hidden sm:w-screen md:w-[90vw] lg:w-[50rem]"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              {/* Chat Interface Content - Optimized for mobile touch interaction */}
              <div className="h-full w-full">
                {selectedAI === "advisor" && <FinancialAdvisorChatInterface />}

                {selectedAI === "educator" && (
                  <FinancialEducatorChatInterface />
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {!isGuideHidden && (
        <FloatingGuideWindow onClose={() => setIsGuideHidden(true)} />
      )}
    </ProtectedRouteSubscription>
  );
}
