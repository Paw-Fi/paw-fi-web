"use client";

interface LessonProgressBarProps {
  progressPercentage: number;
}

export function LessonProgressBar({ progressPercentage }: LessonProgressBarProps) {
  return (
    <div className="h-2 w-full rounded-full bg-white">
      <div
        className="bg-success h-2 rounded-full transition-all"
        style={{ width: `${progressPercentage}%` }}
      ></div>
    </div>
  );
}
