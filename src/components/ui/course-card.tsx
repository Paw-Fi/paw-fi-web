interface CardProps {
  title: string;
  description: string;
  lessonCount: number;
  className?: string;
  onClick?: () => void;
}

export function CourseCard({ title, description, lessonCount, className, onClick }: CardProps) {
  return (
    <div 
      className={`rounded-xl border border-gray-100 bg-white shadow-md hover:shadow-lg transition-all duration-300 p-6 mb-4 ${className || ''} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <h2 className="text-lg font-semibold mb-2 text-gray-800">{title}</h2>
        <div className="bg-primary/10 text-primary px-3 py-1 text-xs font-medium rounded-full text-nowrap">
          {lessonCount} {lessonCount === 1 ? 'Lesson' : 'Lessons'}
        </div>
      </div>
      
      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{description}</p>
      
      <div className="mt-2 flex items-center">       
        <div className="ml-auto text-xs font-medium text-primary hover:underline cursor-pointer">
          Start Learning →
        </div>
      </div>
    </div>
  );
}
