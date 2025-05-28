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
import { getLessonById, COURSES_STORAGE_KEY } from "@/data/lessons"; // Added COURSES_STORAGE_KEY
import type { Course } from '@/types/learning.types'; // Added Course type
import { seo } from '@/utils/seo';
import basicCourse from '@/data/basic-lessons.json'; // Ensure this is imported
import { createFileRoute, useParams } from "@tanstack/react-router";
import catBottle from "@/assets/images/lessons/cat-black.svg";
import catCash from "@/assets/images/lessons/cat-cashbag.svg";
import catCoin from "@/assets/images/lessons/cat-coin.svg";
import catPig from "@/assets/images/lessons/cat-pig.svg";

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
        
        let foundCourse: Course | undefined = undefined;
        const storedCourses = localStorage.getItem(COURSES_STORAGE_KEY);
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

    const pageUrl = `https://pawfi.app/learning/${params.courseId}/lesson/${params.lessonId}`;
    const keywords = `${lessonTitle.replace(/[^a-zA-Z0-9 ]/g, '')}, ${courseTitle.replace(/[^a-zA-Z0-9 ]/g, '')}, financial education, PawFi`;

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

function LessonPage() {
  const { courseId, lessonId } = useParams({ from: '/learning/$courseId/lesson/$lessonId' });
  
  // Get lesson data from our data file
  const lesson = getLessonById(lessonId);

  // Fallback if lesson doesn't exist
  if (!lesson) {
    return <LessonNotFound />;
  }

  // Use our custom hook to handle all lesson logic
  const {
    currentQuestionIndex,
    currentQuestion,
    answers,
    isComplete,
    isSuccess,
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
    showFeedback
  } = useLesson({
    lessonId,
    courseId,
    questions: lesson.questions,
    unlocked: lesson.unlocked,
    xp: lesson.xp
  });

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
                value={answers[currentQuestion.id]}
              />
              <AnswerFeedback 
                isCorrect={currentAnswerCorrect} 
                explanation={currentQuestion.explanation}
                incorrectExplanation={currentQuestion.incorrectExplanation}
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
            {(currentQuestion.helpTips || currentQuestion.hint) && (
              <HelpTips 
                questionType={currentQuestion.type}
                helpTips={currentQuestion.helpTips}
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
      {isSuccess ? (
        <CompletionDisplay
          isOpen={isComplete}
          onClose={handleBack}
          description="Great job! You've completed this lesson."
          lessonTitle={`Lesson ${lessonId}: ${lesson?.title}`}
          lessonId={lesson?.id} // Pass the actual lesson.id, not the URL parameter
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
      ) : (
        // Try again screen when answers are incorrect
        <CompletionDisplay
          isOpen={isComplete}
          onClose={handleBack}
          title="Keep Learning"
          description={`Some of your answers were incorrect in Lesson ${lessonId}: ${lesson?.title}.`}
          // No reward since they didn't pass
          actionText="Go to Home Page"
          // Custom handler for retry button
          onCustomAction={() => handleRetry()}
          // Use a different emoji for the retry screen - no emoji for retry screen
          emoji=""
          isSuccess={false}
        />
      )}
    </div>
  );
}

export default LessonPage;

