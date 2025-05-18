'use client';

import { useState, useEffect } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Course } from '@/types/learning.types';
import { generateUniqueId } from '@/utils/id-generator';

export function AuthorCourseList() {
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
    } finally {
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

  const handleExportCourse = (course: Course, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    try {
      // Create a blob with the course JSON
      const courseJson = JSON.stringify(course, null, 2);
      const blob = new Blob([courseJson], { type: 'application/json' });
      
      // Create a download link and click it
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${course.title.replace(/\s+/g, '-').toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting course:', error);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Your Courses</h2>
        <button
          onClick={handleCreateNewCourse}
          disabled={isCreating}
          className="px-4 py-2 bg-primary text-white font-medium rounded-lg shadow transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 disabled:opacity-50"
        >
          {isCreating ? 'Creating...' : '+ New Course'}
        </button>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md p-8 text-center">
          <p className="text-gray-500">No courses found. Create your first course to get started.</p>
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
                    onClick={(e) => handleExportCourse(course, e)}
                    className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                    aria-label="Export course"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
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
                <span>Edit Course</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-10 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-medium mb-4">Import a Course</h3>
        <Link
          to="/author/import"
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
          Import from JSON
        </Link>
      </div>
    </div>
  );
}
