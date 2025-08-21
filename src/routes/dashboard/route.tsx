import BreadCrumbsHeader from "@/components/ui/breadcrumbs";
import {
  Outlet,
  createFileRoute,
  Link,
  useLocation,
} from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { useChatContext } from "@/contexts/chat-context";
import { getCanonicalUrl } from '@/utils/canonical';
import { useUserCourses } from "@/services/course-service";
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
  faChartBar,
  faIdCard,
  faHeadphones,
  faCrown,
  faTrophy,
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
import { FinancialAdvisorChatInterface } from "@/components/chat/financial-advisor-chat-interface";
import { FinancialEducatorChatInterface } from "@/components/chat/financial-educator-chat-interface";
import { useAIChat } from "@/contexts/ai-chat-context";
import { GoalTrackerChatInterface } from "@/components/chat/goal-tracker-chat-interface";
import { RightSidebar, RightSidebarRef } from "@/components/dashboard/RightSidebar";
import { ProtectedRouteSubscription } from "@/components/auth/ProtectedRouteSubscription";
import { useDashboardGuidance } from "@/hooks/useDashboardGuidance";

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
}

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => {
    // Add canonical URL for dashboard page
    const pageUrl = getCanonicalUrl('/dashboard');
    
    return {
      meta: [
        {
          title: 'Portfolio | Moneko',
        },
        {
          name: 'description',
          content: 'Your personalized financial education portfolio. Access learning materials, and tools.',
        },
      ],
      link: [
        {
          rel: 'canonical',
          href: pageUrl
        }
      ]
    };
  },
});

export function Dashboard() {
  // Query client for cache invalidation
  const queryClient = useQueryClient();
  
  // AI Chat context
  const { isOpen: aiChatOpen, selectedAI, openChat, closeChat, clearAllMessages } = useAIChat();
  
  // Chat context for conversation management
  const { clearAllConversations } = useChatContext();
  
  // Track chat usage
  useEffect(() => {
    if (aiChatOpen) {
      trackUserAction('chat_used', { aiType: selectedAI });
    }
  }, [aiChatOpen, selectedAI]);
  
  // Use route matching instead of local state for active menu
  const location = useLocation();
  const [expandedMenu, setExpandedMenu] = useState<MenuItem | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const rightSidebarRef = useRef<RightSidebarRef>(null);

  // Initialize dashboard guidance system
  const { trackUserAction, updatePreferences, hideAllTooltips, resetGuidanceState, getGuidanceStats } = useDashboardGuidance({
    enabled: true,
    frequencyLevel: 'medium',
    sidebarRef: rightSidebarRef
  });

  const { user, signOut, isLoading } = useAuth();
  const { data: courses = [] } = useUserCourses(
    user?.id ?? "",
    { enabled: !!user },
  );
  const { isActive,isLoading: isSubscriptionLoading } = useSubscription(user?.id);
  const { markCalculatorsVisited } = useLocalProgress();
  const { getCookie, setCookie } = useCookie();
  const [isGuideHidden, setIsGuideHidden] = useState(getCookie('moneko-guide-hidden') === 'true');
  const [hasCheckedGuestGoals, setHasCheckedGuestGoals] = useState(false);
  const [hasCheckedGuestProfiles, setHasCheckedGuestProfiles] = useState(false);
  const {refetch}=useGoals(user?.id)
  const showGuide = () => {
    setCookie('moneko-guide-hidden', 'false', { days: 365 });
    setIsGuideHidden(false);
  };

  // Guest goals migration utility functions
  const getGuestGoalIds = ()=> {
    const goalIds = getCookie('moneko-guest-goals');
    return goalIds ? JSON.parse(goalIds) : [];
  }

  const clearGuestGoalIds = () => {
    document.cookie = 'moneko-guest-goals=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }

  // Guest financial health profile migration utility functions
  const getGuestProfileIds = () => {
    const profileIds = getCookie('moneko-guest-profiles');
    return profileIds ? JSON.parse(profileIds) : [];
  }

  const clearGuestProfileIds = () => {
    document.cookie = 'moneko-guest-profiles=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }

  // Migrate guest goals to authenticated user
  const migrateGuestGoals = async (userId: string) => {
    if(!userId){
      return;
    }
    const guestGoalIds = getGuestGoalIds();
    
    if (guestGoalIds.length === 0) {
      return;
    }
    
    try {
      console.log(`Migrating ${guestGoalIds.length} guest goals to user ${userId}`);
      
      // Update each guest goal with the user ID and log activity
      for (const goalId of guestGoalIds) {
        // Update the goal with user ID
        const { data:goalData,error: updateError } = await supabase
          .from('financial_goals')
          .update({ user_id: userId })
          .eq('id', goalId)
          .is('user_id', null);
        console.log("data",goalData)
        if (updateError) {
          console.error(`Failed to migrate guest goal ${goalId}:`, updateError);
          return;
        }
        refetch();
        
        // Track goal creation for guidance system
        trackUserAction('goal_created', { goalId: goalData.id, goalTitle: goalData.title });
        
        // Log the goal creation activity with original creation timestamp
        try {
          await logUserActivity(userId, {
            type: 'goal',
            action: ActivityActions.GOAL_CREATED,
            source: 'ai-goal-generator-migration',
            metadata: {
              goalId: goalData.id,
              goalTitle: goalData.title,
              goalType: goalData.goal_type,
              targetAmount: goalData.target_amount,
              targetDate: goalData.target_date,
              migratedFromGuest: true,
              originalCreatedAt: goalData.created_at
            },
            timestamp: goalData.created_at // Use original creation time
          });
          
          console.log(`Successfully migrated guest goal ${goalId} to user ${userId} with activity log`);
        } catch (activityError) {
          console.warn(`Failed to log activity for migrated goal ${goalId}:`, activityError);
          // Continue even if activity logging fails
        }
      }
      
      // Clear guest goal IDs after successful migration
      clearGuestGoalIds();
      setHasCheckedGuestGoals(true);
      console.log(`Completed migration of ${guestGoalIds.length} guest goals with activity logging`);
      
    } catch (error) {
      console.error('Failed to migrate guest goals:', error);
    }
  }

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
      console.log(`Migrating ${guestProfileIds.length} guest financial health profiles to user ${userId}`);
      
      let successfulMigrations = 0;
      
      // Update each guest profile with the user ID
      for (const profileId of guestProfileIds) {
        // Update the profile with user ID and get the updated data
        const { data: updatedProfile, error: updateError } = await supabase
          .from('financial_health_profiles')
          .update({ user_id: userId })
          .eq('id', profileId)
          .is('user_id', null)
          .select('id, profile_description, created_at')
          .single();
        
        if (updateError) {
          console.error(`Failed to migrate guest profile ${profileId}:`, updateError);
          continue;
        }
        
        if (updatedProfile) {
          successfulMigrations++;
          console.log(`Successfully migrated guest financial health profile ${profileId} to user ${userId}`);
          console.log(`Profile created at: ${updatedProfile.created_at}`);
        }
      }
      
      // Clear guest profile IDs after migration attempt
      clearGuestProfileIds();
      setHasCheckedGuestProfiles(true);
      
      if (successfulMigrations > 0) {
        console.log(`Completed migration of ${successfulMigrations}/${guestProfileIds.length} guest financial health profiles`);
        
        // Show a toast notification to the user about the successful migration
        if (typeof toast !== 'undefined') {
          toast.success(`Successfully migrated your ${successfulMigrations} financial profile${successfulMigrations > 1 ? 's' : ''} to your account!`);
        }
      } else if (guestProfileIds.length > 0) {
        console.warn('No guest profiles were successfully migrated');
      }
      
    } catch (error) {
      console.error('Failed to migrate guest profiles:', error);
    }
  }

  // Handle guest goal and profile migration on login
  useEffect(() => {
    if (user?.id && !hasCheckedGuestGoals) {
      console.log('User logged in, checking for guest goals to migrate...');
      const guestGoalIds = getGuestGoalIds();
      console.log('Found guest goal IDs:', guestGoalIds);
      migrateGuestGoals(user.id);
    }
    if (user?.id && !hasCheckedGuestProfiles) {
      console.log('User logged in, checking for guest profiles to migrate...');
      const guestProfileIds = getGuestProfileIds();
      console.log('Found guest profile IDs:', guestProfileIds);
      migrateGuestProfiles(user.id);
    }
  }, [user]);


  // Helper function to check if a route is active
  const isRouteActive = (path: string) => {
    const currentPath = location.pathname;
    
    // Special case for dashboard root - exact match only
    if (path === "/dashboard") {
      return (
        currentPath === "/dashboard" ||
        currentPath === "/dashboard/"
      );
    }
    
    // For main menu items (not submenu items)
    const mainMenuPaths = menuItems.map(item => item.path);
    if (mainMenuPaths.includes(path)) {
      // Extract the section from both paths
      const pathSection = path.split('/')[2];
      const currentSection = currentPath.split('/')[2];
      
      // If the section matches, this main menu item is active
      if (pathSection && currentSection && pathSection === currentSection) {
        return true;
      }
    }
    
    // For submenu items, use exact matching
    return currentPath === path;
  };


  const menuItems = [
    { id: "home", label: "Home", icon: faHouseChimney, path: "/dashboard"},
    { id: "tracker", label: "Goal Guide", icon: faTrophy, path: "/dashboard/tracker"},
    { id: "portfolio", label: "Portfolio", icon: faHandHoldingDollar, path: "/dashboard/portfolio"},
    {
      id: "learning",
      label: "Learning",
      icon: faChessKnight,
      path: "/dashboard/learning",
    },
  ];


  // Effect to handle menu expansion based on current route (simplified since no submenus)
  useEffect(() => {
    // Clear expanded menu since we no longer use submenus
    setExpandedMenu(null);
  }, [location.pathname]);

  const handleSignOut = async () => {
    try {
      const result = await signOut();
      if (result.success) {
        // Clear all chat context state immediately
        clearAllMessages(); // Clear AI chat messages (ai-chat-context)
        clearAllConversations(); // Clear all conversations (chat-context)
        
        // Invalidate all TanStack Query cache on signout
        queryClient.invalidateQueries();
        
        // Clear all chat-related localStorage data
        if (typeof window !== 'undefined') {
          localStorage.removeItem('ai-chat-messages');
          // Clear any other chat-related storage
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('chat') || key.includes('conversation') || key.includes('message'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => localStorage.removeItem(key));
          
          // Clear guest session cookies
          document.cookie = "moneko-guest-session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        }
        
        toast.success("You have been signed out.");
      }
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };


  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // if(true)
  // {
  //   return   <div className="fixed w-screen h-screen z-20 flex items-center justify-center overflow-hidden">
  //   {/* Background Image Carousel */}
  //   <div className="absolute inset-0 w-full h-full overflow-hidden">
  //     <motion.div 
  //       className="flex w-[200%] h-full"
  //       animate={{
  //         x: ["0%", "-50%"]
  //       }}
  //       transition={{
  //         x: {
  //           duration: 40,
  //           ease: "linear",
  //           repeat: Infinity,
  //           repeatType: "loop"
  //         }
  //       }}
  //     >
  //       <div 
  //         className="w-1/2 h-full flex-shrink-0" 
  //         style={{
  //           backgroundImage: `url(${dashboardHomeImage})`,
  //           backgroundSize: 'cover',
  //           backgroundPosition: 'center',
  //         }}
  //       />
  //       <div 
  //         className="w-1/2 h-full flex-shrink-0" 
  //         style={{
  //           backgroundImage: `url(${dashboardHomeImage})`,
  //           backgroundSize: 'cover',
  //           backgroundPosition: 'center',
  //         }}
  //         aria-hidden="true"
  //       />
  //   </motion.div>
  //     </div>
                 

    
  //   {/* Animation is handled through inline styles */}                 
    
  //   {/* Modal Content */}
  //   <motion.div
  //     className="relative z-10 max-w-2xl w-full mx-4 p-8 rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 shadow-2xl"
  //     initial={{ opacity: 0, y: 20, scale: 0.95 }}
  //     animate={{ opacity: 1, y: 0, scale: 1 }}
  //     transition={{ duration: 0.5 }}
  //   >
  //     {/* Logo and Glow Effect */}
  //     <div className="relative flex justify-center mb-8">
  //       <div className="absolute -top-4 opacity-70 w-24 h-24 bg-primary/30 rounded-full blur-xl" />
  //       <motion.div
  //         className="relative z-10 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-purple-500 shadow-lg shadow-purple-500/30"
  //         initial={{ rotateY: 0 }}
  //         animate={{ rotateY: 360 }}
  //         transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
  //       >
  //         <img src={logo} className="size-16" alt="Moneko Logo" />
  //       </motion.div>
  //     </div>

  //     <motion.h2
  //       className="mb-4 text-center bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-3xl font-bold text-transparent"
  //       initial={{ opacity: 0 }}
  //       animate={{ opacity: 1 }}
  //       transition={{ delay: 0.2, duration: 0.5 }}
  //     >
  //       Unlock Your Financial Dashboard
  //     </motion.h2>

  //     <motion.p
  //       className="mb-6 text-center text-lg text-gray-700 dark:text-gray-300"
  //       initial={{ opacity: 0 }}
  //       animate={{ opacity: 1 }}
  //       transition={{ delay: 0.3, duration: 0.5 }}
  //     >
  //       Sign in to access your personalized financial command center
  //     </motion.p>
      
  //     {/* Feature List */}
  //     <motion.div
  //       className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4"
  //       initial={{ opacity: 0 }}
  //       animate={{ opacity: 1 }}
  //       transition={{ delay: 0.4, duration: 0.5 }}
  //     >
  //       {[
  //         { icon: faChartLine, text: "Track your financial progress" },
  //         { icon: faCalculator, text: "Access premium calculators" },
  //         { icon: faBookOpen, text: "Save your learning progress" },
  //         { icon: faUser, text: "Get personalized insights" }
  //       ].map((feature, index) => (
  //         <motion.div 
  //           key={index}
  //           className="flex items-center p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-white/20 dark:border-slate-700/30"
  //           initial={{ opacity: 0, x: -10 }}
  //           animate={{ opacity: 1, x: 0 }}
  //           transition={{ delay: 0.5 + (index * 0.1), duration: 0.4 }}
  //         >
  //           <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/80 to-purple-500/80 text-white shadow-md">
  //             <FontAwesomeIcon icon={feature.icon} className="h-5 w-5" />
  //           </div>
  //           <span className="ml-3 text-sm md:text-base font-medium text-gray-700 dark:text-gray-200">
  //             {feature.text}
  //           </span>
  //         </motion.div>
  //       ))}
  //     </motion.div>

  //     <motion.div
  //       className="flex justify-center"
  //       initial={{ opacity: 0, y: 10 }}
  //       animate={{ opacity: 1, y: 0 }}
  //       transition={{ delay: 0.8, duration: 0.5 }}
  //     >
  //       <Link to="/login" className="group w-full sm:w-auto">
  //         <motion.div
  //           className="flex w-full sm:w-auto items-center justify-center space-x-3 rounded-xl bg-gradient-to-r from-primary to-purple-500 px-8 py-4 text-white shadow-lg shadow-purple-500/30 transition-all duration-200"
  //           whileHover={{ scale: 1.03, y: -2 }}
  //           whileTap={{ scale: 0.98 }}
  //           transition={{
  //             type: "spring",
  //             stiffness: 400,
  //             damping: 25,
  //           }}
  //         >
  //           <FontAwesomeIcon
  //             className="h-5 w-5"
  //             icon={faSignInAlt}
  //           />
  //           <span className="text-lg font-medium">
  //             Sign In to Continue
  //           </span>
  //         </motion.div>
  //       </Link>
  //     </motion.div>
  //   </motion.div>
  // </div>
  // }



  return (
    <ProtectedRouteSubscription>
      {/* Add style tag for custom scrollbar hiding */}
      <style dangerouslySetInnerHTML={{ __html: scrollbarHideStyles }} />
      <div className="lg:h-screen lg:overflow-hidden bg-gradient-to-br from-background dark:from-dark-background to-purple-300/30 dark:to-purple-800/20 p-2 sm:p-4 font-sans">
        <div className="flex flex-col md:flex-row h-full gap-3 overflow-hidden">
      {/* Mobile Menu Toggle Button - Only visible on mobile */}
      <div className="flex items-center justify-between md:hidden mb-3">
        <Link to="/" className="flex items-center space-x-3">
          <div className="bg-icon flex h-10 w-10 items-center justify-center rounded-xl shadow-sm">
            <OptimizedImage src={logo} alt="Moneko Logo" className="h-6 w-6" />
          </div>
          {/* <span className="text-xl font-bold tracking-tight text-foreground dark:text-dark-foreground"> */}
        </Link>
        <motion.button 
          onClick={toggleMobileMenu}
          className={classNames(
            "rounded-lg p-2 shadow-sm transition-all duration-300",
            mobileMenuOpen 
              ? "bg-red-100/70 dark:bg-red-900/30 text-red-500 dark:text-red-400" 
              : "bg-white/70 dark:bg-gray-800/70 text-gray-700 dark:text-gray-300"
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FontAwesomeIcon 
            icon={mobileMenuOpen ? faTimes : faBars} 
            className={classNames(
              "h-6 w-6 transition-all duration-300",
              mobileMenuOpen ? "text-red-500 dark:text-red-400" : "text-gray-700 dark:text-gray-300"
            )} 
          />
        </motion.button>
      </div>

      {/* Main Sidebar - Card-based Design */}
      <motion.div
        className={classNames(
          "flex-shrink-0 transition-all duration-300 ease-in-out",
          mobileMenuOpen ? "block" : "hidden md:block",
          "w-full md:w-64 md:max-h-full md:overflow-y-auto"
        )}
        initial={{ x: -64, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex h-full flex-col rounded-2xl border border-gray-100 dark:border-gray-700 bg-white/70 dark:bg-gray-800/80 shadow-sm">
          <div className="flex-1 py-6">
            {/* Logo Section - Hidden on mobile (shown in top bar) */}
            <div className="mb-6 ml-4 hidden md:block">
              <Link to="/" className="flex items-center space-x-3 mb-4">
                <div className="bg-icon flex h-10 w-10 items-center justify-center rounded-xl shadow-sm">
                  <OptimizedImage src={logo} alt="Moneko Logo" className="h-6 w-6" />
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground dark:text-dark-foreground">
                  Moneko
                </span>
              </Link>
              
           
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 space-y-2 px-4 h-full">
              {menuItems.map((item) => (
                <div key={item.id}>
                  <Link 
                    to={item.path} 
                    className="group"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      // Track visits for calculators
                      if (item.id === 'calculators') {
                        markCalculatorsVisited();
                      }
                      // Track learning and portfolio visits
                      if (item.id === 'learning') {
                        trackUserAction('learning_visited');
                      }
                      if (item.id === 'portfolio') {
                        trackUserAction('portfolio_visited');
                      }
                    }}
                  >
                    <motion.div
                      className={`flex w-full items-center justify-between px-4 py-3 transition-all duration-200 ${
                        isRouteActive(item.path)
                          ? "border-l-4 border-primary dark:border-dark-primary text-primary dark:text-dark-primary"
                          : "border-l-4 border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-50/70 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-100"
                      }`}
                      whileTap={{ scale: 0.98 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 25,
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                            isRouteActive(item.path)
                              ? ""
                              : "group-hover:bg-gray-200 dark:group-hover:bg-gray-600"
                          }`}
                        >
                          <FontAwesomeIcon
                            className={`size-5 ${
                              isRouteActive(item.path)
                                ? "text-primary dark:text-dark-primary"
                                : "text-gray-600 dark:text-gray-400"
                            }`}
                            icon={item.icon}
                          />
                        </div>
                        <span className="text-md font-medium">
                          {item.label}
                        </span>
                      </div>
                    </motion.div>
                  </Link>
                </div>
              ))}
        


            </nav>
          </div>

          {/* User Profile Section */}
          <div className="border-t border-gray-100 dark:border-gray-700 p-4 relative">
            {isLoading||isSubscriptionLoading ? (
              <div className="flex animate-pulse items-center space-x-3 rounded-lg px-4 py-3">
                <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600"></div>
                <div className="flex-1">
                  <div className="mb-1 h-3 w-24 rounded bg-gray-200 dark:bg-gray-600"></div>
                  <div className="h-2 w-32 rounded bg-gray-200 dark:bg-gray-600"></div>
                </div>
              </div>
            ) : user ? (
              <>
                <motion.div 
                  className="flex items-center space-x-3 rounded-lg py-3 w-full overflow-x-hidden cursor-pointer hover:bg-gray-50/70 dark:hover:bg-gray-700/50 transition-all duration-200"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="relative flex-shrink-0">
                    {/* Premium Border Container */}
                    <div className={`relative rounded-full p-0.5 ${
                      isActive 
                        ? 'bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 shadow-lg shadow-amber-500/30' 
                        : ''
                    }`}>
                      {/* Profile Picture */}
                      <div className={`flex size-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 text-sm font-semibold text-white ${
                        isActive ? 'shadow-md' : 'shadow-sm'
                      }`}>
                        {user.user_metadata?.full_name.charAt(0).toUpperCase() || "U"}
                      </div>
                    </div>
                    
                    {/* Premium Crown Icon */}
                    {isActive && (
                      <div className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 shadow-md">
                        <FontAwesomeIcon 
                          icon={faCrown} 
                          className="size-2.5 text-amber-900" 
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground dark:text-dark-foreground">
                      {user.user_metadata?.full_name || "User"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                  </div>
                 
                </motion.div>

                {/* User Menu Popup */}
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* Settings Option */}
                      <Link 
                        to="/dashboard/user-settings" 
                        className="block"
                        onClick={() => {
                          setUserMenuOpen(false);
                          setMobileMenuOpen(false);
                        }}
                      >
                        <motion.div
                          className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
                          whileHover={{ x: 2 }}
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                            <FontAwesomeIcon
                              className="h-4 w-4 text-gray-600 dark:text-gray-400"
                              icon={faCog}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Settings
                          </span>
                        </motion.div>
                      </Link>

                      {/* Profile Option */}
                      <Link 
                        to="/dashboard/user-settings/profile" 
                        className="block"
                        onClick={() => {
                          setUserMenuOpen(false);
                          setMobileMenuOpen(false);
                        }}
                      >
                        <motion.div
                          className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
                          whileHover={{ x: 2 }}
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                            <FontAwesomeIcon
                              className="h-4 w-4 text-gray-600 dark:text-gray-400"
                              icon={faUser}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Profile
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
                          className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
                          whileHover={{ x: 2 }}
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                            <FontAwesomeIcon
                              className="h-4 w-4 text-gray-600 dark:text-gray-400"
                              icon={faIdCard}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Membership
                          </span>
                        </motion.div>
                      </Link>
                      <a 
                        href="mailto:hello@moneko.io"
                        className="block"
                      
                      >
                        <motion.div
                          className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
                          whileHover={{ x: 2 }}
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                            <FontAwesomeIcon
                              className="h-4 w-4 text-gray-600 dark:text-gray-400"
                              icon={faHeadphones}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Support
                          </span>
                        </motion.div>
                      </a>

                      {/* Divider */}
                      <div className="border-t border-gray-200 dark:border-gray-700" />

                      {/* Logout Option */}
                      <motion.div
                        className="flex items-center space-x-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200 cursor-pointer"
                        onClick={() => {
                          setUserMenuOpen(false);
                          setMobileMenuOpen(false);
                          handleSignOut();
                        }}
                        whileHover={{ x: 2 }}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
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
              <Link to="/login" search={{redirect: "/dashboard"}} className="group">
                <motion.div
                  className="flex items-center space-x-3 rounded-lg px-4 py-3 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  whileHover={{ x: 3 }}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <FontAwesomeIcon
                      icon={faSignInAlt}
                      className="h-5 w-5 text-primary dark:text-dark-primary"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground dark:text-dark-foreground">
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
                "hidden lg:block w-56",
                "transition-all duration-300 ease-in-out"
              )}
              initial={{ x: -64, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -64, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className="h-full rounded-2xl border border-gray-100 dark:border-gray-700 bg-white/70 dark:bg-gray-800/80 shadow-sm">
                <div className="p-6">
                  <div className="mb-6 flex items-center space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <FontAwesomeIcon
                        className="h-4 w-4 text-primary dark:text-dark-primary"
                        icon={expandedMenu?.icon || faHome}
                      />
                    </div>
                    <h3 className="text-sm font-bold capitalize text-foreground dark:text-dark-foreground">
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
                            className={`block w-full rounded-lg px-4 py-3 text-left text-sm transition-all duration-200 ${
                              isRouteActive(subItem.path)
                                ? "border-l-3 border-primary dark:border-dark-primary bg-purple-50/50 dark:bg-purple-900/20 font-medium text-primary dark:text-dark-primary"
                                : "border-l-3 border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50/70 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-100"
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
              className="lg:hidden w-full mb-3 overflow-visible fixed top-0 left-0 right-0 z-50"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-md p-3">
                <div className="flex items-center justify-between mb-2 px-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <FontAwesomeIcon
                        className="h-3 w-3 text-primary dark:text-dark-primary"
                        icon={expandedMenu?.icon || faHome}
                      />
                    </div>
                    <h3 className="text-xs font-bold capitalize text-foreground dark:text-dark-foreground">
                      {expandedMenu.label}
                    </h3>
                  </div>
                  
                  {/* Close submenu button on mobile */}
                  <motion.button
                    onClick={() => setExpandedMenu(null)}
                    className="rounded-full bg-gray-100/70 dark:bg-gray-700/70 p-1 text-gray-500 dark:text-gray-400"
                    whileHover={{ scale: 1.1, backgroundColor: "#f3f4f6" }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FontAwesomeIcon icon={faTimes} className="h-3 w-3" />
                  </motion.button>
                </div>
                
                <div className="flex overflow-x-auto pb-2 scrollbar-hide -mx-3 px-3">
                  <div className="flex space-x-3 py-1">
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
                              "whitespace-nowrap rounded-lg px-4 py-2 text-sm transition-all duration-200",
                              isRouteActive(subItem.path) 
                                ? "bg-gradient-to-r from-primary/10 dark:from-dark-primary/10 to-purple-400/10 dark:to-purple-600/10 border-b-2 border-primary dark:border-dark-primary font-medium text-primary dark:text-dark-primary" 
                                : "border-b-2 border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50/70 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-100"
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
   
      {/* Main Content Area */}
     <div className={classNames(
       "flex min-w-0 flex-1 flex-col gap-2 md:gap-4 overflow-auto",
       expandedMenu?.submenu && expandedMenu?.submenu.length > 0 ? "pt-20 lg:pt-0" : ""
     )}>
        {/* Header - Always visible regardless of submenu state */}
        <motion.div
          className="transition-all duration-300"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <BreadCrumbsHeader />
        </motion.div>

        {/* Dashboard Content */}
        <motion.main
          className="h-full flex-1 overflow-auto rounded-xl border border-gray-100/80 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-md"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >                         
                <Outlet />             
           
        </motion.main>
          </div>

          {/* Right Sidebar */}
          <RightSidebar 
            className="hidden lg:block" 
            ref={rightSidebarRef}
            isGuideHidden={isGuideHidden}
            showGuide={showGuide}
          />
        </div>
      </div>
      {/* AI Chat Drawer */}
      <AnimatePresence>
        {aiChatOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => closeChat()}
            />
            
            {/* Drawer */}
            <motion.div
              className="fixed right-0 top-0 h-full w-screen lg:w-[50rem] z-50 flex flex-col overflow-hidden"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              {/* Chat Interface Content - Full Height with proper styling */}
              <div className="h-full w-full">
                {selectedAI === 'advisor' && (
                  <FinancialAdvisorChatInterface />
                )}
                
                {selectedAI === 'educator' && (
                  <FinancialEducatorChatInterface />
                )}                
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {!isGuideHidden && <FloatingGuideWindow onClose={() => setIsGuideHidden(true)} />}
    </ProtectedRouteSubscription>
  );
}
