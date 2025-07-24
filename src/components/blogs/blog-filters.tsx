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
            className="w-full rounded-full border-0 bg-white dark:bg-gray-800 px-4 py-3 pl-12 shadow-sm ring-1 ring-inset ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-primary dark:focus:ring-dark-primary text-foreground dark:text-dark-foreground placeholder:text-gray-500 dark:placeholder:text-gray-400"
          />
          <FontAwesomeIcon 
            icon={faSearch} 
            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" 
            aria-hidden="true" 
          />
        </form>

        <button
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          className="flex items-center gap-2 rounded-full bg-primary/10 dark:bg-dark-primary/10 px-4 py-2 font-medium text-primary dark:text-dark-primary transition-colors hover:bg-primary/20 dark:hover:bg-dark-primary/20 md:ml-4"
        >
          <FontAwesomeIcon icon={faFilter} className="h-4 w-4" aria-hidden="true" />
          <span>Filter</span>
          {selectedTags.length > 0 && (
            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary dark:bg-dark-primary text-xs text-white">
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
          className="mt-4 overflow-hidden rounded-xl bg-white dark:bg-gray-800 p-4 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-lg font-medium text-foreground dark:text-dark-foreground">Filter by tags</h3>
            {selectedTags.length > 0 && (
              <button
                onClick={() => selectedTags.forEach(tag => onTagSelect(tag))}
                className="text-sm text-primary dark:text-dark-primary hover:text-secondary dark:hover:text-dark-secondary"
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
                    ? "bg-primary dark:bg-dark-primary text-white hover:bg-secondary dark:hover:bg-dark-secondary"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
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
