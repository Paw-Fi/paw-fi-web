'use client';

import { useState, useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { Course, Lesson, Question, QuestionType } from '@/types/learning.types';
import { generateUniqueId } from '@/utils/id-generator';
import { CourseForm, LessonList, LessonEditor, QuestionTypeSelector } from '@/components/author/course-editor';
import { QuestionEditor } from '@/components/author/question-editor';
import type { UniqueIdentifier } from '@dnd-kit/core';

export const Route = createFileRoute('/author/course/$courseId')({
  component: CourseEditorPage,
});

// Default course template for creating new courses
const createEmptyCourse = (id: string): Course => ({
  id,
  title: 'New Course',
  description: 'Course description',
  icon: '📚',
  lessons: []
});

// Default lesson template for creating new lessons
const createEmptyLesson = (parentId: string): Lesson => ({
  id: generateUniqueId(),
  title: 'New Lesson',
  description: 'Lesson description',
  icon: '📝',
  xp: 50,
  questions: []
});

// Default question template for creating new questions
const createEmptyQuestion = (lessonId: string, type: QuestionType): Question => ({
  id: generateUniqueId(),
  type,
  question: 'New Question',
  explanation: '',
  options: [],
  correct: []  
});

// Main course editor component
function CourseEditorPage() {
  const { courseId } = Route.useParams();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [view, setView] = useState<'overview' | 'lesson-edit' | 'question-edit'>('overview');
  const [currentQuestion, setCurrentQuestion] = useState<{lessonId: string; questionId: string} | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);

  // Load course data from localStorage
  useEffect(() => {
    setIsLoading(true);
    try {
      const savedCourses = localStorage.getItem('courses');
      if (savedCourses) {
        const courses: Course[] = JSON.parse(savedCourses);
        const foundCourse = courses.find(c => c.id === courseId);
        
        if (foundCourse) {
          setCourse(foundCourse);
        } else {
          // Create a new course if it doesn't exist
          const newCourse = createEmptyCourse(courseId);
          setCourse(newCourse);
          
          // Save the new course
          const updatedCourses = [...courses, newCourse];
          localStorage.setItem('courses', JSON.stringify(updatedCourses));
        }
      } else {
        // No courses exist yet, create a new one
        const newCourse = createEmptyCourse(courseId);
        setCourse(newCourse);
        localStorage.setItem('courses', JSON.stringify([newCourse]));
      }
    } catch (err) {
      setError('Failed to load course data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  // Save course data to localStorage whenever it changes
  useEffect(() => {
    if (course) {
      try {
        const savedCourses = localStorage.getItem('courses');
        let courses: Course[] = savedCourses ? JSON.parse(savedCourses) : [];
        
        // Update or add the course
        const courseIndex = courses.findIndex(c => c.id === course.id);
        if (courseIndex >= 0) {
          courses[courseIndex] = course;
        } else {
          courses.push(course);
        }
        
        localStorage.setItem('courses', JSON.stringify(courses));
      } catch (err) {
        setError('Failed to save course data');
        console.error(err);
      }
    }
  }, [course]);

  // Handle updating course details
  const handleUpdateCourse = (updatedCourse: Partial<Course>) => {
    if (course) {
      setCourse({
        ...course,
        ...updatedCourse
      });
    }
  };

  // Handle editing a lesson
  const handleEditLesson = (lessonId: string) => {
    setCurrentLessonId(lessonId);
    setView('lesson-edit');
  };

  // Handle deleting a lesson
  const handleDeleteLesson = (lessonId: string) => {
    if (course) {
      const confirmed = window.confirm('Are you sure you want to delete this lesson? This action cannot be undone.');
      
      if (confirmed) {
        const updatedLessons = course.lessons.filter(lesson => lesson.id !== lessonId);
        setCourse({
          ...course,
          lessons: updatedLessons
        });
      }
    }
  };

  // Handle adding a new lesson
  const handleAddLesson = () => {
    if (course) {
      const newLesson = createEmptyLesson(course.id);
      setCourse({
        ...course,
        lessons: [...course.lessons, newLesson]
      });
    }
  };

  // Handle reordering lessons with drag and drop
  const handleReorderLessons = (reorderedLessons: Lesson[]) => {
    if (course) {
      setCourse({
        ...course,
        lessons: reorderedLessons
      });
    }
  };

  // Handle updating a lesson
  const handleUpdateLesson = (updatedLesson: Lesson) => {
    if (course) {
      const lessonIndex = course.lessons.findIndex(lesson => lesson.id === updatedLesson.id);
      
      if (lessonIndex >= 0) {
        const updatedLessons = [...course.lessons];
        updatedLessons[lessonIndex] = updatedLesson;
        
        setCourse({
          ...course,
          lessons: updatedLessons
        });
      }
    }
  };

  // Handle adding a new question to a lesson
  const handleAddQuestion = (lessonId: string) => {
    setCurrentLessonId(lessonId);
    setIsAddingQuestion(true);
    // Reset current question when adding a new one
    setCurrentQuestion(null);
  };
  
  // Handle editing an existing question
  const handleEditQuestion = (lessonId: string, questionId: string) => {
    setCurrentLessonId(lessonId);
    setCurrentQuestion({
      lessonId,
      questionId
    });
    setIsAddingQuestion(false);
    setView('question-edit');
  };

  // Handle selecting a question type when adding a new question
  const handleSelectQuestionType = (questionType: QuestionType) => {
    if (course && currentLessonId) {
      const lessonIndex = course.lessons.findIndex(lesson => lesson.id === currentLessonId);
      
      if (lessonIndex >= 0) {
        const newQuestion = createEmptyQuestion(currentLessonId, questionType);
        const updatedLessons = [...course.lessons];
        
        updatedLessons[lessonIndex] = {
          ...updatedLessons[lessonIndex],
          questions: [...updatedLessons[lessonIndex].questions, newQuestion]
        };
        
        setCourse({
          ...course,
          lessons: updatedLessons
        });

        // Set up to edit the new question
        setCurrentQuestion({
          lessonId: currentLessonId,
          questionId: newQuestion.id
        });
        
        setIsAddingQuestion(false);
        setView('question-edit');
      }
    }
  };

  // Handle going back to course overview
  const handleBackToCourse = () => {
    setCurrentLessonId(null);
    setCurrentQuestion(null);
    setView('overview');
  };

  // Handle going back to lesson view
  const handleBackToLesson = () => {
    setCurrentQuestion(null);
    setView('lesson-edit');
  };

  // Navigate back to author home
  const handleBackToAuthor = () => {
    navigate({ to: '/author' });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-red-50 p-6 rounded-lg max-w-md w-full">
          <h2 className="text-red-800 text-xl font-semibold mb-2">Error</h2>
          <p className="text-red-700">{error}</p>
          <button
            onClick={handleBackToAuthor}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Author Home
          </button>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-yellow-50 p-6 rounded-lg max-w-md w-full">
          <h2 className="text-yellow-800 text-xl font-semibold mb-2">Course Not Found</h2>
          <p className="text-yellow-700">The course you're looking for could not be found.</p>
          <button
            onClick={handleBackToAuthor}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            Back to Author Home
          </button>
        </div>
      </div>
    );
  }

  // Find the current lesson if in lesson edit mode
  const currentLesson = currentLessonId 
    ? course.lessons.find(lesson => lesson.id === currentLessonId) 
    : null;

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header navigation */}
      <header className="mb-8">
        <nav className="flex flex-wrap items-center justify-between">
          <button
            onClick={handleBackToAuthor}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4 sm:mb-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Author Dashboard
          </button>
          
          <div className="flex items-center">
            <span className="mr-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              Saved to localStorage
            </span>
          </div>
        </nav>
        
        <div className="mt-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center">
            <span className="text-3xl mr-3">{course.icon}</span>
            <span>{course.title}</span>
          </h1>
          <p className="text-gray-600">{course.description}</p>
        </div>
      </header>

      {/* Main content area */}
      <main>
        {/* Overview mode - show course form and lesson list */}
        {view === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <CourseForm 
                course={course} 
                onUpdate={handleUpdateCourse} 
              />
            </div>
            
            <div className="lg:col-span-2">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Lessons</h2>
                <button
                  onClick={handleAddLesson}
                  className="px-4 py-2 bg-primary text-white font-medium rounded-lg shadow transition-colors hover:bg-primary-dark"
                >
                  + Add Lesson
                </button>
              </div>
              
              <LessonList 
                lessons={course.lessons}
                onEdit={handleEditLesson}
                onDelete={handleDeleteLesson}
                onReorder={handleReorderLessons}
              />
            </div>
          </div>
        )}

        {/* Lesson edit mode */}
        {view === 'lesson-edit' && currentLesson && (
          <LessonEditor
            lesson={currentLesson}
            onUpdate={handleUpdateLesson}
            onBack={handleBackToCourse}
            onAddQuestion={handleAddQuestion}
            onEditQuestion={handleEditQuestion}
          />
        )}

        {/* Question type selection mode */}
        {isAddingQuestion && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Choose Question Type</h2>
            </div>
            
            <QuestionTypeSelector
              onSelect={handleSelectQuestionType}
              onCancel={() => {
                setIsAddingQuestion(false);
                setView('lesson-edit');
              }}
            />
          </div>
        )}

        {/* Question edit mode */}
        {view === 'question-edit' && currentQuestion && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={handleBackToLesson}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Lesson
              </button>
            </div>
            
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Edit Question</h2>
              
              {course && currentLesson && (
                (() => {
                  const question = currentLesson.questions.find(q => q.id === currentQuestion.questionId);
                  
                  if (!question) {
                    return (
                      <div className="text-red-600 py-4">
                        Question not found. It may have been deleted.
                      </div>
                    );
                  }
                  
                  return (
                    <QuestionEditor 
                      question={question} 
                      onUpdate={(updatedQuestion) => {
                        // Update the question in the lesson
                        const updatedLessons = [...course.lessons];
                        const lessonIndex = updatedLessons.findIndex(l => l.id === currentQuestion.lessonId);
                        
                        if (lessonIndex >= 0) {
                          const questionIndex = updatedLessons[lessonIndex].questions.findIndex(
                            q => q.id === currentQuestion.questionId
                          );
                          
                          if (questionIndex >= 0) {
                            updatedLessons[lessonIndex].questions[questionIndex] = updatedQuestion;
                            
                            setCourse({
                              ...course,
                              lessons: updatedLessons
                            });
                          }
                        }
                      }} 
                    />
                  );
                })()
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
