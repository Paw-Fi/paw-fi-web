import BreadCrumbsHeader from "@/components/ui/breadcrumbs";
import {
  Outlet,
  createFileRoute,
  Link,
  useMatchRoute,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useUserCourses } from "@/services/course-service";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBookOpen,
  faCalculator,
  faChartLine,
  faChessKnight,
  faCog,
  faComments,
  faHome,
  faChevronRight,
  faUser,
  faSignInAlt,
  faSignOut,
  faIdBadge,
  faBars,
  faTimes,
  faGauge,
} from "@fortawesome/free-solid-svg-icons";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@assets/images/icon.svg";
import { toast } from "react-toastify";
import basicLessonsData from "@/data/basic-lessons.json";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import classNames from "classnames";


const PROTECTED_ROUTES = [
  "/dashboard",
  "/dashboard/learning",
  "/dashboard/user-settings",
  "/dashboard/membership",
];

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
});

export function Dashboard() {
  // Use route matching instead of local state for active menu
  const matchRoute = useMatchRoute();
  const location = useLocation();
  const [expandedMenu, setExpandedMenu] = useState<MenuItem | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut, isLoading } = useAuth();
  const navigate = useNavigate();
  const { data: courses = [], isLoading: isCoursesLoading } = useUserCourses(
    user?.id ?? "",
    { enabled: !!user },
  );

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

  // Generate dynamic learning submenu from courses
  const learningSubmenu = useMemo<SubMenuItem[]>(() => {
    // Add courses to submenu if they exist
    if (courses && courses.length > 0) {
      const courseItems = courses.map((course) => ({
        id: course.course_id || course.id || `course-${Math.random().toString(36).substring(2, 9)}`, // Ensure ID is always a string
        label: course.title,
        path: `/dashboard/learning/${course.course_id || course.id}`,
      }));
      return courseItems;
    }

    return [];
  }, [courses]);

  const menuItems = [
    { id: "home", label: "Dashboard", icon: faGauge, path: "/dashboard"},
    { id: "chat", label: "AI Chat", icon: faComments, path: "/dashboard/chat" },
    {
      id: "learning",
      label: "Learning",
      icon: faChessKnight,
      path: "/dashboard/learning",
      submenu: learningSubmenu,
    },
    {
      id: "essentials",
      label: "Essentials",
      icon: faBookOpen,
      path: `/dashboard/essentials/your-2025-guide-to-investing`,
      submenu: basicLessonsData.lessons.map((lesson) => ({
        id: lesson.lesson_id,
        label: lesson.title,
        path: `/dashboard/essentials/${basicLessonsData.course_id}/lesson/${lesson.lesson_id}`,
      })),
    },
    {
      id: "calculators",
      label: "Calculators",
      icon: faCalculator,
      path: "/dashboard/calculators",
      submenu: [
        {
          id: "mortgage",
          label: "Mortgage Calculator",
          path: "/dashboard/calculators/mortgage-calculator",
        },
        {
          id: "compound",
          label: "Compound Interest",
          path: "/dashboard/calculators/compound-calculator",
        },
        {
          id: "investment",
          label: "Investment Calculator",
          path: "/dashboard/calculators/investment-calculator",
        },
        {
          id: "retirement",
          label: "Retirement Calculator",
          path: "/dashboard/calculators/retirement-calculator",
        },
        {
          id: "auto-loan",
          label: "Auto Loan Calculator",
          path: "/dashboard/calculators/auto-loan-calculator",
        },
        {
          id: "saving-goals",
          label: "Saving Goals Calculator",
          path: "/dashboard/calculators/saving-goals-calculator",
        },
      ],
    },
    {
      id: "membership",
      label: "Membership",
      icon: faUser,
      path: "/dashboard/membership",
    },
    {
      id: "user-settings",
      label: "Settings",
      icon: faCog,
      path: "/dashboard/user-settings",
    },
  ];

  // Effect to handle menu expansion based on current route
  useEffect(() => {
    const path = location.pathname;
    
    // First check if we're on a main menu path
    const currentMenuItem = menuItems.find((item) => item.path === path);
    if (currentMenuItem?.submenu) {
      setExpandedMenu(currentMenuItem);
      return;
    }
    
    // If not, check if we're on a submenu path
    for (const menuItem of menuItems) {
      if (menuItem.submenu) {
        // Check if current path is in this menu's submenu
        const isInSubmenu = menuItem.submenu.some(subItem => 
          path === subItem.path || path.startsWith(subItem.path + '/')
        );
        
        if (isInSubmenu) {
          setExpandedMenu(menuItem);
          return;
        }
      }
    }
    
    // If we're not in any submenu, clear the expanded menu
    setExpandedMenu(null);
  }, [location.pathname]); // Only depend on pathname, not the entire menuItems array

  const handleSignOut = async () => {
    try {
      const result = await signOut();
      if (result.success) {
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
    <>
      {/* Add style tag for custom scrollbar hiding */}
      <style dangerouslySetInnerHTML={{ __html: scrollbarHideStyles }} />
      <div className="h-screen overflow-hidden bg-gradient-to-br from-background to-purple-300/30 p-2 sm:p-4 font-sans">
        <div className="flex flex-col md:flex-row h-full gap-3 overflow-hidden">
      {/* Mobile Menu Toggle Button - Only visible on mobile */}
      <div className="flex items-center justify-between md:hidden mb-3">
        <Link to="/" className="flex items-center space-x-3">
          <div className="bg-icon flex h-10 w-10 items-center justify-center rounded-xl shadow-sm">
            <img src={logo} className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900">Moneko</span>
        </Link>
        <motion.button 
          onClick={toggleMobileMenu}
          className={classNames(
            "rounded-lg p-2 text-gray-700 shadow-sm transition-all duration-300",
            mobileMenuOpen ? "bg-red-100/70" : "bg-white/70"
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FontAwesomeIcon 
            icon={mobileMenuOpen ? faTimes : faBars} 
            className={classNames(
              "h-6 w-6 transition-all duration-300",
              mobileMenuOpen ? "text-red-500" : "text-gray-700"
            )} 
          />
        </motion.button>
      </div>

      {/* Main Sidebar - Card-based Design */}
      <motion.div
        className={classNames(
          "flex-shrink-0 transition-all duration-300 ease-in-out",
          mobileMenuOpen ? "block" : "hidden md:block",
          "w-full md:w-56 md:max-h-full md:overflow-y-auto"
        )}
        initial={{ x: -64, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex h-full flex-col rounded-2xl border border-gray-100 bg-white/70 shadow-sm">
          <div className="flex-1 py-6">
            {/* Logo Section - Hidden on mobile (shown in top bar) */}
            <Link to="/" className="mb-8 ml-4 hidden md:flex items-center space-x-3">
              <div className="bg-icon flex h-10 w-10 items-center justify-center rounded-xl shadow-sm">
                <img src={logo} className="h-6 w-6" />
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900">
                Moneko
              </span>
            </Link>

            {/* Navigation Menu */}
            <nav className="flex-1 space-y-2 px-4">
              {menuItems.map((item) => (
                <div key={item.id}>
                  <Link to={item.path} className="group">
                    <motion.div
                      className={`flex w-full items-center justify-between px-4 py-3 transition-all duration-200 ${
                        isRouteActive(item.path)
                          ? "border-l-4 border-primary text-primary"
                          : "border-l-4 border-transparent text-gray-700 hover:bg-gray-50/70 hover:text-gray-900"
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
                              : "group-hover:bg-gray-200"
                          }`}
                        >
                          <FontAwesomeIcon
                            className={`size-5 ${
                              isRouteActive(item.path)
                                ? "text-primary"
                                : "text-gray-600"
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
              {user && (
                <motion.div
                  className={
                    "flex w-full cursor-pointer items-center justify-between border-l-4 border-transparent px-4 py-3 text-gray-700 transition-all duration-200 hover:bg-gray-50/70 hover:text-gray-900"
                  }
                  onClick={() => handleSignOut()}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg group-hover:bg-gray-200`}
                    >
                      <FontAwesomeIcon
                        className={`size-5 text-red-600`}
                        icon={faSignOut}
                      />
                    </div>
                    <span className="text-md font-medium text-red-600">
                      Logout
                    </span>
                  </div>
                </motion.div>
              )}
            </nav>
          </div>

          {/* User Profile Section */}
          <div className="border-t border-gray-100 p-4">
            {isLoading ? (
              <div className="flex animate-pulse items-center space-x-3 rounded-lg px-4 py-3">
                <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                <div className="flex-1">
                  <div className="mb-1 h-3 w-24 rounded bg-gray-200"></div>
                  <div className="h-2 w-32 rounded bg-gray-200"></div>
                </div>
              </div>
            ) : user ? (
              <div className="flex items-center space-x-3 rounded-lg py-3 w-full overflow-x-hidden">
                <div className="flex size-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 text-sm font-semibold text-white shadow-sm">
                  {user.email?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {user.user_metadata?.name || "User"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user.email}ssssssss</p>
                </div>
              </div>
            ) : (
              <Link to="/login" className="group">
                <motion.div
                  className="flex items-center space-x-3 rounded-lg px-4 py-3 transition-all duration-200 hover:bg-gray-50"
                  whileHover={{ x: 3 }}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                    <FontAwesomeIcon
                      icon={faSignInAlt}
                      className="h-5 w-5 text-primary"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Sign In
                    </p>
                    <p className="text-xs text-gray-500">
                      Access your account
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
              <div className="h-full rounded-2xl border border-gray-100 bg-white/70 shadow-sm">
                <div className="p-6">
                  <div className="mb-6 flex items-center space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                      <FontAwesomeIcon
                        className="h-4 w-4 text-primary"
                        icon={expandedMenu?.icon || faHome}
                      />
                    </div>
                    <h3 className="text-sm font-bold capitalize text-gray-900">
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
                                ? "border-l-3 border-primary bg-purple-50/50 font-medium text-primary"
                                : "border-l-3 border-transparent text-gray-600 hover:bg-gray-50/70 hover:text-gray-900"
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
              className="lg:hidden w-full mb-3 overflow-visible sticky top-0 z-10"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="rounded-xl border border-gray-100 bg-white/90 backdrop-blur-md shadow-md p-3">
                <div className="flex items-center justify-between mb-2 px-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-100">
                      <FontAwesomeIcon
                        className="h-3 w-3 text-primary"
                        icon={expandedMenu?.icon || faHome}
                      />
                    </div>
                    <h3 className="text-xs font-bold capitalize text-gray-900">
                      {expandedMenu.label}
                    </h3>
                  </div>
                  
                  {/* Close submenu button on mobile */}
                  <motion.button
                    onClick={() => setExpandedMenu(null)}
                    className="rounded-full bg-gray-100/70 p-1 text-gray-500"
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
                        <Link to={subItem.path} className="group">
                          <motion.div
                            className={classNames(
                              "whitespace-nowrap rounded-lg px-4 py-2 text-sm transition-all duration-200",
                              isRouteActive(subItem.path) 
                                ? "bg-gradient-to-r from-primary/10 to-purple-400/10 border-b-2 border-primary font-medium text-primary" 
                                : "border-b-2 border-transparent text-gray-600 hover:bg-gray-50/70 hover:text-gray-900"
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
              <Outlet />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col gap-2 md:gap-4 overflow-auto">
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
          className="h-full flex-1 overflow-auto rounded-xl border border-gray-100/80 bg-white/80 backdrop-blur-md px-3 md:px-6 py-4 md:pt-6 shadow-md"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >            
              {PROTECTED_ROUTES.includes(location.pathname) && !user ? (
                <motion.div
                  className="flex flex-col items-center justify-center px-4 py-12 text-center flex-1"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.div
                    className="from-icon mb-8 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br to-purple-300 shadow-lg"
                    transition={{ duration: 0.5 }}
                  >
                    <img src={logo} className="size-16" />
                  </motion.div>

                  <motion.h2
                    className="mb-3 bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-3xl font-bold text-transparent"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                  >
                    Oops! VIP Area Ahead
                  </motion.h2>

                  <motion.p
                    className="mb-8 max-w-md text-lg text-gray-600"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    Looks like you've discovered some of our premium features!
                    🎉 Sign in to unlock your personalized dashboard and all the
                    cool stuff we've built for you.
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                  >
                    <Link to="/login" className="group">
                      <motion.div
                        className="flex items-center justify-center space-x-3 rounded-xl bg-gradient-to-r from-primary to-purple-500 px-8 py-4 text-white shadow-lg transition-all duration-200"
                        whileHover={{ scale: 1.05, y: -3 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 25,
                        }}
                      >
                        <FontAwesomeIcon
                          className="h-5 w-5"
                          icon={faSignInAlt}
                        />
                        <span className="text-lg font-medium">
                          Jump Right In!
                        </span>
                      </motion.div>
                    </Link>
                  </motion.div>
                </motion.div>
              ) : (
                <Outlet />
              )}
           
        </motion.main>
          </div>
        </div>
      </div>
    </>
  );
}
