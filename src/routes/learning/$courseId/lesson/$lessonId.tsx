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
import type { Course } from '@/types/learning.types';
import { seo } from '@/utils/seo';
import basicCourse from '@/data/basic-lessons.json'; // Ensure this is imported
import { createFileRoute, useParams } from "@tanstack/react-router";
import catBottle from "@/assets/images/lessons/cat-black.svg";
import catCash from "@/assets/images/lessons/cat-cashbag.svg";
import catCoin from "@/assets/images/lessons/cat-coin.svg";
import catPig from "@/assets/images/lessons/cat-pig.svg";
import { getLessonById } from "@/data/lessons";
import { LessonSkeleton } from "@/components/learning/lesson-skeleton";

export const Route = createFileRoute("/learning/$courseId/lesson/$lessonId")({
  component: LessonPage,
  head: ({ params }: { params: { courseId: string; lessonId: string } }) => {
    let lessonTitle = 'Lesson';
    let lessonDescription = 'Explore this lesson on PawFi.';
    let courseTitle = 'Financial Learning';
    const siteOgImage = 'https://paw-fi.app/og-img.png'; // Default site OG image


    try {
      const lesson = getLessonById(params.lessonId);
      if (lesson) {
        lessonTitle = lesson.title || lessonTitle;
        lessonDescription = lesson.description || (lesson.content && typeof lesson.content === 'string' ? lesson.content.substring(0, 155) + '...' : lessonDescription);
        
      }
    } catch (e) {
      console.error('Error fetching lesson/course data for meta tags:', e);
    }

    const pageUrl = `https://pawfi.app/learning/${params.courseId}/lesson/${params.lessonId}`;
    const keywords = `${lessonTitle.replace(/[^a-zA-Z0-9 ]/g, '')}, ${courseTitle.replace(/[^a-zA-Z0-9 ]/g, '')}, financial education, PawFi`;

    const meta = seo({
      title: `${lessonTitle} | ${courseTitle} - PawFi Learning`,
      description: lessonDescription,
      keywords: keywords,
      image: siteOgImage,
      url: pageUrl,
    });

    // Add structured data for the lesson
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "LearningResource",
      "name": lessonTitle,
      "description": lessonDescription,
      "provider": {
        "@type": "Organization",
        "name": "PawFi",
        "url": "https://pawfi.app/"
      }
    };

    return {
      meta,
      link: [
        {
          rel: 'canonical',
          href: pageUrl
        }
      ],
      script: [
        {
          type: 'application/ld+json',
          children: JSON.stringify(structuredData)
        }
      ]
    };
  },
});

const catIcons=[catBottle,catCash,catCoin,catPig]

function LessonPage() {
  const { courseId, lessonId } = useParams({ from: '/learning/$courseId/lesson/$lessonId' });
  const { user } = useAuth();

  // Fetch all user courses using the TanStack query
  const { data: courses, isLoading: isCoursesLoading, isError: isCoursesError } = useUserCourses(user?.id ?? '', { enabled: !!user });

  // Find the course and lesson (handle async loading)
  const course = courseId === basicCourse.id
    ? basicCourse
    : courses?.find((c: Course) => c.course_id === courseId);
  const lesson = courseId === basicCourse.id
    ? basicCourse.lessons.find((l) => l.lesson_id === lessonId)
    : course?.lessons?.find((l) => l.lesson_id === lessonId);

  // Always call the hook, even if lesson is undefined
  const lessonHook = useLesson({ lesson, courseId });

  // Early returns for loading, error, not found
  if (isCoursesLoading) {
    return <LessonSkeleton />;
  }
  if (isCoursesError) {
    return <div className="text-center text-red-500 py-16">Failed to load course data.</div>;
  }
  if (!lesson) {
    return <LessonNotFound />;
  }
  // Destructure after all early returns
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
        {/* Back button and progress indicator */}
        <LessonBackButton onBack={handleBack} />
      </div>
      <div className="flex lg:w-[40rem] flex-col gap-4">
        {/* Progress bar */}
        <LessonProgressBar progressPercentage={progressPercentage} />
        {/* Main content */}
        <div className="relative my-auto">
       
          {/* Question container  */}
          <div className="rounded-3xl bg-white p-8 shadow-md">
            {/* Render the appropriate question component based on type */}
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

          {/* Help tips container*/}
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

      {/* Completion message - success case */}   
        <CompletionDisplay
          isOpen={isComplete}
          onClose={handleBack}
          description="Great job! You've completed this lesson."
          lessonTitle={`Lesson ${lessonId}: ${lesson?.title}`}
          lessonId={lesson?.lesson_id} // Pass the actual lesson.id, not the URL parameter
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

export default LessonPage;

