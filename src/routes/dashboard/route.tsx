import BreadCrumbsHeader from '@/components/ui/breadcrumbs';
import { Outlet, createFileRoute, Link, useMatchRoute, useNavigate } from '@tanstack/react-router'
import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useUserCourses } from '@/services/course-service';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookOpen, faCalculator, faChartLine, faChessKnight, faCog, faComments, faHome, faChevronRight, faUser, faSignInAlt, faSignOut, faIdBadge } from '@fortawesome/free-solid-svg-icons';
import { motion, AnimatePresence } from 'framer-motion';
import logo from "@assets/images/icon.svg"
import { toast } from 'react-toastify';

export const Route = createFileRoute('/dashboard')({  
    component: Dashboard
})

export function Dashboard () {
  // Use route matching instead of local state for active menu
  const matchRoute = useMatchRoute();
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const { user, signOut, isLoading } = useAuth();
  const navigate = useNavigate();
  const { data: courses = [], isLoading: isCoursesLoading } = useUserCourses(user?.id ?? "", { enabled: !!user });

  // Helper function to check if a route is active
  const isRouteActive = (path: string) => {
    // For the dashboard home route, use exact matching
    if (path === '/dashboard') {
      return window.location.pathname === '/dashboard' || window.location.pathname === '/dashboard/';
    }
    // For other routes, use fuzzy matching
    return matchRoute({ to: path, fuzzy: true });
  };

  // Generate dynamic learning submenu from courses
  const learningSubmenu = useMemo(() => {
    
    // Add courses to submenu if they exist
    if (courses && courses.length > 0) {
      const courseItems = courses.map(course => ({
        id: course.course_id || course.id,
        label: course.title,
        path: `/dashboard/learning/${course.course_id || course.id}`
      }));
      return [ ...courseItems];
    }
    
    return [];
  }, [courses]);

  const menuItems = [
    { id: 'home', label: 'Profile', icon: faIdBadge, path: '/dashboard' },
    { id: 'chat', label: 'AI Chat', icon: faComments, path: '/dashboard/chat' },
    { 
      id: 'learning', 
      label: 'Learning', 
      icon: faChessKnight,
      path: '/dashboard/learning',
      submenu: learningSubmenu
    },
    { 
      id: 'essentials', 
      label: 'Essentials', 
      icon: faBookOpen,
      path: '/dashboard/essentials',
      submenu: learningSubmenu
    },
    { 
      id: 'calculators', 
      label: 'Calculators', 
      icon: faCalculator,
      path: '/dashboard/calculators',
      submenu: [
        { id: 'mortgage', label: 'Mortgage Calculator', path: '/dashboard/calculators/mortgage-calculator' },
        { id: 'compound', label: 'Compound Interest', path: '/dashboard/calculators/compound-calculator' },
        { id: 'investment', label: 'Investment Calculator', path: '/dashboard/calculators/investment-calculator' },
        { id: 'retirement', label: 'Retirement Calculator', path: '/dashboard/calculators/retirement-calculator' },
        { id: 'auto-loan', label: 'Auto Loan Calculator', path: '/dashboard/calculators/auto-loan-calculator' },
        { id: 'saving-goals', label: 'Saving Goals Calculator', path: '/dashboard/calculators/saving-goals-calculator' },
      ] 
    },
    { id: 'user-settings', label: 'Settings', icon: faCog, path: '/dashboard/user-settings' },
  ];


  const toggleSubmenu = (menuId: string | null) => {
    setExpandedMenu(expandedMenu === menuId ? null : menuId);
  };

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

  const PROTECTED_ROUTES = ["/dashboard", "/dashboard/learning", "/dashboard/user-settings"];


  return (
    <div className="h-screen bg-gradient-to-br from-background to-purple-300/30 flex font-sans p-4 gap-3 ">
      
      {/* Main Sidebar - Card-based Design */}
      <motion.div 
        className="w-72"
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="h-full bg-white/70 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <div className="flex-1 py-6">
            {/* Logo Section */}
            <Link to="/" className="flex items-center space-x-3 mb-8 ml-4">
              <div className="w-10 h-10 bg-icon rounded-xl flex items-center justify-center shadow-sm">
                <img src={logo} className='w-6 h-6'/>
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">
                Moneko
              </span>
            </Link>

            {/* Navigation Menu */}
            <nav className="space-y-2 flex-1">
              {menuItems.map((item) => (
                <div key={item.id}>
                  <Link
                    to={item.path}
                    onClick={() => {
                      if (item.submenu && item.submenu.length > 0) {
                        toggleSubmenu(item.id);
                      }
                    }}
                    className="group"
                  >
                    <motion.div
                      className={`w-full flex items-center justify-between px-4 py-3 transition-all duration-200 ${
                        isRouteActive(item.path)
                          ? 'text-primary border-l-4 border-primary '
                          : 'text-gray-700 hover:bg-gray-50/70 hover:text-gray-900 border-l-4 border-transparent'
                      }`}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isRouteActive(item.path) 
                            ? '' 
                            : 'group-hover:bg-gray-200'
                        }`}>
                          <FontAwesomeIcon 
                            className={`size-5 ${
                              isRouteActive(item.path) ? 'text-primary' : 'text-gray-600'
                            }`} 
                            icon={item.icon} 
                          />
                        </div>
                        <span className="font-medium text-md">{item.label}</span>
                      </div>                    
                    </motion.div>
                  </Link>
                </div>
              ))}
                  {user &&  <motion.div
                      className={"w-full flex items-center justify-between px-4 py-3 transition-all duration-200 text-gray-700 hover:bg-gray-50/70 hover:text-gray-900 border-l-4 border-transparent cursor-pointer"} 
                      onClick={() => handleSignOut()}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center group-hover:bg-gray-200`}>
                          <FontAwesomeIcon 
                            className={`size-5  text-red-600`} 
                            icon={faSignOut} 
                          />
                        </div>
                        <span className="font-medium text-red-600 text-md">Logout</span>
                      </div>                    
                    </motion.div>}
            </nav>
          </div>

          {/* User Footer */}
          <motion.div 
            className="p-6 border-t border-gray-100"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            {user ? (
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-gray-50  group">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                  {user.name ? user.name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">
                    {user.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user.email}
                  </p>
                </div>            
              </div>
            ) : (
              <Link to="/login" className="group">
                <motion.div
                  className="flex items-center justify-center space-x-2 px-4 py-3 border border-primary/30 text-primary hover:bg-purple-50/50 rounded-lg transition-all duration-200"
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <FontAwesomeIcon className="w-4 h-4" icon={faSignInAlt} />
                  <span className="font-medium text-sm">Sign In</span>
                </motion.div>
              </Link>
            )}
          </motion.div>
        </div>
      </motion.div>

      {/* Secondary Sidebar - Card Style */}
      <AnimatePresence>
        {expandedMenu && (
          <motion.div 
            className="w-64"
            initial={{ x: -64, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -64, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="h-full bg-white/70 rounded-2xl shadow-sm border border-gray-100">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <FontAwesomeIcon 
                      className="w-4 h-4 text-primary" 
                      icon={menuItems.find(item => item.id === expandedMenu)?.icon || faHome} 
                    />
                  </div>
                  <h3 className="font-bold text-sm text-gray-900 capitalize">
                    {expandedMenu}
                  </h3>
                </div>
                
                <div className="space-y-2">
                  {menuItems.find(item => item.id === expandedMenu)?.submenu?.map((subItem, index) => (
                    <motion.div
                      key={subItem.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        to={subItem.path}
                        className="group"
                      >
                        <motion.div
                          className={`block w-full text-left px-4 py-3 text-sm rounded-lg transition-all duration-200 ${
                            isRouteActive(subItem.path)
                              ? 'text-primary border-l-3 border-primary bg-purple-50/50 font-medium'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/70 border-l-3 border-transparent'
                          }`}
                          whileHover={{ x: 4 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
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
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 gap-4">
        
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <BreadCrumbsHeader/>
        </motion.div>
    
        {/* Dashboard Content */}
        <motion.main 
          className="flex-1 overflow-y-auto min-h-full"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className=" mx-auto">
            <div className="bg-white/70 rounded-xl shadow-sm border border-gray-100/80 min-h-full p-8">
              {PROTECTED_ROUTES.includes(location.pathname) && !user ? (
                <motion.div 
                  className="flex flex-col items-center justify-center py-12 px-4 text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.div 
                    className="w-24 h-24 bg-gradient-to-br from-icon to-purple-300 rounded-2xl flex items-center justify-center shadow-lg mb-8"
                    transition={{ duration: 0.5 }}
                  >
                    <img src={logo} className="size-16" />
                  </motion.div>
                  
                  <motion.h2 
                    className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent mb-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                  >
                    Oops! VIP Area Ahead
                  </motion.h2>
                  
                  <motion.p 
                    className="text-gray-600 max-w-md mb-8 text-lg"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    Looks like you've discovered some of our premium features! 🎉 
                    Sign in to unlock your personalized dashboard and all the cool stuff we've built for you.
                  </motion.p>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                  >
                    <Link to="/login" className="group">
                      <motion.div
                        className="flex items-center justify-center space-x-3 px-8 py-4 bg-gradient-to-r from-primary to-purple-500 text-white rounded-xl transition-all duration-200 shadow-lg"
                        whileHover={{ scale: 1.05, y: -3 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        <FontAwesomeIcon className="w-5 h-5" icon={faSignInAlt} />
                        <span className="font-medium text-lg">Jump Right In!</span>
                      </motion.div>
                    </Link>
                  </motion.div>
                </motion.div>
              ) : (
                <Outlet/>
              )}
            </div>
          </div>
        </motion.main>
      </div>
    </div>
  );
};