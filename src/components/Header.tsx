'use client';

import { useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth-context";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faTableCells, faSignOut, faChevronDown, faTimes, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { LearningDropdown } from "@/components/ui/learning-dropdown";
import lessonsData from "@/data/basic-lessons.json";
import type { Lesson } from "@/types/learning.types";
// No JS truncate needed; use CSS line-clamp/truncate for all text truncation.

// Grouping logic based on lesson titles/ids
interface LessonGroup {
  name: string;
  shortform: string;
  lessons: Array<{ lesson: Lesson; lessonShortform: string }>;
}

// Canonical lesson mappings by ID for robust grouping and SEO
const lessonMappings = [
  // Core Concepts
  {
    group: "Core Concepts",
    groupShort: "CORE",
    lessonShort: "Key Concepts",
    lessonId: "invest-L1",
  },
  {
    group: "Core Concepts",
    groupShort: "CORE",
    lessonShort: "Risk & Loss",
    lessonId: "behavfin-L2",
  },
  {
    group: "Core Concepts",
    groupShort: "CORE",
    lessonShort: "Investment Risk",
    lessonId: "tvm-L7",
  },
  // Markets & Instruments
  {
    group: "Markets & Instruments",
    groupShort: "MARKETS",
    lessonShort: "Money Markets",
    lessonId: "moneymarket-L3",
  },
  {
    group: "Markets & Instruments",
    groupShort: "MARKETS",
    lessonShort: "Bonds & Credit",
    lessonId: "bondmarket-L4",
  },
  {
    group: "Markets & Instruments",
    groupShort: "MARKETS",
    lessonShort: "Stocks & IPOs",
    lessonId: "equitymarket-L5",
  },
  {
    group: "Markets & Instruments",
    groupShort: "MARKETS",
    lessonShort: "Futures & Options",
    lessonId: "derivatives-L6",
  },
  // Analysis & Fundamentals
  {
    group: "Analysis & Fundamentals",
    groupShort: "ANALYSIS",
    lessonShort: "Investor Statistics",
    lessonId: "stats-L8",
  },
  {
    group: "Analysis & Fundamentals",
    groupShort: "ANALYSIS",
    lessonShort: "Economics Basics",
    lessonId: "econbasics-L9",
  },
  {
    group: "Analysis & Fundamentals",
    groupShort: "ANALYSIS",
    lessonShort: "Financial Statements",
    lessonId: "finstatements-L10",
  },
];

function groupLessons(lessons: Lesson[]): { groups: LessonGroup[] } {
  // Step 1: Get first 10 mapped lessons
  const top10: Array<{ mapping: typeof lessonMappings[0]; lesson: Lesson }> = [];
  for (const mapping of lessonMappings) {
    const lesson = lessons.find((l) => l.lesson_id === mapping.lessonId);
    if (lesson) {
      top10.push({ mapping, lesson });
      if (top10.length === 10) break;
    }
  }
  // Step 2: Group by category (group/groupShort)
  const groupMap = new Map<string, LessonGroup>();
  for (const { mapping, lesson } of top10) {
    if (!groupMap.has(mapping.group)) {
      groupMap.set(mapping.group, {
        name: mapping.group,
        shortform: mapping.groupShort,
        lessons: []
      });
    }
    groupMap.get(mapping.group)!.lessons.push({ lesson, lessonShortform: mapping.lessonShort });
  }
  // Step 3: Return groups in order of first appearance in lessonMappings
  const groupOrder: string[] = top10.map(({ mapping }) => mapping.group).filter((v, i, arr) => arr.indexOf(v) === i);
  const groups = groupOrder.map((group) => groupMap.get(group)!);
  return { groups };
}
const lessons: Lesson[] = lessonsData.lessons.map((l: any) => ({
  lesson_id: l.lesson_id,
  title: l.title,
  description: l.description,
  icon: l.icon,
  xp: l.xp,
  unlocked: l.unlocked,
  tutorials: l.tutorials,
  questions: l.questions,
}));
const { groups } = groupLessons(lessons);

// Animation variants for dropdown menu
const dropdownVariants: Variants = {
  hidden: { opacity: 0, y: -10, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.95 }
};

// Animation variants for mobile menu
const mobileMenuVariants: Variants = {
  hidden: { x: "100%" },
  visible: { x: 0 },
  exit: { x: "100%" }
};

// Animation variants for submenu items
const submenuItemVariants: Variants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: "auto" },
  exit: { opacity: 0, height: 0 }
};

export default function Header() {
  const { user, signOut, isLoading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLearningSubmenuOpen, setIsLearningSubmenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location=useLocation();



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
  if(location.pathname==="/")
  {
    return <></>
  }

  return (
    <header className="container bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and main navigation */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-xl font-bold text-primary">PawFi</Link>
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
              {/* Learning dropdown */}
              <LearningDropdown groups={groups} />
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
              {/* <Link 
                to="/blogs" 
                className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
                activeProps={{
                  className: "inline-flex items-center px-1 pt-1 border-b-2 border-primary text-sm font-medium text-gray-900"
                }}
              >
                Blogs
              </Link> */}
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
                <AnimatePresence>
                  {isMenuOpen && (
                    <motion.div 
                      ref={dropdownRef}
                      variants={dropdownVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={{ duration: 0.3, ease: "easeOut" }}
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
                    </motion.div>
                  )}
                </AnimatePresence>
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
      {/* Mobile menu overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            variants={mobileMenuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-40 flex flex-col bg-white p-4 sm:hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-menu-title"
          >
          <div className="flex justify-between items-center mb-4">
            <h2 id="mobile-menu-title" className="text-lg font-medium text-gray-900 sr-only">Navigation Menu</h2> {/* SR only title for accessibility */}
            <div className="flex-grow"></div> {/* Spacer */} 
            <button
              type="button"
              className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              <span className="sr-only">Close menu</span>
              <FontAwesomeIcon icon={faTimes} className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="flex-grow overflow-y-auto">
            {/* Original menu content starts here */}
            <div className="space-y-1">
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
            {/* Learning Accordion Toggle */}
            <button
              type="button"
              className="flex items-center justify-between w-full pl-3 pr-4 py-2 text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 focus:outline-none"
              onClick={() => setIsLearningSubmenuOpen(!isLearningSubmenuOpen)}
              aria-expanded={isLearningSubmenuOpen}
              aria-controls="learning-submenu"
            >
              <span>Learning</span>
              <FontAwesomeIcon 
                icon={faChevronDown} 
                className={`w-5 h-5 transform transition-transform duration-200 ${isLearningSubmenuOpen ? 'rotate-180' : 'rotate-0'}`}
              />
            </button>
            {/* Learning Submenu Content */}
            <AnimatePresence>
              {isLearningSubmenuOpen && (
                <motion.div 
                  id="learning-submenu" 
                  variants={submenuItemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  className="pl-4 pr-2 py-1 space-y-1 border-l-2 border-gray-200 ml-3"
                >
                {/* AI Learning Link - Mobile Adapted */}
                <Link
                  to="/learning"
                  className="group/ai flex w-full items-center gap-3 rounded-md p-3 text-sm font-medium text-white bg-gradient-to-r from-[#7458FF] via-purple-500 to-fuchsia-500 hover:opacity-90"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="text-xl">🤖</span>
                  <span className="flex-grow">
                    <span className="block font-semibold">AI Learning</span>
                    <span className="block text-xs opacity-90 font-normal">Personalized lessons by AI.</span>
                  </span>
                  <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4 transition-transform group-hover/ai:translate-x-1" />
                </Link>

                {/* View All Courses Link - Mobile Adapted */}
                <Link
                  to={`/learning/${lessonsData.id}`}
                  className="flex items-center justify-between w-full pl-3 pr-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-800 rounded-md"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span>View All Lessons</span>
                  <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />
                </Link>

                {/* Grouped Lessons */}
                {(groupLessons(lessons).groups).map((group) =>
                  group.lessons.length === 0 ? null : (
                    <div key={group.name} className="pt-2">
                      <h3 className="px-3 mb-1 text-xs font-semibold tracking-wider uppercase text-gray-500">
                        {group.name}
                      </h3>
                      <ul className="space-y-1">
                        {group.lessons.map(({ lesson, lessonShortform }) => (
                          <li key={lesson.lesson_id}>
                            <Link
                              to={`/learning/${lessonsData.id}/lesson/${lesson.lesson_id}`}
                              className="flex items-center gap-2 pl-3 pr-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-800 rounded-md"
                              onClick={() => setIsMenuOpen(false)}
                              activeProps={{ className: "bg-primary/10 text-primary font-semibold" }}
                            >
                              {lesson.icon && (
                                <span className="flex-shrink-0 text-base">
                                  {lesson.icon}
                                </span>
                              )}
                              <span className="truncate flex-grow">
                                {lessonShortform}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                )}
                </motion.div>
              )}
            </AnimatePresence>
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
            {/* <Link
              to="/blogs"
              className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
              activeProps={{
                className: "block pl-3 pr-4 py-2 border-l-4 border-primary text-base font-medium text-primary bg-primary/10"
              }}
              onClick={() => setIsMenuOpen(false)}
            >
              Blogs
            </Link> */}
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
          </div> {/* End of scrollable content wrapper */}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}