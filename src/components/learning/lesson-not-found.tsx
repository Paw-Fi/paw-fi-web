"use client";

import { useNavigate } from "@tanstack/react-router";

export function LessonNotFound() {
  const navigate = useNavigate();
  
  return (
    <div className="flex items-center justify-center p-4">
      <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-md">
        <h1 className="mb-4 text-xl font-bold">Lesson Not Found</h1>
        <p className="mb-6 text-gray-600">
          Sorry, the lesson you're looking for doesn't exist.
        </p>
        <button
          onClick={() => navigate({ to: "/learning" })}
          className="bg-primary w-full rounded-full px-6 py-3 font-medium text-white hover:bg-purple-700"
        >
          Back to Learning
        </button>
      </div>
    </div>
  );
}
