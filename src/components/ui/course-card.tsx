interface CardProps {
  title: string;
  description: string;
  icon: string;
  lessonCount: number;
  className?: string;
  onClick?: () => void;
  isEmbedded?: boolean;
}

export function CourseCard({ title, description, icon, lessonCount, className, onClick, isEmbedded = false }: CardProps) {
  const baseClasses = "transition-all duration-300";
  const standardClasses = `rounded-xl border border-gray-100 bg-white shadow-md hover:shadow-lg p-6 ${onClick ? 'cursor-pointer' : ''}`;
  const embeddedClasses = `rounded-lg border border-slate-300/50 dark:border-slate-600/50 bg-slate-200/50 dark:bg-slate-800/50 p-4 w-full ${onClick ? 'cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800' : ''}`;

  return (
    <div
      className={`${baseClasses} ${isEmbedded ? embeddedClasses : standardClasses} ${className || ''}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        {icon && <img src={icon} alt="Course Icon" className="w-12 h-12 flex-shrink-0 rounded-lg" />}
        <div className="flex-grow">
          <div className="flex items-start justify-between">
            <h2 className={`font-semibold mb-1 ${isEmbedded ? 'text-base text-slate-800 dark:text-slate-100' : 'text-lg text-gray-800'}`}>{title}</h2>
            {!isEmbedded && (
              <div className="bg-primary/10 text-primary px-3 py-1 text-xs font-medium rounded-full text-nowrap ml-2">
                {lessonCount} {lessonCount === 1 ? 'Lesson' : 'Lessons'}
              </div>
            )}
          </div>
          <p className={`text-sm line-clamp-2 ${isEmbedded ? 'text-slate-600 dark:text-slate-300' : 'text-gray-600'}`}>{description}</p>
        </div>
      </div>

      {!isEmbedded && (
        <div className="mt-4 flex items-center">
          <div className="ml-auto text-sm font-semibold text-primary hover:underline">
            Start Learning →
          </div>
        </div>
      )}
    </div>
  );
}
