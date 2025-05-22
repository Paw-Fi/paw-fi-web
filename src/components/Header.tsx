'use client';

import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-context";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faTableCells, faSignOut, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { gsap } from "gsap";

export default function Header() {
  const { user, signOut, isLoading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (dropdownRef.current) {
      if (isMenuOpen) {
        gsap.fromTo(
          dropdownRef.current,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: "power2.out" }
        );
      } else {
        gsap.to(dropdownRef.current, { opacity: 0, y: -10, scale: 0.95, duration: 0.3, ease: "power2.out" });
      }
    }
  }, [isMenuOpen]);

  const handleSignOut = async () => {
    try {
      const result = await signOut();
      if (result.success) {
        navigate({ to: '/' });
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and main navigation */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-xl font-bold text-primary">Paw-Fi</Link>
            </div>
            <nav className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link 
                to="/" 
                className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
                activeProps={{
                  className: "inline-flex items-center px-1 pt-1 border-b-2 border-primary text-sm font-medium text-gray-900"
                }}
              >
                Home
              </Link>
              <Link 
                to="/learning" 
                className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
                activeProps={{
                  className: "inline-flex items-center px-1 pt-1 border-b-2 border-primary text-sm font-medium text-gray-900"
                }}
              >
                Learning
              </Link>
              <Link 
                to="/chat" 
                className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
                activeProps={{
                  className: "inline-flex items-center px-1 pt-1 border-b-2 border-primary text-sm font-medium text-gray-900"
                }}
              >
                AI Chat
              </Link>
              <Link 
                to="/calculators" 
                className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
                activeProps={{
                  className: "inline-flex items-center px-1 pt-1 border-b-2 border-primary text-sm font-medium text-gray-900"
                }}
              >
                Calculators
              </Link>
            </nav>
          </div>

          {/* User account section */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {isLoading ? (
              <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
            ) : user ? (
              <div className="relative">
                <button 
                  type="button"
                  className="flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  aria-expanded={isMenuOpen}
                  aria-haspopup="true"
                >
                  <span className="sr-only">Open user menu</span>
                  {user.user_metadata?.avatar_url ? (
                    <img
                      className="h-8 w-8 rounded-full"
                      src={user.user_metadata.avatar_url}
                      alt="User avatar"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center">
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                </button>
                {isMenuOpen && (
                  <div 
                    ref={dropdownRef}
                    className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 dark:divide-gray-700 focus:outline-none z-50 origin-top-right"
                    onBlur={() => setIsMenuOpen(false)}
                  >
                    {/* User info section */}
                    <div className="px-4 py-3 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-center space-x-3">
                        
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-white">
                            {user.user_metadata?.full_name || 'User'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Menu items */}
                    <div className="py-1">
                      <Link
                        to="/profile"
                        className="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <FontAwesomeIcon 
                          icon={faUser} 
                          className="h-4 w-4 mr-3 text-gray-500 dark:text-gray-400" 
                          fixedWidth 
                        />
                        Your Profile
                      </Link>
                      <Link
                        to="/dashboard"
                        className="flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <FontAwesomeIcon 
                          icon={faTableCells} 
                          className="h-4 w-4 mr-3 text-gray-500 dark:text-gray-400" 
                          fixedWidth 
                        />
                        Dashboard
                      </Link>
                      <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                      <button
                        className="flex items-center w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150"
                        onClick={() => {
                          setIsMenuOpen(false);
                          handleSignOut();
                        }}
                      >
                        <FontAwesomeIcon 
                          icon={faSignOut} 
                          className="h-4 w-4 mr-3" 
                          fixedWidth 
                        />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex space-x-4">
                <Link
                  to="/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary bg-white hover:bg-gray-50"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="-mr-2 flex items-center sm:hidden">
            <button 
              type="button" 
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state */}
      {isMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <Link
              to="/"
              className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
              activeProps={{
                className: "block pl-3 pr-4 py-2 border-l-4 border-primary text-base font-medium text-primary bg-primary/10"
              }}
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/learning"
              className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
              activeProps={{
                className: "block pl-3 pr-4 py-2 border-l-4 border-primary text-base font-medium text-primary bg-primary/10"
              }}
              onClick={() => setIsMenuOpen(false)}
            >
              Learning
            </Link>
            <Link
              to="/chat"
              className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
              activeProps={{
                className: "block pl-3 pr-4 py-2 border-l-4 border-primary text-base font-medium text-primary bg-primary/10"
              }}
              onClick={() => setIsMenuOpen(false)}
            >
              AI Chat
            </Link>
            <Link
              to="/calculators"
              className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
              activeProps={{
                className: "block pl-3 pr-4 py-2 border-l-4 border-primary text-base font-medium text-primary bg-primary/10"
              }}
              onClick={() => setIsMenuOpen(false)}
            >
              Calculators
            </Link>
          </div>
          
          {/* Mobile user menu */}
          {user ? (
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-4">
                <div className="flex-shrink-0">
                  {user.user_metadata?.avatar_url ? (
                    <img
                      className="h-10 w-10 rounded-full"
                      src={user.user_metadata.avatar_url}
                      alt="User avatar"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center">
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">
                    {user.user_metadata?.full_name || 'User'}
                  </div>
                  <div className="text-sm font-medium text-gray-500">{user.email}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <Link
                  to="/profile"
                  className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Your Profile
                </Link>
                <Link
                  to="/dashboard"
                  className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleSignOut();
                  }}
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="space-y-1">
                <Link
                  to="/login"
                  className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign up
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
