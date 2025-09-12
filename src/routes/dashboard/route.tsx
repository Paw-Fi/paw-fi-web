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
// Removed useAuthQuerySync import - now handled at root level
import { getCanonicalUrl } from '@/utils/canonical';
import { seo } from '@/utils/seo';
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
import { ExpandableFAB } from "@/components/ui/expandable-fab";
import { useAIChat } from "@/contexts/ai-chat-context";
import { RightSidebar, RightSidebarRef } from "@/components/dashboard/RightSidebar";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ProtectedRouteSubscription } from "@/components/auth/ProtectedRouteSubscription";
import { useDashboardGuidance } from "@/hooks/useDashboardGuidance";
import { Button } from "@/components/ui/button";
import monekoLogo from '@/assets/images/logo/moneko.png';
import finniLogo from '@/assets/images/logo/finni.png';

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
    const title = 'Personal Finance Dashboard - AI Portfolio Tracking | Moneko';
    const description = 'Access comprehensive financial dashboard with AI portfolio tracking, learning paths, goal management & smart calculators.';
    const keywords = 'personal finance dashboard, portfolio tracking, AI financial coach, financial education platform, investment tracking, budgeting tools, financial goal tracker, wealth building dashboard';
    const imageUrl = 'https://moneko.io/og-img.png';

    const meta = seo({
      title,
      description,
      keywords,
      url: pageUrl,
      image: imageUrl,
    });

    // Comprehensive structured data for dashboard
    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://moneko.io/#organization",
          "name": "Moneko",
          "url": "https://moneko.io",
          "logo": "https://moneko.io/icon.svg",
          "sameAs": [
            "https://www.facebook.com/monekoai/",
            "https://www.instagram.com/moneko_ai/",
            "https://x.com/moneko_ai"
          ]
        },
        {
          "@type": "WebSite",
          "@id": "https://moneko.io/#website",
          "name": "Moneko",
          "url": "https://moneko.io",
          "publisher": {
            "@id": "https://moneko.io/#organization"
          }
        },
        {
          "@type": "WebPage",
          "@id": pageUrl,
          "url": pageUrl,
          "name": title,
          "description": description,
          "isPartOf": {
            "@id": "https://moneko.io/#website"
          },
          "about": [
            {
              "@type": "Thing",
              "name": "Personal Finance Management"
            },
            {
              "@type": "Thing", 
              "name": "Portfolio Tracking"
            },
            {
              "@type": "Thing",
              "name": "Financial Education"
            }
          ],
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://moneko.io"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Dashboard",
                "item": pageUrl
              }
            ]
          },
          "inLanguage": "en-US"
        },
        {
          "@type": "SoftwareApplication",
          "name": "Moneko Personal Finance Dashboard",
          "applicationCategory": "FinanceApplication",
          "operatingSystem": "Any",
          "description": "Comprehensive personal finance dashboard with AI-powered portfolio tracking, goal management, and financial education tools",
          "url": pageUrl,
          "author": {
            "@id": "https://moneko.io/#organization"
          },
          "publisher": {
            "@id": "https://moneko.io/#organization"
          },
          "featureList": [
            "AI-powered portfolio analysis and tracking",
            "Personalized financial goal setting and monitoring",
            "Interactive financial education courses",
            "Smart budgeting and spending analysis",
            "Investment performance tracking",
            "Debt management tools",
            "Retirement planning calculators",
            "Real-time financial health scoring"
          ],
          "offers": [
            {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD",
              "name": "Basic Plan",
              "description": "Free access to basic portfolio tracking and financial calculators"
            },
            {
              "@type": "Offer",
              "price": "9.99",
              "priceCurrency": "USD",
              "name": "Premium Plan",
              "description": "Full AI coaching, advanced analytics, and personalized recommendations",
              "priceSpecification": {
                "@type": "UnitPriceSpecification",
                "price": "9.99",
                "priceCurrency": "USD",
                "unitText": "month"
              }
            }
          ]
        },
        {
          "@type": "Service",
          "name": "AI Financial Coaching",
          "description": "Personalized AI-powered financial coaching and education",
          "provider": {
            "@id": "https://moneko.io/#organization"
          },
          "serviceType": "Financial Education and Coaching",
          "areaServed": "Worldwide",
          "audience": {
            "@type": "Audience",
            "audienceType": "Individual Investors and Savers"
          }
        }
      ]
    };
    
    return {
      title,
      meta,
      link: [
        {
          rel: 'canonical',
          href: pageUrl
        }
      ],
      script: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData),
        },
      ],
    };
  },
});

export function Dashboard() {
  // Auth query sync is now handled at root level - removed redundant call
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
    { id: "income-builder", label: "Income Builder", icon: faHammer, path: "/dashboard/income-builder"},

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

  return (
    <ProtectedRouteSubscription>
      {/* Add style tag for custom scrollbar hiding */}
      <style dangerouslySetInnerHTML={{ __html: scrollbarHideStyles }} />
      <div className="lg:h-screen lg:overflow-hidden lg:bg-gradient-to-br from-background dark:from-dark-background to-purple-300/30 dark:to-purple-800/20 p-4 sm:p-5 md:p-6 lg:p-4 font-sans mobile-text-optimize">
        <div className="flex flex-col md:flex-row h-full gap-3 sm:gap-4 md:gap-3 overflow-hidden">
      {/* Mobile Header - Optimized for touch and readability */}
      <div className="flex items-center justify-between md:hidden mb-3 sm:mb-4 px-4 py-2">
        <Link to="/" className="flex items-center space-x-2 sm:space-x-3 py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors touch-manipulation">
          <div className="bg-icon flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl shadow-sm">
            <OptimizedImage src={logo} alt="Moneko Logo" className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
            Moneko
          </span>
        </Link>
        <Button
          onClick={toggleMobileMenu}
          variant="ghost"
          size="icon"
          className={classNames(
            "h-11 w-11 rounded-lg shadow-sm transition-all duration-300 touch-manipulation",
            mobileMenuOpen 
              ? "bg-red-50/70 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100/70 dark:hover:bg-red-900/50" 
              : "bg-background/70 text-foreground hover:bg-muted/70"
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
                mobileMenuOpen ? "text-red-600 dark:text-red-400" : "text-foreground"
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
          "w-full md:w-48 lg:w-52 xl:w-64 md:max-h-full md:overflow-y-auto"
        )}
        initial={{ x: -64, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex h-full flex-col rounded-xl md:rounded-2xl border border-border bg-card/70 backdrop-blur-sm shadow-sm">
          <div className="flex-1 py-3 sm:py-4 md:py-6">
            {/* Logo Section - Hidden on mobile (shown in top bar) */}
            <div className="mb-4 md:mb-6 ml-3 md:ml-4 hidden md:block">
              <Link to="/" className="flex items-center space-x-3 mb-4 py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="bg-icon flex h-10 w-10 items-center justify-center rounded-xl shadow-sm">
                  <OptimizedImage src={logo} alt="Moneko Logo" className="h-6 w-6" />
                </div>
                <span className="text-xl font-bold tracking-tight text-card-foreground">
                  Moneko
                </span>
              </Link>
            </div>

            {/* Navigation Menu - Mobile optimized spacing and touch targets */}
            <nav className="flex-1 space-y-2 sm:space-y-2.5 md:space-y-2 px-4 sm:px-5 md:px-4 h-full mobile-scroll">
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
                      className={`dashboard-nav-item flex w-full items-center justify-between px-4 sm:px-5 py-4 sm:py-4 md:py-3 rounded-lg transition-all duration-200 touch-manipulation ${
                        isRouteActive(item.path)
                          ? "bg-primary/10 border-l-4 border-primary text-primary shadow-sm"
                          : "border-l-4 border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground active:bg-muted/90"
                      }`}
                      whileTap={{ scale: 0.98 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 25,
                      }}
                    >
                      <div className="flex items-center space-x-2.5 sm:space-x-3">
                        <div
                          className={`flex h-8 w-8 sm:h-9 sm:w-9 md:h-8 md:w-8 items-center justify-center rounded-lg transition-colors ${
                            isRouteActive(item.path)
                              ? "bg-primary/15"
                              : "group-hover:bg-muted"
                          }`}
                        >
                          <FontAwesomeIcon
                            className={`h-4 w-4 sm:h-5 sm:w-5 md:h-4 md:w-4 ${
                              isRouteActive(item.path)
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                            icon={item.icon}
                          />
                        </div>
                        <span className="text-sm sm:text-base md:text-sm font-medium leading-tight">
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
          <div className="border-t border-border p-4 sm:p-5 md:p-4 relative">
            {isLoading||isSubscriptionLoading ? (
              <div className="flex animate-pulse items-center space-x-2.5 sm:space-x-3 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-muted"></div>
                <div className="flex-1 min-w-0">
                  <div className="mb-1 h-3 w-20 sm:w-24 rounded bg-muted"></div>
                  <div className="h-2 w-28 sm:w-32 rounded bg-muted"></div>
                </div>
              </div>
            ) : user ? (
              <>
                <motion.div 
                  className="dashboard-user-menu flex items-center space-x-2.5 sm:space-x-3 rounded-lg px-2 py-2.5 sm:py-3 w-full overflow-x-hidden cursor-pointer hover:bg-muted/50 active:bg-muted/70 transition-all duration-200 touch-manipulation"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <UserAvatar 
                    size="md"
                    showPremiumBorder={true}
                    showPremiumCrown={true}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-sm font-medium text-card-foreground truncate">
                      {user.user_metadata?.full_name || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <FontAwesomeIcon 
                      icon={userMenuOpen ? faTimes : faBars}
                      className="h-3.5 w-3.5 text-muted-foreground"
                    />
                  </div>
                </motion.div>

                {/* User Menu Popup */}
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      className="absolute bottom-full left-4 right-4 mb-2 bg-popover rounded-xl shadow-lg border border-border overflow-hidden z-50"
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
                          className="flex items-center space-x-2.5 sm:space-x-3 px-3 sm:px-4 py-3 sm:py-3.5 hover:bg-muted/50 active:bg-muted/70 transition-colors duration-200 touch-manipulation"
                          whileHover={{ x: 1 }}
                        >
                          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-muted">
                            <FontAwesomeIcon
                              className="h-4 w-4 sm:h-4 sm:w-4 text-muted-foreground"
                              icon={faCog}
                            />
                          </div>
                          <span className="text-sm sm:text-sm font-medium text-popover-foreground">
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
                          className="flex items-center space-x-2.5 sm:space-x-3 px-3 sm:px-4 py-3 sm:py-3.5 hover:bg-muted/50 active:bg-muted/70 transition-colors duration-200 touch-manipulation"
                          whileHover={{ x: 1 }}
                        >
                          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-muted">
                            <FontAwesomeIcon
                              className="h-4 w-4 sm:h-4 sm:w-4 text-muted-foreground"
                              icon={faUser}
                            />
                          </div>
                          <span className="text-sm sm:text-sm font-medium text-popover-foreground">
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
                          className="flex items-center space-x-2.5 sm:space-x-3 px-3 sm:px-4 py-3 sm:py-3.5 hover:bg-muted/50 active:bg-muted/70 transition-colors duration-200 touch-manipulation"
                          whileHover={{ x: 1 }}
                        >
                          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-muted">
                            <FontAwesomeIcon
                              className="h-4 w-4 sm:h-4 sm:w-4 text-muted-foreground"
                              icon={faIdCard}
                            />
                          </div>
                          <span className="text-sm sm:text-sm font-medium text-popover-foreground">
                            Membership
                          </span>
                        </motion.div>
                      </Link>
                      <a 
                        href="mailto:hello@moneko.io"
                        className="block"
                      >
                        <motion.div
                          className="flex items-center space-x-2.5 sm:space-x-3 px-3 sm:px-4 py-3 sm:py-3.5 hover:bg-muted/50 active:bg-muted/70 transition-colors duration-200 touch-manipulation"
                          whileHover={{ x: 1 }}
                        >
                          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-muted">
                            <FontAwesomeIcon
                              className="h-4 w-4 sm:h-4 sm:w-4 text-muted-foreground"
                              icon={faHeadphones}
                            />
                          </div>
                          <span className="text-sm sm:text-sm font-medium text-popover-foreground">
                            Support
                          </span>
                        </motion.div>
                      </a>

                      {/* Divider */}
                      <div className="border-t border-border" />

                      {/* Logout Option */}
                      <motion.div
                        className="flex items-center space-x-2.5 sm:space-x-3 px-3 sm:px-4 py-3 sm:py-3.5 hover:bg-red-50/50 dark:hover:bg-red-900/20 active:bg-red-50/70 dark:active:bg-red-900/30 transition-colors duration-200 cursor-pointer touch-manipulation"
                        onClick={() => {
                          setUserMenuOpen(false);
                          setMobileMenuOpen(false);
                          handleSignOut();
                        }}
                        whileHover={{ x: 1 }}
                      >
                        <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-red-100/70 dark:bg-red-900/30">
                          <FontAwesomeIcon
                            className="h-4 w-4 sm:h-4 sm:w-4 text-red-600 dark:text-red-400"
                            icon={faSignOut}
                          />
                        </div>
                        <span className="text-sm sm:text-sm font-medium text-red-600 dark:text-red-400">
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
                  className="flex items-center space-x-2.5 sm:space-x-3 rounded-lg px-3 sm:px-4 py-3 sm:py-3.5 transition-all duration-200 hover:bg-muted/50 active:bg-muted/70 touch-manipulation"
                  whileHover={{ x: 2 }}
                >
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-primary/10">
                    <FontAwesomeIcon
                      icon={faSignInAlt}
                      className="h-4 w-4 sm:h-5 sm:w-5 text-primary"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm sm:text-sm font-medium text-card-foreground">
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
              <div className="h-full rounded-2xl border border-border bg-card/70 backdrop-blur-sm shadow-sm">
                <div className="p-6">
                  <div className="mb-6 flex items-center space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <FontAwesomeIcon
                        className="h-4 w-4 text-primary"
                        icon={expandedMenu?.icon || faHome}
                      />
                    </div>
                    <h3 className="text-sm font-bold capitalize text-card-foreground">
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
                                ? "border-l-3 border-primary bg-primary/5 font-medium text-primary"
                                : "border-l-3 border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
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
              <div className="rounded-xl border border-border bg-popover/90 backdrop-blur-md shadow-md p-3">
                <div className="flex items-center justify-between mb-2 px-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
                      <FontAwesomeIcon
                        className="h-3 w-3 text-primary"
                        icon={expandedMenu?.icon || faHome}
                      />
                    </div>
                    <h3 className="text-xs font-bold capitalize text-popover-foreground">
                      {expandedMenu.label}
                    </h3>
                  </div>
                  
                  {/* Close submenu button on mobile */}
                  <Button
                    onClick={() => setExpandedMenu(null)}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-muted/70 text-muted-foreground hover:bg-muted"
                    asChild
                  >
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center justify-center"
                    >
                      <FontAwesomeIcon icon={faTimes} className="h-3 w-3" />
                    </motion.div>
                  </Button>
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
                                ? "bg-gradient-to-r from-primary/10 to-primary/5 border-b-2 border-primary font-medium text-primary" 
                                : "border-b-2 border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
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
     <div className={classNames(
       "flex min-w-0 flex-1 flex-col gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 overflow-auto",
       expandedMenu?.submenu && expandedMenu?.submenu.length > 0 ? "pt-16 sm:pt-18 md:pt-20 lg:pt-0" : ""
     )}>
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
          className="h-full p-0 sm:p-0 xl:p-4 flex-1 overflow-auto rounded-lg sm:rounded-xl lg:border border-border lg:bg-card/80 lg:backdrop-blur-md lg:shadow-md mobile-scroll"
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
                  id: 'advisor',
                  label: 'Financial Advisor',
                  icon: monekoLogo,
                  gradient: 'bg-gradient-to-br from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90',
                  onClick: () => openChat('advisor')
                },
                {
                  id: 'educator',
                  label: 'Financial Educator', 
                  icon: finniLogo,
                  gradient: 'bg-gradient-to-br from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600',
                  onClick: () => openChat('educator')
                },
                ...(isGuideHidden && showGuide ? [{
                  id: 'guide',
                  label: '',
                  icon: faLightbulb,
                  gradient: 'bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700',
                  onClick: showGuide
                }] : [])
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
              className="fixed inset-0 bg-black/30 sm:bg-black/20 backdrop-blur-sm z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => closeChat()}
            />
            
            {/* Drawer - Mobile-first responsive sizing */}
            <motion.div
              className="fixed right-0 top-0 h-full w-full sm:w-screen md:w-[90vw] lg:w-[50rem] z-50 flex flex-col overflow-hidden"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              {/* Chat Interface Content - Optimized for mobile touch interaction */}
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
