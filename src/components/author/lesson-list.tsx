'use client';

import { useState } from 'react';
import { Lesson } from '@/types/learning.types';

interface LessonListProps {
  lessons: Lesson[];
  onEdit: (lessonId: string) => void;
  onDelete: (lessonId: string) => void;
}

export function LessonList({ lessons, onEdit, onDelete }: LessonListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  if (lessons.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-8 text-center">
        <div className="mb-4 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium mb-2">No lessons yet</h3>
        <p className="text-gray-600">
          Create your first lesson to start building your course.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-md">
      <ul className="divide-y divide-gray-100">
        {lessons.map((lesson, index) => (
          <li 
            key={lesson.id}
            className="p-4 transition-colors hover:bg-gray-50"
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 text-2xl mr-4 pt-1">
                {lesson.icon || '📝'}
              </div>
              
              <div className="flex-grow">
                <h3 className="text-lg font-medium">{lesson.title}</h3>
                <p className="text-gray-600 text-sm line-clamp-2 mb-2">{lesson.description}</p>
                
                <div className="flex items-center text-sm text-gray-500">
                  <span className="mr-4">XP: {lesson.xp}</span>
                  <span>{lesson.questions.length} Questions</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => onEdit(lesson.id)}
                  className="p-2 text-blue-500 hover:text-blue-700 transition-colors"
                  aria-label="Edit lesson"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => onDelete(lesson.id)}
                  className="p-2 text-red-500 hover:text-red-700 transition-colors"
                  aria-label="Delete lesson"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
