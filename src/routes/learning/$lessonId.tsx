'use client';

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, Fragment } from 'react';
import { Button } from '@/components/ui/button';
import { getLessonById } from '@/data/learning';
import SortQuestion from '@/components/learning/question-types/sort-question';
import SortCategoriesQuestion from '@/components/learning/question-types/sort-categories-question';
import ChoiceQuestion from '@/components/learning/question-types/choice-question';
import MatchQuestion from '@/components/learning/question-types/match-question';

export const Route = createFileRoute('/learning/$lessonId')({
  component: LessonPage,
});

function LessonPage() {
  const navigate = useNavigate();
  const { lessonId } = Route.useParams();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [earnedXp, setEarnedXp] = useState(0);
  
  // Get lesson data from our data file
  const lesson = getLessonById(lessonId);
  
  // Fallback if lesson doesn't exist
  if (!lesson) {
    return (
      <div className="min-h-screen bg-purple-50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-md p-8 max-w-md text-center">
          <h1 className="text-xl font-bold mb-4">Lesson Not Found</h1>
          <p className="text-gray-600 mb-6">Sorry, the lesson you're looking for doesn't exist.</p>
          <button 
            onClick={() => navigate({ to: '/learning' })}
            className="bg-primary hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-full w-full"
          >
            Back to Learning
          </button>
        </div>
      </div>
    );
  }
  
  // If the lesson isn't unlocked, redirect back to learning
  if (!lesson.unlocked) {
    useEffect(() => {
      navigate({ to: '/learning' });
    }, [navigate]);
    return null;
  }

  const { questions } = lesson;
  const currentQuestion = questions[currentQuestionIndex];
  const progressPercentage = ((currentQuestionIndex) / questions.length) * 100;
  
  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Lesson completed
      setIsComplete(true);
      setEarnedXp(lesson.xp);
      
      // Wait a moment before returning to the learning page
      setTimeout(() => {
        navigate({ to: '/learning' });
      }, 2500);
    }
  };
  
  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else {
      navigate({ to: '/learning' });
    }
  };
  
  const handleAnswer = (questionId: string, answer: any) => {
    setAnswers({
      ...answers,
      [questionId]: answer
    });
  };

  // Check if current question has been answered
  const isCurrentQuestionAnswered = !!answers[currentQuestion.id];
  
  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl mx-auto bg-white rounded-3xl shadow-md overflow-hidden">
      {/* Back button and progress indicator */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <button 
          onClick={handleBack}
          className="flex items-center font-medium cursor-pointer text-gray-600"
        >
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 16 16" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="mr-1"
          >
            <path 
              d="M10 4L6 8L10 12" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
          Go Back
        </button>
        
        <div className="text-sm font-medium text-gray-500">
          Question {currentQuestionIndex + 1} of {questions.length}
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-gray-200 h-2">
        <div 
          className="bg-primary h-2" 
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
      
      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        {/* Question container - takes up 3/4 on larger screens */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-3xl shadow-md p-8">
            {/* Render the appropriate question component based on type */}
            <div>
              <h2 className="text-xl font-bold mb-4">{currentQuestion.question}</h2>
              
              {currentQuestion.type === 'sort' && (
                <SortQuestion 
                  question={currentQuestion} 
                  onAnswer={(answer) => handleAnswer(currentQuestion.id, answer)}
                  value={answers[currentQuestion.id]}
                />
              )}
              
              {currentQuestion.type === 'sort-categories' && (
                <SortCategoriesQuestion 
                  question={currentQuestion} 
                  onAnswer={(answer) => handleAnswer(currentQuestion.id, answer)}
                  value={answers[currentQuestion.id]}
                />
              )}
              
              {(currentQuestion.type === 'mcq' || currentQuestion.type === 'scq') && (
                <ChoiceQuestion 
                  question={currentQuestion} 
                  onAnswer={(answer) => handleAnswer(currentQuestion.id, answer)}
                  value={answers[currentQuestion.id]}
                />
              )}
              
              {currentQuestion.type === 'match' && (
                <MatchQuestion 
                  question={currentQuestion} 
                  onAnswer={(answer) => handleAnswer(currentQuestion.id, answer)}
                  value={answers[currentQuestion.id]}
                />
              )}
              
              {/* Next button */}
              <div className="mt-8">
                <Button
                  onClick={handleNext}
                  disabled={!isCurrentQuestionAnswered}
                  variant="primary"
                  fullWidth
                >
                  {currentQuestionIndex < questions.length - 1 ? 'Next' : 'Complete Lesson'}
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Help tips sidebar */}
        <div className="lg:col-span-1">
          {currentQuestion.helpTips && (
            <div className="bg-green-50 rounded-3xl shadow-md p-6">
              <div className="flex items-center mb-4">
                <div className="bg-green-500 rounded-full w-8 h-8 flex items-center justify-center mr-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 16V12M12 8H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="font-medium text-green-800">Help Tips:</h3>
              </div>
              
              {currentQuestion.type === 'sort-categories' && (
                <div>
                  {/* For category comparison help tips */}
                  {currentQuestion.categories.length === 2 && (
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center font-medium text-green-800">
                        {currentQuestion.categories[0].name}
                      </div>
                      <div className="text-center font-medium text-green-800">
                        {currentQuestion.categories[1].name}
                      </div>
                      
                      {currentQuestion.helpTipsData?.map((tip: { col1: string; col2: string }, index: number) => (
                        <Fragment key={index}>
                          <div className="text-green-700 text-sm border-t border-green-200 pt-2">
                            {tip.col1}
                          </div>
                          <div className="text-green-700 text-sm border-t border-green-200 pt-2">
                            {tip.col2}
                          </div>
                        </Fragment>
                      ))}
                    </div>
                  )}
                  
                  {/* Fallback for when we don't have structured tips data */}
                  {(!currentQuestion.helpTipsData || currentQuestion.categories.length !== 2) && (
                    <p className="text-green-700 text-sm">{currentQuestion.helpTips}</p>
                  )}
                </div>
              )}
              
              {currentQuestion.type !== 'sort-categories' && (
                <p className="text-green-700 text-sm whitespace-pre-line">{currentQuestion.helpTips}</p>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
      
      {/* Completion message */}
      {isComplete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md mx-auto text-center">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2">Lesson Complete!</h2>
            <p className="text-gray-600 mb-6">Great job! You've completed this lesson.</p>
            <div className="bg-primary text-white text-lg font-medium py-2 px-4 rounded-full inline-block mb-4">
              +{earnedXp} XP
            </div>
            <button 
              onClick={() => navigate({ to: '/learning' })}
              className="bg-primary hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-full w-full"
            >
              Continue Learning
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LessonPage;
