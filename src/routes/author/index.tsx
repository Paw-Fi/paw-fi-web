'use client';

import { useState, useEffect } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import type { Course } from '@/types/learning.types';
import { generateUniqueId } from '@/utils/id-generator';

export const Route = createFileRoute('/author/')({ 
  component: AuthorPage,
});

function AuthorPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  
  // Load courses from localStorage
  useEffect(() => {
    try {
      const storedCoursesStr = localStorage.getItem('author-courses') || '[]';
      const storedCourses = JSON.parse(storedCoursesStr) as Course[];
      setCourses(storedCourses);
    } catch (error) {
      console.error('Error loading courses:', error);
      setCourses([]);
    }
  }, []);

  const handleCreateNewCourse = () => {
    setIsCreating(true);
    const newCourseId = generateUniqueId();
    
    // Initialize a new empty course
    const newCourse: Course = {
      id: newCourseId,
      title: "Untitled Course",
      description: "Course description",
      icon: "📚",
      lessons: []
    };
    
    // Add to existing courses
    try {
      const updatedCourses = [...courses, newCourse];
      localStorage.setItem('author-courses', JSON.stringify(updatedCourses));
      setCourses(updatedCourses);
      
      // Set current working course
      localStorage.setItem('author-current-course', newCourseId);
      
      // Navigate to course editor
      navigate({ to: `/author/course/${newCourseId}` });
    } catch (error) {
      console.error('Error creating new course:', error);
      setIsCreating(false);
    }
  };

  const handleDeleteCourse = (courseId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      try {
        const updatedCourses = courses.filter(course => course.id !== courseId);
        localStorage.setItem('author-courses', JSON.stringify(updatedCourses));
        setCourses(updatedCourses);
      } catch (error) {
        console.error('Error deleting course:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-3">Course Creator Studio</h1>
        <p className="text-gray-600 max-w-lg mx-auto">
          Create, manage, and share your own educational courses. Design custom lessons and interactive questions to engage learners.
        </p>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Your Courses</h2>
          <button
            onClick={handleCreateNewCourse}
            disabled={isCreating}
            className="px-4 py-2 bg-primary text-white font-medium rounded-lg shadow transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 disabled:opacity-50"
          >
            {isCreating ? 'Creating...' : '+ Create New Course'}
          </button>
        </div>

        {courses.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-8 text-center">
            <div className="mb-6 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-xl font-medium mb-2">No courses yet</h3>
            <p className="text-gray-600 max-w-md mx-auto mb-8">
              Start building your educational content by creating your first course. You'll be able to add lessons and interactive questions.
            </p>
            <button
              onClick={handleCreateNewCourse}
              disabled={isCreating}
              className="px-6 py-3 bg-primary text-white font-medium rounded-lg shadow transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create Your First Course'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => (
              <Link
                key={course.id}
                to={`/author/course/${course.id}`}
                className="bg-white rounded-2xl shadow-md p-6 transition-transform hover:transform hover:scale-105 block"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="text-3xl">{course.icon || '📚'}</div>
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => handleDeleteCourse(course.id, e)}
                      className="p-2 text-red-500 hover:text-red-700 transition-colors"
                      aria-label="Delete course"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <h3 className="text-xl font-bold mb-2 truncate">{course.title}</h3>
                <p className="text-gray-600 text-sm line-clamp-2 mb-4">{course.description}</p>
                
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>{course.lessons.length} {course.lessons.length === 1 ? 'Lesson' : 'Lessons'}</span>
                  <span className="text-primary font-medium">Edit Course →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
