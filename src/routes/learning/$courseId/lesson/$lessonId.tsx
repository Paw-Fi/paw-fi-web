"use client";

import { ActionButtons } from "@/components/learning/action-buttons";
import { AnswerFeedback } from "@/components/learning/answer-feedback";
import { CompletionDisplay } from "@/components/learning/completion-display";
import { useLesson } from "@/components/learning/hooks/use-lesson";
import { LessonBackButton } from "@/components/learning/lesson-back-button";
import { LessonNotFound } from "@/components/learning/lesson-not-found";
import { LessonProgressBar } from "@/components/learning/lesson-progress-bar";
import { QuestionContent } from "@/components/learning/question-content";
import { QuestionHeader } from "@/components/learning/question-header";
import { useAuth } from "@/contexts/auth-context";
import { useUserCourses } from "@/services/course-service";
import type { Course, Lesson, Question, Tutorial } from "@/types/learning.types";
import { seo } from "@/utils/seo";
import basicCourse from "@/data/basic-lessons.json"; // Ensure this is imported
import { createFileRoute, useParams } from "@tanstack/react-router";
import catBottle from "@/assets/images/lessons/cat-black.svg";
import catCash from "@/assets/images/lessons/cat-cashbag.svg";
import catCoin from "@/assets/images/lessons/cat-coin.svg";
import catPig from "@/assets/images/lessons/cat-pig.svg";
import { getLessonById } from "@/data/lessons";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LessonSkeleton } from "@/components/learning/lesson-skeleton";
import { ContentDisplay } from "@/components/learning/lesson/content-display";
import { LessonCardTitle } from "@/components/learning/lesson/lesson-card-title";
import { faLightbulb } from "@fortawesome/free-solid-svg-icons";

export const Route = createFileRoute("/learning/$courseId/lesson/$lessonId")({
  component: LessonPage,
  head: ({ params }: { params: { courseId: string; lessonId: string } }) => {
    let lessonTitle = "Lesson";
    let lessonDescription = "Explore this lesson on PawFi.";
    let courseTitle = "Financial Learning";
    const siteOgImage = "https://paw-fi.app/og-img.png"; // Default site OG image

    try {
      const lesson = getLessonById(params.lessonId);
      if (lesson) {
        lessonTitle = lesson.title || lessonTitle;
        lessonDescription =
          lesson.description ||
          (lesson.content && typeof lesson.content === "string"
            ? lesson.content.substring(0, 155) + "..."
            : lessonDescription);
      }
    } catch (e) {
      console.error("Error fetching lesson/course data for meta tags:", e);
    }

    const pageUrl = `https://pawfi.app/learning/${params.courseId}/lesson/${params.lessonId}`;
    const keywords = `${lessonTitle.replace(/[^a-zA-Z0-9 ]/g, "")}, ${courseTitle.replace(/[^a-zA-Z0-9 ]/g, "")}, financial education, PawFi`;

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
      name: lessonTitle,
      description: lessonDescription,
      provider: {
        "@type": "Organization",
        name: "PawFi",
        url: "https://pawfi.app/",
      },
    };

    return {
      meta,
      link: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
      script: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData),
        },
      ],
    };
  },
});

const catIcons = [catBottle, catCash, catCoin, catPig];

// Function to transform questions into a flashcard-style format
function transformQuestionsToFlashcards(lesson: Lesson) {
  const contentItems: Array<{ type: "tutorials"; data: any }> = [];
  const quizTransitionItem: Array<{
    type: "quiz-transition" | "tutorials";
    data: any;
  }> = [];
  const questionItems: Array<{ type: "question"; data: any }> = [];
  const tutorials = lesson.tutorials;

  // First collect all tutorial items
  tutorials.forEach((tutorial) => {
      contentItems.push({
        type: "tutorials",
        data: {
          lessonTitle: lesson.title,
          ...tutorial,
        },
      });    
  });

  // Add quiz transition item after all content
  if (tutorials.length > 0) {
    quizTransitionItem.push({
      type: "tutorials", // Use content type for consistent rendering
      data: {     
        lessonTitle: lesson.title,  
        isQuizTransition: true, // Flag to identify this as a quiz transition
      },
    });
  }

  // Then collect all question items
  lesson.questions.forEach((question) => {
    questionItems.push({
      type: "question",
      data: question,
    });
  });

  // Return all content items followed by quiz transition and then question items
  return [...contentItems, ...quizTransitionItem, ...questionItems];
}


function LessonPage() {
  const { courseId, lessonId } = useParams({
    from: "/learning/$courseId/lesson/$lessonId",
  });
  const { user } = useAuth();

  // Fetch all user courses using the TanStack query
  const {
    data: courses,
    isLoading: isCoursesLoading,
    isError: isCoursesError,
  } = useUserCourses(user?.id ?? "", { enabled: !!user });

  // Find the course and lesson (handle async loading)
  const course =
    courseId === basicCourse.id
      ? basicCourse
      : courses?.find((c: Course) => c.course_id === courseId);
  const lesson =
    courseId === basicCourse.id
      ? basicCourse.lessons.find((l) => l.lesson_id === lessonId)
      : course?.lessons?.find((l) => l.lesson_id === lessonId);

  // Transform questions into flashcard-style content
  const flashcardItems = useMemo(() => {
    if (!lesson?.tutorials|| !lesson.questions) return [];
    return transformQuestionsToFlashcards(lesson);
  }, [lesson]);

  // State to track current item index (content or question)
  const [currentItemIndex, setCurrentItemIndex] = useState(0);

  // Always call the hook, even if lesson is undefined
  const lessonHook = useLesson({ lesson, courseId });

  // Early returns for loading, error, not found
  if (isCoursesLoading) {
    return <LessonSkeleton />;
  }
  if (isCoursesError) {
    return (
      <div className="py-16 text-center text-red-500">
        Failed to load course data.
      </div>
    );
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
    handleNext: nextQuestion,
    handleBack: previousQuestion,
    handleAnswer,
    showFeedback,
  } = lessonHook;

  // Get current flashcard item
  const currentItem = flashcardItems[currentItemIndex];

  const handleBack = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1);
    } else {
      previousQuestion();
    }
  };

  // Handle moving to the next item (content or question)
  const handleNext = () => {
    if (currentItemIndex < flashcardItems.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
    } else {
      // If we've reached the end of all items, complete the lesson
      nextQuestion();
    }
  };

  // Calculate progress based on total items (content + questions)
  const calculatedProgressPercentage =
    (currentItemIndex / flashcardItems.length) * 100;

  return (
    <div className="flex flex-1 flex-col bg-background px-4 py-8 lg:flex-row">
      <div className="mb-4 flex flex-1 flex-col lg:mb-0 lg:mr-4">
        {/* Back button and progress indicator */}
        <LessonBackButton onBack={handleBack} />
      </div>
      <div className="flex flex-col gap-4 lg:w-[40rem]">
        {/* Progress bar */}
        <LessonProgressBar progressPercentage={calculatedProgressPercentage} />
        {/* Main content */}
        <div className="relative my-auto perspective-1000">
          {/* Content or Question container with AnimatePresence for smooth transitions */}
          <AnimatePresence mode="popLayout" initial={false}>
            {currentItem.type === "tutorials" ? (
              <motion.div 
                key={`content-${currentItemIndex}`} 
                initial="hidden" 
                animate="visible" 
                exit="exit" 
                variants={{
                  hidden: { opacity: 0, rotateY: 15, x: 100, scale: 0.95 },
                  visible: { 
                    opacity: 1, 
                    rotateY: 0, 
                    x: 0, 
                    scale: 1, 
                    transition: { type: "spring", stiffness: 500, damping: 30, duration: 0.25 } 
                  },
                  exit: { 
                    opacity: 0, 
                    rotateY: -15, 
                    x: -100, 
                    scale: 0.95, 
                    transition: { type: "spring", stiffness: 500, damping: 30, duration: 0.15 } 
                  }
                }}
                style={{ transformStyle: "preserve-3d" }}>
                <ContentDisplay
              content={currentItem.data}
              onNext={handleNext}
              onBack={handleBack}
              index={currentItemIndex}
              total={
                flashcardItems.filter((item) => item.type === "tutorials").length
              }
              allItemsTotal={flashcardItems.length}
              />
              </motion.div>
            ) : (
              <motion.div 
                key={`question-${currentItemIndex}`} 
                initial="hidden" 
                animate="visible" 
                exit="exit" 
                variants={{
                  hidden: { opacity: 0, rotateY: 15, x: 100, scale: 0.95 },
                  visible: { 
                    opacity: 1, 
                    rotateY: 0, 
                    x: 0, 
                    scale: 1, 
                    transition: { type: "spring", stiffness: 500, damping: 30, duration: 0.25 } 
                  },
                  exit: { 
                    opacity: 0, 
                    rotateY: -15, 
                    x: -100, 
                    scale: 0.95, 
                    transition: { type: "spring", stiffness: 500, damping: 30, duration: 0.15 } 
                  }
                }}
                style={{ transformStyle: "preserve-3d" }}>
            <div className="rounded-3xl bg-white p-8 shadow-md">
              {/* Render the appropriate question component based on type */}
              <div>
              <LessonCardTitle
          lessonTitle={lesson.title}
          index={currentItemIndex}
          allItemsTotal={flashcardItems.length}
          icon={faLightbulb}
        />     
                <QuestionHeader
                  question={currentItem.data.question}
                  catIcon={catIcons[currentQuestionIndex % catIcons.length]}
                />

                <QuestionContent
                  question={currentItem.data}
                  countdownSeconds={countdownSeconds}
                  onAnswer={handleAnswer}
                  value={answers[currentItem.data.question_id]}
                />
                <AnswerFeedback
                  isCorrect={currentAnswerCorrect}
                  explanation={currentItem.data.explanation}
                  incorrect_explanation={
                    currentItem.data.incorrect_explanation ||
                    currentItem.data?.validation?.errorMessage
                  }
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
                  isLastQuestion={currentItemIndex >= flashcardItems.length - 1}
                />
              </div>
            </div>
              </motion.div>
            )}
          </AnimatePresence>
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
