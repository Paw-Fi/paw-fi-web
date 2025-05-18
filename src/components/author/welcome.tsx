'use client';

import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { generateUniqueId } from '@/utils/id-generator';

export function AuthorWelcome() {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateNewCourse = () => {
    const newCourseId = generateUniqueId();
    
    // Initialize a new empty course with default structure
    const newCourse = {
      id: newCourseId,
      title: "Untitled Course",
      description: "Course description",
      icon: "📚",
      lessons: []
    };
    
    // Store this single course in localStorage
    try {
      const existingCoursesStr = localStorage.getItem('author-courses') || '[]';
      const existingCourses = JSON.parse(existingCoursesStr);
      
      const updatedCourses = [...existingCourses, newCourse];
      localStorage.setItem('author-courses', JSON.stringify(updatedCourses));
      
      // Also store the current working course ID
      localStorage.setItem('author-current-course', newCourseId);
      
      // Navigate to the course editor
      navigate({ to: `/author/course/${newCourseId}` });
    } catch (error) {
      console.error('Error creating new course:', error);
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-8 text-center">
      <div className="flex justify-center mb-6">
        <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
      </div>
      
      <h2 className="text-2xl font-bold mb-3">Create Your First Course</h2>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        Start building your educational content. Create lessons, add interactive questions, and share your knowledge with the world.
      </p>
      
      <button 
        onClick={handleCreateNewCourse}
        disabled={isCreating}
        className="px-6 py-3 bg-primary text-white font-medium rounded-lg shadow transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 disabled:opacity-50"
      >
        {isCreating ? 'Creating...' : 'Create New Course'}
      </button>
      
      <div className="mt-8 pt-6 border-t border-gray-100">
        <h3 className="text-lg font-medium mb-2">Already have a course?</h3>
        <p className="text-gray-600 mb-4">
          Import your existing course from a JSON file.
        </p>
        <Link 
          to="/author/import"
          className="text-primary hover:text-primary-dark transition-colors"
        >
          Import Course
        </Link>
      </div>
    </div>
  );
}
