'use client';

import { useState, useEffect } from 'react';
import { Lesson, LearningQuizQuestion, QuestionType } from '@/types/learning.types';
import { generateUniqueId } from '@/utils/id-generator';
import { QuestionEditor } from './question-editor';
import { QuestionTypeSelector } from './question-type-selector';

interface LessonEditorProps {
  lesson: Lesson;
  onUpdate: (updatedLesson: Lesson) => void;
}

export function LessonEditor({ lesson, onUpdate }: LessonEditorProps) {
  const [title, setTitle] = useState(lesson.title);
  const [description, setDescription] = useState(lesson.description);
  const [xp, setXp] = useState(lesson.xp);
  const [icon, setIcon] = useState(lesson.icon || '📝');
  const [questions, setQuestions] = useState<LearningQuizQuestion[]>(lesson.questions);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);

  // Update form when lesson prop changes
  useEffect(() => {
    setTitle(lesson.title);
    setDescription(lesson.description);
    setXp(lesson.xp);
    setIcon(lesson.icon || '📝');
    setQuestions(lesson.questions);
  }, [lesson]);

  const handleSaveDetails = () => {
    const updatedLesson: Lesson = {
      ...lesson,
      title,
      description,
      xp,
      icon
    };
    
    onUpdate(updatedLesson);
  };

  const handleAddQuestion = (questionType: QuestionType) => {
    const newQuestion: LearningQuizQuestion = {
      id: generateUniqueId(),
      question_id: generateUniqueId(),
      type: questionType,
      question: 'New Question',
      explanation: 'Explanation of the correct answer',
      options: questionType === 'mcq' || questionType === 'scq' 
        ? [
            { id: generateUniqueId(), content: 'Option 1', isCorrect: true },
            { id: generateUniqueId(), content: 'Option 2', isCorrect: false },
          ] 
        : undefined,
      items: questionType === 'sort-order' || questionType === 'sort-categories'
        ? [
            { id: generateUniqueId(), content: 'Item 1' },
            { id: generateUniqueId(), content: 'Item 2' },
          ]
        : undefined,
      correctAnswer: questionType === 'text-input' ? 'correct answer' : undefined,
    };

    const updatedQuestions = [...questions, newQuestion];
    
    const updatedLesson: Lesson = {
      ...lesson,
      questions: updatedQuestions
    };
    
    setQuestions(updatedQuestions);
    onUpdate(updatedLesson);
    setCurrentQuestionId(newQuestion.id);
    setIsAddingQuestion(false);
  };

  const handleUpdateQuestion = (updatedQuestion: LearningQuizQuestion) => {
    const updatedQuestions = questions.map(q => 
      q.id === updatedQuestion.id ? updatedQuestion : q
    );
    
    const updatedLesson: Lesson = {
      ...lesson,
      questions: updatedQuestions
    };
    
    setQuestions(updatedQuestions);
    onUpdate(updatedLesson);
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (window.confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      const updatedQuestions = questions.filter(q => q.id !== questionId);
      
      const updatedLesson: Lesson = {
        ...lesson,
        questions: updatedQuestions
      };
      
      setQuestions(updatedQuestions);
      onUpdate(updatedLesson);
      
      if (currentQuestionId === questionId) {
        setCurrentQuestionId(null);
      }
    }
  };

  const currentQuestion = currentQuestionId
    ? questions.find(q => q.id === currentQuestionId)
    : null;

  const commonIcons = ['📝', '🧩', '🔍', '💡', '🧠', '🌟', '📚', '🎓', '📊', '💻', '🌍', '🔬'];

  return (
    <div>
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
              onClick={handleSaveDetails}
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
            onClick={() => setIsAddingQuestion(true)}
            className="px-4 py-2 bg-primary text-white font-medium rounded-lg shadow transition-colors hover:bg-primary-dark"
          >
            + Add Question
          </button>
        </div>
        
        {isAddingQuestion && (
          <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
            <h3 className="text-lg font-medium mb-4">Select Question Type</h3>
            <QuestionTypeSelector onSelect={handleAddQuestion} onCancel={() => setIsAddingQuestion(false)} />
          </div>
        )}
        
        {currentQuestion ? (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-lg font-medium">Editing Question</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentQuestionId(null)}
                  className="px-3 py-1 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  Back to List
                </button>
                <button
                  onClick={() => handleDeleteQuestion(currentQuestion.id)}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
            
            <QuestionEditor 
              question={currentQuestion} 
              onUpdate={handleUpdateQuestion} 
            />
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-md">
            {questions.length === 0 ? (
              <div className="p-8 text-center">
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
              <ul className="divide-y divide-gray-100">
                {questions.map((question, index) => (
                  <li 
                    key={question.id}
                    className="p-4 transition-colors hover:bg-gray-50 cursor-pointer"
                    onClick={() => setCurrentQuestionId(question.id)}
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
                        
                        <div className="text-sm text-gray-500">
                          {question.type === 'mcq' || question.type === 'scq' 
                            ? `${question.options?.length || 0} options` 
                            : question.type === 'sort-order' || question.type === 'sort-categories' 
                              ? `${question.items?.length || 0} items`
                              : `${question.type} question`}
                        </div>
                      </div>
                      
                      <div className="flex items-center text-blue-500">
                        <span className="text-sm mr-1">Edit</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
