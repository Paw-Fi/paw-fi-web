export function LessonSkeleton() {
  return (
    <div className="bg-background flex flex-1 flex-col px-4 py-8 lg:flex-row animate-pulse min-h-[60vh] mt-24">      <div className="mb-4 lg:mb-0 flex flex-1 flex-col lg:mr-4">
      
        {/* Question area skeleton */}
        <div className="space-y-6 ">
          {[...Array(1)].map((_, i) => (
            <div key={i} className="p-6 rounded-2xl bg-white shadow lg:w-[45rem] w-full max-w-xl mx-auto flex flex-col gap-4 min-h-[28rem]">
  {/* Skeleton for Lesson Title */}
  <div className="h-7 w-2/3 bg-gray-200 rounded mb-2" />
  {/* Skeleton for Lesson Subtitle */}
  <div className="h-5 w-1/2 bg-gray-100 rounded mb-4" />
  {/* Progress bar skeleton */}
  <div className="h-3 w-full bg-gray-100 rounded mb-6" />
  {/* Skeleton for question prompt */}
  <div className="h-6 w-4/5 bg-gray-200 rounded mb-4" />
  {/* Skeleton for options */}
  <div className="space-y-3">
    <div className="h-10 w-full bg-gray-100 rounded" />
    <div className="h-10 w-5/6 bg-gray-100 rounded" />
    <div className="h-10 w-2/3 bg-gray-100 rounded" />
  </div>
  {/* Skeleton for action buttons */}
  <div className="flex gap-3 mt-6">
    <div className="h-10 w-28 bg-gray-200 rounded" />
    <div className="h-10 w-28 bg-gray-100 rounded" />
  </div>
</div>
          ))}
        </div>
      </div>    
    </div>
  );
}

export default LessonSkeleton;
