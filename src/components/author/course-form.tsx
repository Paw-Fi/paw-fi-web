'use client';

import { useState, useEffect } from 'react';
import { Course } from '@/types/learning.types';

interface CourseFormProps {
  course: Course;
  onUpdate: (updatedCourse: Partial<Course>) => void;
}

export function CourseForm({ course, onUpdate }: CourseFormProps) {
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description);
  const [icon, setIcon] = useState(course.icon || '📚');
  
  // Update form when course prop changes
  useEffect(() => {
    setTitle(course.title);
    setDescription(course.description);
    setIcon(course.icon || '📚');
  }, [course]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onUpdate({
      title,
      description,
      icon
    });
  };

  const commonIcons = ['📚', '🧩', '🔍', '💡', '🧠', '🌟', '📝', '🎓', '📊', '💻', '🌍', '🔬'];

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h2 className="text-xl font-bold mb-4">Course Details</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label htmlFor="course-icon" className="block text-sm font-medium text-gray-700 mb-2">
            Course Icon
          </label>
          <div className="flex flex-wrap gap-3 mb-3">
            {commonIcons.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => setIcon(emoji)}
                className={`w-10 h-10 text-xl flex items-center justify-center rounded-lg transition-colors ${
                  icon === emoji 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="flex">
            <input
              id="course-icon-custom"
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-24 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              maxLength={2}
            />
            <div className="ml-2 text-gray-600 text-sm flex items-center">
              You can paste any emoji or enter a custom one
            </div>
          </div>
        </div>
        
        <div className="mb-4">
          <label htmlFor="course-title" className="block text-sm font-medium text-gray-700 mb-1">
            Course Title
          </label>
          <input
            id="course-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            required
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="course-description" className="block text-sm font-medium text-gray-700 mb-1">
            Course Description
          </label>
          <textarea
            id="course-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            rows={3}
            required
          />
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white font-medium rounded-lg shadow transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
