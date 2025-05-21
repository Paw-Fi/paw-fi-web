import React from "react";

interface LessonCardProps {
  title: string;
  description: string;
  lessonCount: number;
  className?: string;
}

export function Card({ title, description, lessonCount, className }: LessonCardProps) {
  return (
    <div className={`rounded-xl border bg-white shadow p-5 mb-3 ${className || ''}`}>
      <h2 className="text-lg font-semibold mb-1">{title}</h2>
      <p className="text-gray-600 mb-2">{description}</p>
      <div className="text-xs text-gray-500">Lessons: {lessonCount}</div>
    </div>
  );
}
