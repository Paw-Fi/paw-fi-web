"use client";

import { ActionButtons } from "@/components/learning/action-buttons";
import { AnswerFeedback } from "@/components/learning/answer-feedback";
import { CompletionDisplay } from "@/components/learning/completion-display";
import { HelpTips } from "@/components/learning/help-tips";
import { useLesson } from "@/components/learning/hooks/use-lesson";
import { LessonBackButton } from "@/components/learning/lesson-back-button";
import { LessonNotFound } from "@/components/learning/lesson-not-found";
import { LessonProgressBar } from "@/components/learning/lesson-progress-bar";
import { QuestionContent } from "@/components/learning/question-content";
import { QuestionHeader } from "@/components/learning/question-header";
import { useAuth } from '@/contexts/auth-context';
import { useUserCourses } from '@/services/course-service';
import { hasCompletedTutorial, saveQuizAttempt, getLatestQuizAttempt, hasPassedQuiz, markTutorialComplete } from '@/services/lesson-progress-service';
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCheck, faBook } from '@fortawesome/free-solid-svg-icons';
import type { Course } from '@/types/learning.types';
import { seo } from '@/utils/seo';
import basicCourse from '@/data/basic-lessons.json'; 
import { createFileRoute, useParams, useRouter } from "@tanstack/react-router";
import catBottle from "@/assets/images/lessons/cat-black.svg";
import catCash from "@/assets/images/lessons/cat-cashbag.svg";
import catCoin from "@/assets/images/lessons/cat-coin.svg";
import catPig from "@/assets/images/lessons/cat-pig.svg";
import { getLessonById } from "@/data/lessons";
import { LessonSkeleton } from "@/components/learning/lesson-skeleton";

export const Route = createFileRoute("/learning/$courseId/lesson/quiz")({
  component: LessonQuizPage,
  head: ({ params }: { params: { courseId: string; lessonId: string } }) => {
    let lessonTitle = 'Lesson Quiz';
    let lessonDescription = 'Test your knowledge with this PawFi lesson quiz.';
    let courseTitle = 'Financial Learning';
    const siteOgImage = 'https://paw-fi.app/og-img.png';

    try {
      const lesson = getLessonById(params.lessonId);
      if (lesson) {
        lessonTitle = lesson.title ? `${lesson.title} Quiz` : lessonTitle;
        lessonDescription = lesson.description || (lesson.content && typeof lesson.content === 'string' ? lesson.content.substring(0, 155) + '...' : lessonDescription);
        
        let foundCourse: Course | undefined = undefined;
        const storedCourses = localStorage.getItem('userCourses'); 
        if (storedCourses) {
          const courses: Course[] = JSON.parse(storedCourses);
          foundCourse = courses.find(c => c.id === params.courseId);
          if (!foundCourse && lesson && lesson.parentId) {
              foundCourse = courses.find(c => c.id === lesson.parentId);
          }
        }

        if (!foundCourse && basicCourse && (basicCourse as Course).id === params.courseId) {
          foundCourse = basicCourse as Course;
        }
        else if (!foundCourse && lesson && lesson.parentId && basicCourse && (basicCourse as Course).id === lesson.parentId) {
          foundCourse = basicCourse as Course;
        }
        
        if (foundCourse) {
          courseTitle = foundCourse.title || courseTitle;
        }  
      }
    } catch (e) {
      console.error('Error fetching lesson/course data for meta tags:', e);
    }

    const pageUrl = `https://pawfi.app/learning/${params.courseId}/lesson/${params.lessonId}/quiz`;
    const keywords = `${lessonTitle.replace(/[^a-zA-Z0-9 ]/g, '')}, ${courseTitle.replace(/[^a-zA-Z0-9 ]/g, '')}, financial education quiz, PawFi`;

    const meta = seo({
      title: `${lessonTitle} | ${courseTitle} - PawFi Learning`,
      description: lessonDescription,
      keywords: keywords,
      image: siteOgImage,
      url: pageUrl,
    });

    return {
      meta,
    };
  },
});

const catIcons=[catBottle,catCash,catCoin,catPig]

function LessonQuizPage() {
  const { courseId, lessonId } = useParams({ from: '/learning/$courseId/lesson/$lessonId/quiz' });
  const { user } = useAuth();
  const router = useRouter();
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  const [previousAttempts, setPreviousAttempts] = useState(0);

  const { data: courses, isLoading: isCoursesLoading, isError: isCoursesError } = useUserCourses(user?.id ?? '', { enabled: !!user });
  const { lesson, isLoading: isLessonLoading, isError: isLessonError, lessonHook } = useLesson(courseId, lessonId, courses ?? []);
  
  // Check if the user has completed the tutorial
  useEffect(() => {
    if (user?.id) {
      const completed = hasCompletedTutorial(user.id, courseId, lessonId);
      setTutorialCompleted(completed);
      
      // If not completed, mark it as completed (assuming they've viewed it since they're on the quiz page)
      if (!completed) {
        markTutorialComplete(user.id, courseId, lessonId);
      }
    }
  }, [user?.id, courseId, lessonId]);
  
  // Handle navigation to next lesson
  const handleNextLesson = () => {
    router.navigate({
      to: '/learning/$courseId',
      params: { courseId }
    });
  };
  
  // Handle navigation back to tutorial
  const handleReviewTutorial = () => {
    router.navigate({
      to: '/learning/$courseId/lesson/$lessonId/tutorial',
      params: { courseId, lessonId }
    });
  };

  // Load lesson data and check tutorial completion
  useEffect(() => {
    if (lesson && user?.id) {
      // Check if tutorial has been completed
      const tutorialComplete = hasCompletedTutorial(user.id, courseId, lessonId);
      setTutorialCompleted(tutorialComplete);
      
      // Check for previous quiz attempts
      const latestAttempt = getLatestQuizAttempt(user.id, courseId, lessonId);
      if (latestAttempt) {
        setPreviousAttempts(1); // We could count all attempts if needed
      }
    }
  }, [lesson, user?.id, courseId, lessonId]);

  // Save quiz attempt when complete and navigate to summary page
  useEffect(() => {
    if (isComplete && user?.id) {
      // Save quiz attempt
      saveQuizAttempt({
        userId: user.id,
        courseId,
        lessonId,
        attemptNumber: previousAttempts + 1,
        score: earnedXp,
        maxScore: lesson?.questions.length * 10 || 0,
        completed: true,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        answers
      });
      
      // Show completion modal
      setShowCompletionModal(true);
      
      // Navigate to summary page after delay
      const timer = setTimeout(() => {
        router.navigate({
          to: '/learning/$courseId/lesson/$lessonId/summary',
          params: { courseId, lessonId }
        });
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isComplete, courseId, lessonId, router, user?.id, previousAttempts, earnedXp, lesson?.questions.length, answers]);

  if (isCoursesLoading || isLessonLoading) {
    return <LessonSkeleton />;
  }
  if (isCoursesError) { 
    return <div className="text-center text-red-500 py-16">Failed to load course data.</div>;
  }
  if (isLessonError) { 
     return <div className="text-center text-red-500 py-16">Failed to load lesson data.</div>;
  }
  if (!lesson) {
    return <LessonNotFound />;
  }

  const {
    currentQuestionIndex,
    currentQuestion,
    answers,
    isComplete,
    earnedXp,
    currentAnswerCorrect,
    countdownSeconds,
    showExplanation,
    progressPercentage,
    isQuestionAnswered,
    handleRetry,
    handleCheckAnswer,
    handleNext,
    handleBack,
    handleAnswer,
    showFeedback,
  } = lessonHook;

  return (
    <div className="bg-background flex flex-1 flex-col px-4 py-8 lg:flex-row">
      <div className="mb-4 lg:mb-0 flex flex-1 flex-col lg:mr-4">
        <div className="flex space-x-3">
          <LessonBackButton onBack={handleBack} />
          <button
            onClick={handleReviewTutorial}
            className="flex items-center text-sm text-primary hover:text-primary-dark transition-colors"
          >
            <FontAwesomeIcon icon={faBook} className="h-4 w-4 mr-1" />
            Review Tutorial
          </button>
        </div>
        
        {/* Progress indicator */}
        <div className="mt-3 flex items-center text-xs text-gray-500">
          <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center mr-2">
            <FontAwesomeIcon icon={faCheck} className="h-3 w-3 text-green-600" />
          </div>
          <span>Tutorial completed</span>
        </div>
      </div>
      <div className="flex lg:w-[40rem] flex-col gap-4">
        <LessonProgressBar progressPercentage={progressPercentage} />
        <div className="relative my-auto">
          <div className="rounded-3xl bg-white p-8 shadow-md">
            <div>
              <QuestionHeader 
                question={currentQuestion.question} 
                catIcon={catIcons[currentQuestionIndex % catIcons.length]} 
              />
              <QuestionContent 
                question={currentQuestion} 
                countdownSeconds={countdownSeconds}
                onAnswer={handleAnswer}
                value={answers[currentQuestion.question_id]}
              />
              <AnswerFeedback 
                isCorrect={currentAnswerCorrect} 
                explanation={currentQuestion.explanation}
                incorrect_explanation={currentQuestion.incorrect_explanation||currentQuestion?.validation?.errorMessage}
                countdownSeconds={countdownSeconds}
                showExplanation={showExplanation}
                showFeedback={showFeedback}
              />
              <ActionButtons 
                currentAnswerCorrect={currentAnswerCorrect}
                isCurrentQuestionAnswered={isQuestionAnswered}
                countdownSeconds={countdownSeconds}
                handleCheckAnswer={handleCheckAnswer}
                handleNext={handleNext}
                isLastQuestion={currentQuestionIndex >= lesson.questions.length - 1}
              />
            </div>
          </div>
          <div className="top-0 right-0 block mx-auto lg:w-72 lg:translate-x-[105%] lg:absolute mt-8 lg:mt-0">
            {(currentQuestion.help_tips || currentQuestion.hint) && (
              <HelpTips 
                questionType={currentQuestion.type}
                help_tips={currentQuestion.help_tips}
                hint={currentQuestion.hint}
                categories={currentQuestion.categories}
                helpTipsData={currentQuestion.helpTipsData}
              />
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col"></div>
      <CompletionDisplay
        isOpen={isComplete}
        onClose={handleBack}
        description="Great job! You've completed this lesson quiz."
        lessonTitle={`Lesson ${lessonId}: ${lesson?.title}`}
        lessonId={lesson?.lesson_id}
        courseId={courseId}
        reward={{
          amount: earnedXp,
          unit: "XP",
        }}
        rewardsProgress={25}
        nextSteps={{
          challenges: {
            title: "Take Challenges",
            description: "Earn XP",
          },
          badges: {
            title: "Course Badges",
            description: "Earn a badge",
          },
        }}
        actionText="Continue Learning"
        isSuccess
      />    
    </div>
  );
}

export default LessonQuizPage;
