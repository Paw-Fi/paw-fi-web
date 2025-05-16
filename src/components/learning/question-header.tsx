"use client";

interface QuestionHeaderProps {
  question: string;
  catIcon: string;
}

export function QuestionHeader({ question, catIcon }: QuestionHeaderProps) {
  return (
    <div className="mb-5 flex items-center gap-4 rounded-2xl border-1 border-gray-200 p-4">
      <img src={catIcon} alt="Question Icon" />
      <h2 className="mb-4 text-xl font-bold">{question}</h2>
    </div>
  );
}
