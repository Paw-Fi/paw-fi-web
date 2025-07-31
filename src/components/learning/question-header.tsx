import { OptimizedImage } from "@/components/seo/optimized-image";

interface QuestionHeaderProps {
  question: string;
  catIcon: string;
}

export function QuestionHeader({ question, catIcon }: QuestionHeaderProps) {
  return (
    <div className="mb-5 flex items-center gap-4 rounded-2xl border-1 border-gray-200 p-4">
      <OptimizedImage src={catIcon} alt="Question Icon" className="size-16 lg:size-24" />
      <h2 className="text-xl font-bold">{question}</h2>
    </div>
  );
}
