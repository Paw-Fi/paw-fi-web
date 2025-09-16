import { motion } from "framer-motion";

interface CategoryInfo {
  id: string;
  title: string;
  description: string;
  color: string;
}

interface CategoryProgressProps {
  categories: CategoryInfo[];
  activeCategory: string;
  progress: number;
}

export function CategoryProgress({
  categories,
  activeCategory,
  progress
}: CategoryProgressProps) {
  const activeCategoryIndex = categories.findIndex(cat => cat.id === activeCategory);
  const activeInfo = categories.find(cat => cat.id === activeCategory);

  return (
    <div className="mb-8">
      {/* Progress header */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground-color">
          Step {activeCategoryIndex + 1} of {categories.length}
        </span>
        <span className="text-sm font-medium text-muted-foreground-color">
          {activeInfo?.title}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-3 overflow-hidden rounded-full bg-subtle-background mb-6 shadow-inner">
        <motion.div
          className="h-full rounded-full bg-primary shadow-sm"
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Category description */}
      {activeInfo && (
        <div className="mb-8 text-center">
          <h2 className="text-xl font-semibold text-foreground mb-3">
            {activeInfo.title}
          </h2>
          <p className="text-muted-foreground-color">
            {activeInfo.description}
          </p>
        </div>
      )}
      
    </div>
  );
}