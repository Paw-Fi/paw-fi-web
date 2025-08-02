export function GoalDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900">
      {/* Header Skeleton */}
      <div className="bg-white/95 dark:bg-gray-900/95 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-1"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-8"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Stats Skeleton */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
          <div className="p-6">
            <div className="mb-6">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"></div>
            ))}
          </div>
          <div className="lg:col-span-2 space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
