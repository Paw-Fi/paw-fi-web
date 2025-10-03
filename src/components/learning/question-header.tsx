import { OptimizedImage } from "@/components/seo/optimized-image";

interface QuestionHeaderProps {
  question: string;
  catIcon: string;
}

export function QuestionHeader({ question, catIcon }: QuestionHeaderProps) {
  return (
    <div className="mb-4 sm:mb-5 flex items-center gap-2.5 sm:gap-3 md:gap-4 rounded-xl sm:rounded-2xl border-1 border-question-border p-3 sm:p-4">
      <OptimizedImage src={catIcon} alt="Question Icon" className="size-12 sm:size-14 md:size-16 lg:size-20 flex-shrink-0" />
      <h2 className="text-mobile-base sm:text-lg md:text-xl lg:text-2xl font-bold text-question-text">{question}</h2>
    </div>
  );
}
