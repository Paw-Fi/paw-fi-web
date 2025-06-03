"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter, faTimes, faSearch } from "@fortawesome/free-solid-svg-icons";
import { BlogTag } from "@/components/blogs/blogs.typing";

interface BlogFiltersProps {
  tags: BlogTag[];
  selectedTags: string[];
  onTagSelect: (tagId: string) => void;
  onSearch: (query: string) => void;
}

export function BlogFilters({ tags, selectedTags, onTagSelect, onSearch }: BlogFiltersProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <div className="mb-8 w-full">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <form 
          onSubmit={handleSearchSubmit}
          className="relative flex-1"
        >
          <input
            type="text"
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border-0 bg-white px-4 py-3 pl-12 shadow-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:ring-gray-700 dark:focus:ring-purple-500"
          />
          <FontAwesomeIcon 
            icon={faSearch} 
            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" 
            aria-hidden="true" 
          />
        </form>

        <button
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          className="flex items-center gap-2 rounded-full bg-purple-100 px-4 py-2 font-medium text-purple-800 transition-colors hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-100 dark:hover:bg-purple-800 md:ml-4"
        >
          <FontAwesomeIcon icon={faFilter} className="h-4 w-4" aria-hidden="true" />
          <span>Filter</span>
          {selectedTags.length > 0 && (
            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-xs text-white">
              {selectedTags.length}
            </span>
          )}
        </button>
      </div>

      {isFiltersOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-4 overflow-hidden rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800"
        >
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-lg font-medium">Filter by tags</h3>
            {selectedTags.length > 0 && (
              <button
                onClick={() => selectedTags.forEach(tag => onTagSelect(tag))}
                className="text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => onTagSelect(tag.id)}
                className={`flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedTags.includes(tag.id)
                    ? "bg-purple-500 text-white hover:bg-purple-600"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {tag.name}
                {selectedTags.includes(tag.id) && (
                  <FontAwesomeIcon icon={faTimes} className="ml-2 h-3 w-3" aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
