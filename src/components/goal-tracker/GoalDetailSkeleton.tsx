export function GoalDetailSkeleton() {
  return (
    <div className="min-h-screen bg-moneko-background">
      {/* Header Skeleton */}
      <div className="bg-card/95 border-b">
        <div className="max-w-7xl mx-auto px-0 sm:px-8 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-8 bg-muted rounded-full w-16 animate-pulse"></div>
              <div className="w-8 h-8 bg-muted rounded-2xl animate-pulse"></div>
              <div>
                <div className="h-4 bg-muted rounded-full w-32 mb-2 animate-pulse"></div>
                <div className="h-3 bg-muted rounded-full w-20 animate-pulse"></div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 bg-muted rounded-full w-24 animate-pulse"></div>
              <div className="h-10 bg-muted rounded-2xl w-10 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Stats Skeleton */}
      <div className="max-w-7xl mx-auto px-0 sm:px-8 lg:px-8 py-8">
        <div className="bg-card rounded-3xl shadow-sm">
          <div className="p-8">
            <div className="mb-8">
              <div className="h-6 bg-muted rounded-full w-32 mb-3 animate-pulse"></div>
              <div className="h-4 bg-muted rounded-full w-3/4 animate-pulse"></div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="h-3 bg-muted rounded-full w-16 animate-pulse"></div>
                  <div className="h-8 bg-muted rounded-full w-20 animate-pulse"></div>
                  <div className="h-2 bg-muted rounded-full w-full animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="max-w-7xl mx-auto px-0 sm:px-8 lg:px-8 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-card rounded-3xl shadow-sm animate-pulse"></div>
            ))}
          </div>
          <div className="lg:col-span-2 space-y-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-card rounded-3xl shadow-sm animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
