'use client';

import { useState, useEffect } from 'react';
import type { Course, Lesson, QuestionType } from '@/types/learning.types';
import { DndContext, useSensors, useSensor, PointerSensor, closestCenter, DragOverlay } from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent, UniqueIdentifier } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';

// Course Form Component for editing course details
export function CourseForm({ course, onUpdate }: { 
  course: Course; 
  onUpdate: (updatedCourse: Partial<Course>) => void;
}) {
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

// Sortable Lesson Component
function SortableLesson({ lesson, onEdit, onDelete }: { 
  lesson: Lesson; 
  onEdit: (id: string) => void; 
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id,
    data: { type: 'lesson', lesson }
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 mb-3"
    >
      <div className="flex items-start">
        <div 
          className="flex-shrink-0 text-2xl mr-4 pt-1 cursor-grab touch-none"
          {...attributes}
          {...listeners}
        >
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
    </div>
  );
}

// List of lessons with drag-and-drop reordering
export function LessonList({ 
  lessons, 
  onEdit, 
  onDelete, 
  onReorder 
}: { 
  lessons: Lesson[]; 
  onEdit: (id: string) => void; 
  onDelete: (id: string) => void;
  onReorder: (reorderedLessons: Lesson[]) => void;
}) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  
  // Set up sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = lessons.findIndex(lesson => lesson.id === active.id);
      const newIndex = lessons.findIndex(lesson => lesson.id === over.id);
      
      const reorderedLessons = arrayMove(lessons, oldIndex, newIndex);
      onReorder(reorderedLessons);
    }
    
    setActiveId(null);
  };

  const getActiveLesson = () => {
    if (!activeId) return null;
    return lessons.find(lesson => lesson.id === activeId) || null;
  };

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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
    >
      <SortableContext 
        items={lessons.map(lesson => lesson.id)} 
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {lessons.map((lesson) => (
            <SortableLesson
              key={lesson.id}
              lesson={lesson}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
      
      <DragOverlay>
        {activeId ? (
          <div className="p-4 bg-white rounded-lg shadow-md border border-primary border-opacity-50 mb-3">
            <div className="flex items-start">
              <div className="flex-shrink-0 text-2xl mr-4 pt-1">
                {getActiveLesson()?.icon || '📝'}
              </div>
              
              <div className="flex-grow">
                <h3 className="text-lg font-medium">{getActiveLesson()?.title}</h3>
                <p className="text-gray-600 text-sm line-clamp-2 mb-2">
                  {getActiveLesson()?.description}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// Lesson editor form
export function LessonEditor({ 
  lesson, 
  onUpdate,
  onBack,
  onAddQuestion,
  onEditQuestion 
}: { 
  lesson: Lesson; 
  onUpdate: (updatedLesson: Lesson) => void;
  onBack: () => void;
  onAddQuestion: (lessonId: string) => void;
  onEditQuestion: (lessonId: string, questionId: string) => void;
}) {
  const [title, setTitle] = useState(lesson.title);
  const [description, setDescription] = useState(lesson.description);
  const [xp, setXp] = useState(lesson.xp);
  const [icon, setIcon] = useState(lesson.icon || '📝');
  
  useEffect(() => {
    setTitle(lesson.title);
    setDescription(lesson.description);
    setXp(lesson.xp);
    setIcon(lesson.icon || '📝');
  }, [lesson]);

  const handleSave = () => {
    const updatedLesson: Lesson = {
      ...lesson,
      title,
      description,
      xp,
      icon
    };
    
    onUpdate(updatedLesson);
  };

  const commonIcons = ['📝', '🧩', '🔍', '💡', '🧠', '🌟', '📚', '🎓', '📊', '💻', '🌍', '🔬'];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Course
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Lesson Details</h2>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="lesson-icon" className="block text-sm font-medium text-gray-700 mb-2">
              Lesson Icon
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
                id="lesson-icon-custom"
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-24 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                maxLength={2}
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="lesson-title" className="block text-sm font-medium text-gray-700 mb-1">
              Lesson Title
            </label>
            <input
              id="lesson-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          
          <div>
            <label htmlFor="lesson-description" className="block text-sm font-medium text-gray-700 mb-1">
              Lesson Description
            </label>
            <textarea
              id="lesson-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              rows={3}
            />
          </div>
          
          <div>
            <label htmlFor="lesson-xp" className="block text-sm font-medium text-gray-700 mb-1">
              XP Value
            </label>
            <input
              id="lesson-xp"
              type="number"
              value={xp}
              onChange={(e) => setXp(Math.max(0, parseInt(e.target.value) || 0))}
              min="0"
              step="10"
              className="w-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-primary text-white font-medium rounded-lg shadow transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
            >
              Save Details
            </button>
          </div>
        </div>
      </div>
      
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Questions</h2>
          <button
            onClick={() => onAddQuestion(lesson.id)}
            className="px-4 py-2 bg-primary text-white font-medium rounded-lg shadow transition-colors hover:bg-primary-dark"
          >
            + Add Question
          </button>
        </div>
        
        {lesson.questions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-8 text-center">
            <div className="mb-4 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">No questions yet</h3>
            <p className="text-gray-600 mb-4">
              Add your first question to start building your lesson.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-md">
            <div className="divide-y divide-gray-100">
              {lesson.questions.map((question, index) => (
                <div 
                  key={question.id}
                  className="p-4 transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 text-gray-500 mr-4">
                      {index + 1}
                    </div>
                    
                    <div className="flex-grow">
                      <div className="flex items-center mb-1">
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2">
                          {question.type.toUpperCase()}
                        </span>
                        <h3 className="line-clamp-1 font-medium">{question.question}</h3>
                      </div>
                    </div>
                    
                    <button 
                      className="flex items-center text-blue-500 hover:text-blue-700 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditQuestion(lesson.id, question.id);
                      }}
                      aria-label="Edit question"
                    >
                      <span className="text-sm mr-1">Edit</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Component for choosing the type of question to add
export function QuestionTypeSelector({ onSelect, onCancel }: {
  onSelect: (questionType: QuestionType) => void;
  onCancel: () => void;
}) {
  const questionTypes = [
    {
      type: 'mcq' as QuestionType,
      label: 'Multiple Choice',
      description: 'Multiple correct answers can be selected',
      icon: '☑️',
    },
    {
      type: 'scq' as QuestionType,
      label: 'Single Choice',
      description: 'Only one correct answer can be selected',
      icon: '🔘',
    },
    {
      type: 'sort-order' as QuestionType,
      label: 'Sorting',
      description: 'Arrange items in the correct order',
      icon: '📊',
    },
    {
      type: 'sort-categories' as QuestionType,
      label: 'Categorization',
      description: 'Group items into correct categories',
      icon: '📋',
    },
    {
      type: 'match' as QuestionType,
      label: 'Matching',
      description: 'Match items from two columns',
      icon: '🔄',
    },
    {
      type: 'text-input' as QuestionType,
      label: 'Text Input',
      description: 'Type in the correct answer',
      icon: '📝',
    },
    {
      type: 'matrix-rating' as QuestionType,
      label: 'Matrix Rating',
      description: 'Rate items on a scale',
      icon: '📏',
    },
    {
      type: 'image-choice' as QuestionType,
      label: 'Image Choice',
      description: 'Select from image options',
      icon: '🖼️',
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {questionTypes.map((qType) => (
          <button
            key={qType.type}
            onClick={() => onSelect(qType.type)}
            className="bg-white border border-gray-200 rounded-xl p-4 hover:border-primary hover:shadow-md transition-all flex flex-col items-center text-center"
          >
            <span className="text-3xl mb-2">{qType.icon}</span>
            <h3 className="font-medium mb-1">{qType.label}</h3>
            <p className="text-xs text-gray-600">{qType.description}</p>
          </button>
        ))}
      </div>
      
      <div className="mt-6 flex justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
