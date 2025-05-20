'use client';

import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Course } from '@/types/learning.types';

export const Route = createFileRoute('/author/import')({
  component: ImportCoursePage,
});

function ImportCoursePage() {
  const navigate = useNavigate();
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    if (!jsonInput.trim()) {
      setJsonError('Please enter JSON content');
      return;
    }

    setIsImporting(true);
    setJsonError('');

    try {
      // Parse the JSON input
      const parsedData = JSON.parse(jsonInput);
      
      // Validate that it's a course
      if (!parsedData.id || !parsedData.title || !Array.isArray(parsedData.lessons)) {
        setJsonError('Invalid course format. JSON must include id, title, and lessons array.');
        setIsImporting(false);
        return;
      }
      
      // Create a properly structured course
      const courseToImport: Course = {
        id: parsedData.id,
        title: parsedData.title,
        description: parsedData.description || '',
        icon: parsedData.icon || '📚',
        lessons: parsedData.lessons || []
      };
      
      // Add to existing courses
      const existingCoursesStr = localStorage.getItem('author-courses') || '[]';
      const existingCourses = JSON.parse(existingCoursesStr) as Course[];
      
      // Check if course with same ID already exists
      const courseExists = existingCourses.some(course => course.id === courseToImport.id);
      if (courseExists) {
        // If it does, assign a new ID
        courseToImport.id = `${courseToImport.id}-imported-${Date.now()}`;
      }
      
      const updatedCourses = [...existingCourses, courseToImport];
      localStorage.setItem('author-courses', JSON.stringify(updatedCourses));
      
      // Navigate back to the author home page
      navigate({ to: '/author' });
    } catch (error) {
      setJsonError(`Error parsing JSON: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex-1 bg-background py-12 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-3">Import Course</h1>
        <p className="text-gray-600 max-w-md mx-auto">
          Import a course from JSON to edit and manage it.
        </p>
      </div>

      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-md p-8">
        <div className="mb-6">
          <label htmlFor="json-input" className="block text-sm font-medium text-gray-700 mb-2">
            Course JSON
          </label>
          <textarea
            id="json-input"
            rows={15}
            className={`w-full p-3 border ${jsonError ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg font-mono text-sm resize-none`}
            placeholder="Paste JSON course data here..."
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
          />
          
          {jsonError && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              <strong>Error:</strong> {jsonError}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-4">
          <button
            onClick={() => navigate({ to: '/author' })}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={isImporting || !jsonInput.trim()}
            className="px-4 py-2 bg-primary text-white font-medium rounded-lg shadow transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 disabled:opacity-50"
          >
            {isImporting ? 'Importing...' : 'Import Course'}
          </button>
        </div>
      </div>
    </div>
  );
}
