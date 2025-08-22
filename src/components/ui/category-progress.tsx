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
    <div className="my-4">
      {/* Progress header */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Step {activeCategoryIndex + 1} of {categories.length}
        </span>
        <span className="text-sm font-medium text-muted-foreground">
          {activeInfo?.title}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 overflow-hidden rounded-full bg-muted mb-4">
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
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {activeInfo.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            {activeInfo.description}
          </p>
        </div>
      )}
      
    </div>
  );
}