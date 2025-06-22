import BreadCrumbsHeader from '@/components/ui/breadcrumbs';
import { Outlet, createFileRoute, Link, useMatchRoute } from '@tanstack/react-router'
import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useUserCourses } from '@/services/course-service';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookOpen, faCalculator, faChartLine, faChessKnight, faCog, faComments, faHome } from '@fortawesome/free-solid-svg-icons';
import icon from "@assets/images/icon.svg"
export const Route = createFileRoute('/dashboard')({  
    component: Dashboard
})

export function Dashboard () {
  // Use route matching instead of local state for active menu
  const matchRoute = useMatchRoute();
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const { user } = useAuth();
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
    { id: 'home', label: 'Home', icon: faHome, path: '/dashboard' },
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


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex">
      
      {/* Main Sidebar */}
      <div className="w-64 bg-white/80 backdrop-blur-sm border-r border-gray-200/50 shadow-lg">
        <div className="p-6">
          <Link to="/" className="flex items-center space-x-3 mb-8">
            <img src={icon} className='size-10'/>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Moneko
            </span>
          </Link>

          <nav className="space-y-2">
            {menuItems.map((item) => (
              <div key={item.id}>
                <Link
                  to={item.path}
                  onClick={() => {
                    if (item.submenu) {
                      toggleSubmenu(item.id);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                    isRouteActive(item.path)
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 shadow-md'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <FontAwesomeIcon className={`w-5 h-5`} icon={item.icon} />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  
                </Link>
              </div>
            ))}
          </nav>
        </div>
      </div>

      {/* Secondary Sidebar (for submenus) */}
      {expandedMenu && (
        <div className="w-56 bg-white/60 backdrop-blur-sm border-r border-gray-200/30 shadow-sm">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 capitalize">
              {expandedMenu} Options
            </h3>
            <div className="space-y-2">
              {menuItems.find(item => item.id === expandedMenu)?.submenu?.map((subItem) => (
                <Link
                  key={subItem.id}
                  to={subItem.path}
                  className="block w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-white/50 rounded-lg transition-colors"
                >
                  {subItem.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {/* Header */}
        <BreadCrumbsHeader/>
    

        {/* Dashboard Content */}
        <main className="p-6 overflow-y-auto bg-background h-full">
            <Outlet/>
        </main>
      </div>
    </div>
  );
};