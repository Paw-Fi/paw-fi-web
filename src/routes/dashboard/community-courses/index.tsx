"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers,
  faFire,
  faEye,
  faHeart,
  faCalendarAlt,
  faSearch,
  faFilter,
  faBookOpen,
  faStar,
  faChevronDown,
  faAward,
  faRocket,
  faPlus
} from "@fortawesome/free-solid-svg-icons";
import { seo } from "@/utils/seo";
import { CommunityCourse, SortOption, SortOptionConfig } from "@/types/learning.types";

export const Route = createFileRoute("/dashboard/community-courses/")({
  component: CommunityCoursesPage,
  head: () => {
    const pageUrl = "https://moneko.io/dashboard/community-courses/";
    const meta = seo({
      title: "Community Courses | Discover & Share Financial Learning - Moneko",
      description:
        "Explore community-created financial courses, connect with learners worldwide, and discover trending educational content. Share your expertise and learn from others.",
      keywords:
        "community courses, financial education, peer learning, course sharing, investment education, financial literacy community, collaborative learning",
      image: "https://moneko.io/og-img.png",
      url: pageUrl,
    });
    
    return {
      meta,
      link: [
        {
          rel: "canonical",
          href: pageUrl
        }
      ]
    };
  },
});

// Mock data for community courses - this would come from your API
const MOCK_COMMUNITY_COURSES: CommunityCourse[] = [
  {
    id: "cc-1",
    title: "Advanced Options Trading Strategies",
    description: "Master complex options strategies including iron condors, butterfly spreads, and covered calls. Learn risk management and position sizing from a professional trader.",
    author: {
      name: "Sarah Chen",
      avatar: "👩‍💼",
      level: 42,
      expertise: "Options Trading",
      verified: true
    },
    stats: {
      students: 2847,
      rating: 4.8,
      likes: 1205,
      views: 18449,
      comments: 342
    },
    metadata: {
      difficulty: "Advanced",
      duration: "6 hours",
      lessons: 18,
      category: "Trading",
      tags: ["Options", "Risk Management", "Advanced Trading"],
      language: "English",
      createdAt: "2024-12-15T10:30:00Z",
      updatedAt: "2024-12-20T14:20:00Z"
    },
    preview: {
      thumbnail: "📈",
      color: "from-emerald-500 to-teal-600"
    },
    featured: true,
    trending: true
  },
  {
    id: "cc-2", 
    title: "Real Estate Investment Fundamentals",
    description: "Complete guide to real estate investing including property analysis, financing options, and building a rental portfolio. Includes Excel templates and case studies.",
    author: {
      name: "Michael Rodriguez",
      avatar: "👨‍🏫",
      level: 38,
      expertise: "Real Estate",
      verified: true
    },
    stats: {
      students: 1923,
      rating: 4.7,
      likes: 856,
      views: 12334,
      comments: 189
    },
    metadata: {
      difficulty: "Intermediate",
      duration: "4.5 hours", 
      lessons: 14,
      category: "Real Estate",
      tags: ["Property Investment", "Portfolio Building", "Analysis"],
      language: "English",
      createdAt: "2024-12-10T16:45:00Z",
      updatedAt: "2024-12-18T09:15:00Z"
    },
    preview: {
      thumbnail: "🏘️",
      color: "from-blue-500 to-indigo-600"
    },
    featured: false,
    trending: true
  },
  {
    id: "cc-3",
    title: "Cryptocurrency DeFi Deep Dive",
    description: "Explore decentralized finance protocols, yield farming, liquidity pools, and smart contract risks. Learn to navigate the DeFi ecosystem safely and profitably.",
    author: {
      name: "Alex Kim",
      avatar: "👨‍💻",
      level: 35,
      expertise: "Cryptocurrency",
      verified: true
    },
    stats: {
      students: 3156,
      rating: 4.6,
      likes: 1489,
      views: 21567,
      comments: 467
    },
    metadata: {
      difficulty: "Advanced",
      duration: "5.5 hours",
      lessons: 16,
      category: "Cryptocurrency",
      tags: ["DeFi", "Smart Contracts", "Yield Farming"],
      language: "English",
      createdAt: "2024-12-08T11:20:00Z",
      updatedAt: "2024-12-19T13:40:00Z"
    },
    preview: {
      thumbnail: "🪙",
      color: "from-purple-500 to-pink-600"
    },
    featured: true,
    trending: false
  },
  {
    id: "cc-4",
    title: "Tax-Efficient Investment Strategies",
    description: "Minimize your tax burden while maximizing returns. Learn about tax-loss harvesting, asset location, and retirement account optimization strategies.",
    author: {
      name: "Jennifer Walsh",
      avatar: "👩‍💼",
      level: 29,
      expertise: "Tax Planning",
      verified: false
    },
    stats: {
      students: 1456,
      rating: 4.5,
      likes: 623,
      views: 8932,
      comments: 156
    },
    metadata: {
      difficulty: "Intermediate",
      duration: "3 hours",
      lessons: 12,
      category: "Tax Planning",
      tags: ["Tax Strategy", "Retirement", "Optimization"],
      language: "English",
      createdAt: "2024-12-05T14:10:00Z",
      updatedAt: "2024-12-16T10:25:00Z"
    },
    preview: {
      thumbnail: "📊",
      color: "from-orange-500 to-red-600"
    },
    featured: false,
    trending: false
  },
  {
    id: "cc-5",
    title: "Small Business Financial Management",
    description: "Essential financial skills for entrepreneurs including cash flow management, business valuation, funding strategies, and financial projections.",
    author: {
      name: "David Thompson",
      avatar: "👨‍💼",
      level: 41,
      expertise: "Business Finance",
      verified: true
    },
    stats: {
      students: 2234,
      rating: 4.9,
      likes: 967,
      views: 15678,
      comments: 298
    },
    metadata: {
      difficulty: "Intermediate",
      duration: "4 hours",
      lessons: 15,
      category: "Business",
      tags: ["Entrepreneurship", "Cash Flow", "Business Valuation"],
      language: "English",
      createdAt: "2024-12-12T09:30:00Z",
      updatedAt: "2024-12-21T16:10:00Z"
    },
    preview: {
      thumbnail: "💼",
      color: "from-violet-500 to-purple-600"
    },
    featured: false,
    trending: true
  },
  {
    id: "cc-6",
    title: "Personal Credit Optimization Guide",
    description: "Comprehensive strategy to build, repair, and optimize your credit score. Learn credit utilization, dispute processes, and advanced credit strategies.",
    author: {
      name: "Lisa Chang",
      avatar: "👩‍🔬",
      level: 24,
      expertise: "Credit & Debt",
      verified: false
    },
    stats: {
      students: 987,
      rating: 4.4,
      likes: 445,
      views: 6721,
      comments: 89
    },
    metadata: {
      difficulty: "Beginner",
      duration: "2.5 hours",
      lessons: 10,
      category: "Credit",
      tags: ["Credit Score", "Credit Repair", "Financial Health"],
      language: "English",
      createdAt: "2024-12-02T13:45:00Z",
      updatedAt: "2024-12-14T11:30:00Z"
    },
    preview: {
      thumbnail: "💳",
      color: "from-cyan-500 to-blue-600"
    },
    featured: false,
    trending: false
  }
];

const SORT_OPTIONS: SortOptionConfig[] = [
  { value: "trending", label: "🔥 Trending", icon: faFire },
  { value: "recent", label: "🕒 Most Recent", icon: faCalendarAlt },
  { value: "popular", label: "👥 Most Popular", icon: faUsers },
  { value: "highest-rated", label: "⭐ Highest Rated", icon: faStar },
  { value: "most-views", label: "👁️ Most Views", icon: faEye },
  { value: "most-likes", label: "❤️ Most Liked", icon: faHeart }
];

const DIFFICULTY_FILTERS = ["All", "Beginner", "Intermediate", "Advanced"];
const CATEGORY_FILTERS = ["All", "Trading", "Real Estate", "Cryptocurrency", "Tax Planning", "Business", "Credit"];

// Animation variants matching learning page
const pageVariants: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { duration: 0.5, staggerChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4 }
  }
};

const courseCardVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.3 }
  }
};

function CommunityCoursesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("trending");
  const [difficultyFilter, setDifficultyFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort courses
  const filteredAndSortedCourses = useMemo(() => {
    let filtered = MOCK_COMMUNITY_COURSES.filter(course => {
      const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           course.author.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDifficulty = difficultyFilter === "All" || course.metadata.difficulty === difficultyFilter;
      const matchesCategory = categoryFilter === "All" || course.metadata.category === categoryFilter;
      
      return matchesSearch && matchesDifficulty && matchesCategory;
    });

    // Sort courses
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "trending":
          return (b.trending ? 1 : 0) - (a.trending ? 1 : 0) || b.stats.views - a.stats.views;
        case "recent":
          return new Date(b.metadata.updatedAt).getTime() - new Date(a.metadata.updatedAt).getTime();
        case "popular":
          return b.stats.students - a.stats.students;
        case "highest-rated":
          return b.stats.rating - a.stats.rating;
        case "most-views":
          return b.stats.views - a.stats.views;
        case "most-likes":
          return b.stats.likes - a.stats.likes;
        default:
          return 0;
      }
    });

    return filtered;
  }, [searchQuery, sortBy, difficultyFilter, categoryFilter]);

  return (
    <motion.div
      className="min-h-screen"
      initial="initial"
      animate="animate"
      variants={pageVariants}
    >
      {/* Hero Section matching learning page */}
      <motion.section 
        className="relative px-4 py-8 mb-8 overflow-hidden"
        variants={itemVariants}
      >
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/5 dark:from-violet-400/10 via-purple-600/5 dark:via-purple-400/10 to-indigo-600/5 dark:to-indigo-400/10 rounded-3xl" />
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-400/10 dark:bg-purple-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400/10 dark:bg-indigo-400/20 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Welcome Section */}
            <div className="flex-1">
              <motion.div variants={itemVariants}>
                <h1 className="text-4xl lg:text-5xl font-bold mb-4">
                  <span className="bg-gradient-to-r from-violet-600 dark:from-violet-400 via-purple-600 dark:via-purple-400 to-indigo-600 dark:to-indigo-400 bg-clip-text text-transparent">
                    Community Courses
                  </span>
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                  Discover financial courses created by experts worldwide. Learn from the community and expand your knowledge.
                </p>
                
                {/* Quick Stats */}
                <div className="flex flex-wrap gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">2,156</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Expert Courses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">12,847</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Active Learners</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">847K</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Views</div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Compact Metrics Bar */}
            <motion.div 
              className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-lg"
              variants={itemVariants}
            >
              <div className="flex items-center justify-between gap-6 overflow-x-auto">
                {/* Trending Courses */}
                <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center shadow-md">
                    <FontAwesomeIcon icon={faFire} className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-foreground dark:text-dark-foreground">24</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">Trending</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="w-px h-8 bg-gray-200 dark:bg-gray-600 flex-shrink-0" />

                {/* New This Week */}
                <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center shadow-md">
                    <FontAwesomeIcon icon={faBookOpen} className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-foreground dark:text-dark-foreground">16</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">New This Week</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Tab Navigation matching learning page */}
      <motion.div 
        className="px-4 mb-8"
        variants={itemVariants}
      >
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-2 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4 p-4">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-2xl">
                <FontAwesomeIcon
                  icon={faSearch}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500"
                />
                <input
                  type="text"
                  placeholder="Search courses, topics, or instructors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                />
              </div>

              {/* Sort and Filter Controls */}
              <div className="flex items-center gap-4">
                {/* Sort Dropdown */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 pr-10 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent cursor-pointer"
                  >
                    {SORT_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
                  />
                </div>

                {/* Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                    showFilters
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <FontAwesomeIcon icon={faFilter} className="h-4 w-4" />
                  <span>Filters</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Expandable Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700"
            >
              <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Difficulty Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                      Difficulty Level
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DIFFICULTY_FILTERS.map(difficulty => (
                        <button
                          key={difficulty}
                          onClick={() => setDifficultyFilter(difficulty)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                            difficultyFilter === difficulty
                              ? 'bg-purple-600 text-white shadow-lg'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-purple-100 dark:hover:bg-purple-900/30'
                          }`}
                        >
                          {difficulty}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                      Category
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORY_FILTERS.map(category => (
                        <button
                          key={category}
                          onClick={() => setCategoryFilter(category)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                            categoryFilter === category
                              ? 'bg-purple-600 text-white shadow-lg'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-purple-100 dark:hover:bg-purple-900/30'
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Results Summary */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {filteredAndSortedCourses.length}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Courses found
                      </div>
                    </div>
                    {(searchQuery || difficultyFilter !== "All" || categoryFilter !== "All") && (
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setDifficultyFilter("All");
                          setCategoryFilter("All");
                        }}
                        className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-medium transition-colors"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Course Grid matching learning page */}
      <motion.section 
        className="px-4 mb-12"
        variants={itemVariants}
      >
        <div className="max-w-7xl mx-auto">
          {filteredAndSortedCourses.length === 0 ? (
            <motion.div 
              className="text-center py-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-100 dark:from-purple-900/30 to-indigo-100 dark:to-indigo-900/30 rounded-full flex items-center justify-center">
                <FontAwesomeIcon icon={faPlus} className="h-10 w-10 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold text-foreground dark:text-dark-foreground mb-3">No courses found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Try adjusting your search or filters to discover more courses</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setDifficultyFilter("All");
                  setCategoryFilter("All");
                }}
                className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Clear Filters
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredAndSortedCourses.map((course, index) => (
                  <motion.div
                    key={course.id}
                    variants={courseCardVariants}
                    initial="initial"
                    animate="animate"
                    exit={{ opacity: 0, scale: 0.9 }}
                    layout
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      to={`/dashboard/learning/${course.id}`}
                      className="block h-full"
                    >
                      <div className="h-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-purple-200 dark:border-purple-700 hover:border-purple-300 dark:hover:border-purple-600">
                        {/* Course Header */}
                        <div className="p-6 pb-4 relative overflow-hidden bg-gradient-to-br from-purple-50 dark:from-purple-900/20 to-indigo-50 dark:to-indigo-900/20">
                          {/* Decorative background */}
                          <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/20 rounded-full blur-2xl" />
                          
                          <div className="relative flex items-start gap-4">
                            <div className="text-4xl flex-shrink-0">{course.preview.thumbnail}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                                  Community
                                </span>
                                {course.featured && (
                                  <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-medium rounded-full">
                                    <FontAwesomeIcon icon={faAward} className="h-3 w-3 mr-1" />
                                    Featured
                                  </span>
                                )}
                              </div>
                              <h3 className="text-lg font-bold text-foreground dark:text-dark-foreground line-clamp-2 mb-2">
                                {course.title}
                              </h3>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                            {course.description}
                          </p>
                        </div>

                        {/* Course Info */}
                        <div className="p-6 pt-4 space-y-4">
                          {/* Course Stats */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 bg-gradient-to-br from-blue-50 dark:from-blue-900/20 to-cyan-50 dark:to-cyan-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
                              <div className="flex items-center justify-center gap-2 mb-1">
                                <FontAwesomeIcon icon={faUsers} className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                  {course.stats.students.toLocaleString()}
                                </span>
                              </div>
                              <div className="text-xs text-blue-700 dark:text-blue-300">Students</div>
                            </div>

                            <div className="text-center p-3 bg-gradient-to-br from-yellow-50 dark:from-yellow-900/20 to-orange-50 dark:to-orange-900/20 rounded-xl border border-yellow-200 dark:border-yellow-700">
                              <div className="flex items-center justify-center gap-2 mb-1">
                                <FontAwesomeIcon icon={faStar} className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                                <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
                                  {course.stats.rating}
                                </span>
                              </div>
                              <div className="text-xs text-yellow-700 dark:text-yellow-300">Rating</div>
                            </div>
                          </div>

                          {/* Course Meta Information */}
                          <div className="grid grid-cols-3 gap-3 text-center text-xs">
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-gray-100">{course.metadata.lessons}</div>
                              <div className="text-gray-600 dark:text-gray-400">Lessons</div>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-gray-100">{course.metadata.duration}</div>
                              <div className="text-gray-600 dark:text-gray-400">Duration</div>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-gray-100">{course.stats.views.toLocaleString()}</div>
                              <div className="text-gray-600 dark:text-gray-400">Views</div>
                            </div>
                          </div>

                          {/* Engagement Stats */}
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                <FontAwesomeIcon icon={faHeart} className="h-3 w-3" />
                                <span>{course.stats.likes.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                <FontAwesomeIcon icon={faEye} className="h-3 w-3" />
                                <span>{course.stats.views.toLocaleString()}</span>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {course.metadata.difficulty}
                            </div>
                          </div>

                          {/* CTA Button */}
                          <button className="w-full py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50">
                            <FontAwesomeIcon icon={faRocket} className="h-4 w-4" />
                            Start Course
                          </button>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.section>
    </motion.div>
  );
}