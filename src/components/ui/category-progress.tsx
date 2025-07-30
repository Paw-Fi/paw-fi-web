import React from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";

interface CategoryInfo {
  id: string;
  title: string;
  description: string;
  color: string;
}

interface CategoryProgressProps {
  categories: CategoryInfo[];
  activeCategory: string;
  completedCategories: string[];
  progress: number;
  onCategoryChange?: (categoryId: string) => void;
  showTabs?: boolean;
}

export function CategoryProgress({
  categories,
  activeCategory,
  completedCategories,
  progress,
  onCategoryChange,
  showTabs = false
}: CategoryProgressProps) {
  const activeCategoryIndex = categories.findIndex(cat => cat.id === activeCategory);
  const activeInfo = categories.find(cat => cat.id === activeCategory);

  return (
    <div className="my-4">
      {/* Progress header */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">
          Step {activeCategoryIndex + 1} of {categories.length}
        </span>
        <span className="text-sm font-medium text-gray-500">
          {activeInfo?.title}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 overflow-hidden rounded-full bg-gray-100 mb-4">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Category description */}
      {activeInfo && (
        <div className="mb-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {activeInfo.title}
          </h2>
          <p className="text-sm text-gray-600">
            {activeInfo.description}
          </p>
        </div>
      )}

      {/* Category tabs (optional) */}
      {showTabs && (
        <div className="mb-6 flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryChange?.(category.id)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                activeCategory === category.id 
                  ? `${category.color} shadow-sm` 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {category.title}
              {completedCategories.includes(category.id) && (
                <FontAwesomeIcon
                  icon={faCheck}
                  className="ml-2 text-xs"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}