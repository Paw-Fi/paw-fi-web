"use client";

import { ActionButtons } from "@/components/learning/action-buttons";
import { AnswerFeedback } from "@/components/learning/answer-feedback";
import { CompletionDisplay } from "@/components/learning/completion-display";
import { useLesson } from "@/components/learning/hooks/use-lesson";
import { unlockNextLesson } from "@/components/learning/hooks/unlock-next-lesson";
import { LessonNotFound } from "@/components/learning/lesson-not-found";
import { LessonProgressBar } from "@/components/learning/lesson-progress-bar";
import { QuestionContent } from "@/components/learning/question-content";
import { QuestionHeader } from "@/components/learning/question-header";
import {
  isAnswerCorrect,
  isCurrentQuestionAnswered,
} from "@/components/learning/lesson-utils";
import { useAuth } from "@/contexts/auth-context";
import { useUserCourses, CourseDataSource } from "@/services/course-service";
import { useQueryClient } from "@tanstack/react-query";
import type { Course, Lesson } from "@/types/learning.types";
import { seo } from "@/utils/seo";
import basicCourse from "@/data/basic-lessons.json"; // Ensure this is imported
import {
  createFileRoute,
  useParams,
  useNavigate,
} from "@tanstack/react-router";
import catBottle from "@/assets/images/lessons/cat-black.svg";
import catCash from "@/assets/images/lessons/cat-cashbag.svg";
import catCoin from "@/assets/images/lessons/cat-coin.svg";
import catPig from "@/assets/images/lessons/cat-pig.svg";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LessonSkeleton } from "@/components/learning/lesson-skeleton";
import { ContentDisplay } from "@/components/learning/lesson/content-display";
import { LessonCardTitle } from "@/components/learning/lesson/lesson-card-title";
import { faLightbulb } from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import { useDashboardGuidance } from "@/hooks/useDashboardGuidance";

import { getCanonicalUrl } from "@/utils/canonical";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute(
  "/dashboard/learning/$courseId/lesson/$lessonId",
)({
  component: EssentialsLessonPage,
  loader: async ({ params }) => {
    // Check if this is the basic course from JSON first
    if (params.courseId === basicCourse.course_id) {
      const lesson = basicCourse.lessons.find(
        (l) => l.lesson_id === params.lessonId,
      );
      if (!lesson) {
        throw new Error("Lesson not found");
      }
      return { course: basicCourse, lesson };
    }

    // Otherwise, query the database
    const { data: allCourses, error: courseError } = await supabase
      .from("user_courses")
      .select("*")
      .eq("course_id", params.courseId)
      .order("created_at", { ascending: false });
    const course = allCourses?.find(
      (c: any) => c.course_id === params.courseId,
    );
    if (!course) {
      throw new Error("Course not found");
    }
    const { data: allLessons, error: lessonError } = await supabase
      .from("user_lessons")
      .select("*")
      .eq("lesson_id", params.lessonId)
      .order("created_at", { ascending: false });
    const lesson = allLessons?.find(
      (l: any) => l.lesson_id === params.lessonId,
    );
    if (!lesson) {
      throw new Error("Lesson not found");
    }
    return { course, lesson };
  },
  head: ({ params, loaderData }) => {
    const { course, lesson } = loaderData || {};
    const pageUrl = getCanonicalUrl(
      `/dashboard/learning/${params.courseId}/lesson/${params.lessonId}`,
    );
    const title = `${lesson?.title || "Lesson"} | ${course?.title || "Course"} - Moneko Learning`;
    const description =
      lesson?.description ||
      `Learn about ${lesson?.title || "this lesson"} as part of the ${course?.title || "course"} on Moneko.`;
    const keywords = `${lesson?.title || ""}, ${course?.title || ""}, ${course?.category || ""}, financial education, Moneko, online lesson`;
    const imageUrl = course?.image || "https://moneko.io/og-img.png"; // Use course image if available

    const meta = seo({
      title,
      description,
      keywords,
      image: imageUrl,
      url: pageUrl,
    });

    return {
      meta,
      links: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
    };
  },
});

function EssentialsLessonPage() {
  // Pass dataSource='local' to LessonPage
  return <LessonPage dataSource="remote" />;
}

const catIcons = [catBottle, catCash, catCoin, catPig];

// Function to transform questions into a flashcard-style format
function transformQuestionsToFlashcards(lesson: Lesson | undefined) {
  const contentItems: Array<{ type: "tutorials"; data: any }> = [];
  const quizTransitionItem: Array<{
    type: "quiz-transition" | "tutorials";
    data: any;
  }> = [];
  const questionItems: Array<{ type: "question"; data: any }> = [];

  if (!lesson) {
    return [];
  }

  const tutorials = lesson.tutorials ?? [];

  // First collect all tutorial items
  tutorials?.forEach((tutorial) => {
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
  lesson.questions?.forEach((question) => {
    questionItems.push({
      type: "question",
      data: question,
    });
  });

  // Return all content items followed by quiz transition and then question items
  return [...contentItems, ...quizTransitionItem, ...questionItems];
}

export interface LessonPageProps {
  /** Data source to use for fetching courses */
  dataSource?: CourseDataSource;
}

function LessonPage({ dataSource = "remote" }: LessonPageProps) {
  // Use useParams with the correct route pattern
  const { courseId, lessonId } = useParams({
    from: "/dashboard/learning/$courseId/lesson/$lessonId",
  });
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Initialize guidance tracking
  const { trackUserAction } = useDashboardGuidance();

  const {
    data: courses = [],
    isLoading: isCoursesLoading,
    isError: isCoursesError,
  } = useUserCourses(user?.id ?? "", {
    enabled: !!user,
    source: dataSource,
  });
  const course_uuid = courses.find((c: Course) => c.course_id === courseId)?.id;
  const lesson_uuid = courses
    .find((c: Course) => c.course_id === courseId)
    ?.lessons.find((l: Lesson) => l.lesson_id === lessonId)?.id;

  // Adapter function to ensure lesson data conforms to the Lesson interface
  const adaptLesson = (lessonData: any): Lesson => {
    return {
      ...lessonData,
      id: lessonData.lesson_id, // Map lesson_id to id to satisfy the Lesson interface
    };
  };

  // Find the course and lesson (handle async loading)
  const course =
    courseId === basicCourse.course_id
      ? basicCourse
      : courses?.find((c: Course) => c.course_id === courseId);
  const lessonData = course?.lessons.find((l) => l.lesson_id === lessonId);
  const lesson = lessonData ? adaptLesson(lessonData) : undefined;

  // Transform questions into flashcard-style content
  const flashcardItems = useMemo(() => {
    return transformQuestionsToFlashcards(lesson);
  }, [lesson]);

  // State to track current item index (content or question)
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  // State to track if we're unlocking the next lesson
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Always call the hook, even if lesson is undefined
  const lessonHook = useLesson({ lesson, courseId: course_uuid });

  // Early returns for loading, error, not found
  if (isCoursesLoading) {
    return <LessonSkeleton />;
  }
  if (isCoursesError) {
    return (
      <div className="py-16 text-center text-red-500 dark:text-red-400">
        Failed to load course data.
      </div>
    );
  }
  if (!lesson) {
    return <LessonNotFound />;
  }
  // Destructure after all early returns
  const {
    currentQuestion,
    answers,
    isComplete,
    setIsComplete,
    showFeedback,
    earnedXp,
    setEarnedXp,
    currentAnswerCorrect,
    countdownSeconds,
    showExplanation,
    progressPercentage,
    isQuestionAnswered,
    handleCheckAnswer,
    handleNext: nextQuestion,
    handleBack: previousQuestion,
    handleAnswer,
    setShowFeedback,
    setCurrentAnswerCorrect,
    setCountdownSeconds,
    setShowExplanation,
    resetQuestionStates,
  } = lessonHook;

  // Get current flashcard item
  const currentItem = flashcardItems[currentItemIndex];

  const handleBack = () => {
    // If we're on the first step, go back to course page
    if (currentItemIndex === 0) {
      const basePath =
        dataSource === "local"
          ? "/dashboard/essentials"
          : "/dashboard/learning";
      navigate({ to: `${basePath}/${courseId}` });
    } else {
      // Go to previous step
      scrollToTop();
      resetQuestionStates();
      setCurrentItemIndex(currentItemIndex - 1);
    }
  };

  // Utility function for immediate scroll to top
  const scrollToTop = () => {
    // Try multiple approaches to ensure scroll works
    const scrollToTopImmediate = () => {
      // First, scroll the main window
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      // Target the main dashboard content container specifically
      const mainContentContainer = document.querySelector(
        'main.overflow-auto, main[class*="overflow-auto"]',
      );
      if (mainContentContainer && mainContentContainer instanceof HTMLElement) {
        mainContentContainer.scrollTop = 0;
      }

      // Also try to scroll any other potential scrollable containers
      const scrollableElements = document.querySelectorAll(
        ".overflow-auto, .overflow-y-auto, [data-scroll-container]",
      );
      scrollableElements.forEach((el) => {
        if (el instanceof HTMLElement) {
          el.scrollTop = 0;
        }
      });

      // Try to scroll the flex container that centers content
      const flexContainers = document.querySelectorAll(
        ".min-h-\\[calc\\(100vh-200px\\)\\]",
      );
      flexContainers.forEach((el) => {
        if (el instanceof HTMLElement && el.parentElement) {
          el.parentElement.scrollTop = 0;
        }
      });
    };

    // Execute immediately
    scrollToTopImmediate();

    // Execute on next animation frame to override any competing animations
    requestAnimationFrame(scrollToTopImmediate);

    // Execute again after animation completes
    setTimeout(scrollToTopImmediate, 150);
  };

  // Create a custom check answer function that works with the current flashcard item
  const checkCurrentAnswer = () => {
    if (currentItem.type !== "question") return;

    // Immediately scroll to top before any processing
    scrollToTop();

    // Use the current flashcard item's question data for validation
    const answer = answers[currentItem.data.question_id];
    const isCorrect = isAnswerCorrect(currentItem.data, answer);

    // Manually set all the feedback states based on the current answer correctness
    setShowFeedback(true);
    setCurrentAnswerCorrect(isCorrect);

    if (isCorrect) {
      // Show explanation for correct answer
      setShowExplanation(true);
    } else {
      // Hide explanation for incorrect answers
      setShowExplanation(false);

      // Set countdown timer for incorrect answers
      setCountdownSeconds(5);

      // Start countdown
      const interval = setInterval(() => {
        setCountdownSeconds((prev: number) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  // Handle moving to the next item (content or question)
  const handleNext = () => {
    // Immediately scroll to top
    scrollToTop();

    // For question items, only allow proceeding if the answer is correct
    // This prevents skipping questions without answering
    if (currentItem.type === "question") {
      // Check if the current question is answered correctly
      const answer = answers[currentItem.data.question_id];
      const isCorrect = isAnswerCorrect(currentItem.data, answer);

      if (!isCorrect) {
        return; // Don't allow proceeding if the current question isn't answered correctly
      }
    }

    // Check if this is the last item in the lesson
    const isLastItem = currentItemIndex >= flashcardItems.length - 1;

    if (isLastItem) {
      // If we're on the last item, directly complete the lesson
      // This ensures the completion modal shows up immediately
      setEarnedXp(lesson?.xp || 0);

      // Handle lesson unlocking differently based on data source
      if (dataSource === "local") {
        // Track lesson completion for guidance system
        trackUserAction("lesson_completed", {
          lessonId: lesson.lesson_id,
          courseId: courseId,
          lessonTitle: lesson.title,
        });
        setIsComplete(true);
      } else if (dataSource === "remote" && lesson && user?.id) {
        // Set loading state before API call
        setIsUnlocking(true);

        // Pass the queryClient to ensure query invalidation works
        unlockNextLesson(
          lesson_uuid ?? "",
          course_uuid ?? "",
          user.id,
          queryClient,
        )
          .then((success) => {
            setIsUnlocking(false); // Reset loading state
            if (success) {
              // Track lesson completion for guidance system
              trackUserAction("lesson_completed", {
                lessonId: lesson.lesson_id,
                courseId: courseId,
                lessonTitle: lesson.title,
              });
              setIsComplete(true);
            } else {
              toast.error("Failed to unlock next lesson");
            }
          })
          .catch((error) => {
            setIsUnlocking(false); // Reset loading state on error
            console.error("Error unlocking next lesson:", error);
            toast.error("Error unlocking next lesson");
          });
      } else {
        // Fallback for any edge cases
        console.warn("Cannot unlock next lesson: missing lesson or user data");
        setIsComplete(true);
      }
    } else {
      // If not the last item, move to the next one
      resetQuestionStates();
      setCurrentItemIndex(currentItemIndex + 1);
    }
  };

  // Calculate progress based on total items (content + questions)
  const calculatedProgressPercentage =
    (currentItemIndex / flashcardItems.length) * 100;

  return (
    <div className="bg-moneko-background dark:bg-dark-background min-h-screen">
      {/* Sticky progress bar with step indicators - Mobile Optimized */}
      <div className="bg-moneko-background/95 dark:bg-dark-background/95 border-border sticky top-0 z-10 border-b backdrop-blur-sm lg:hidden">
        <div className="px-3 py-2 sm:px-4 sm:py-3 md:px-6">
          <div className="mx-auto max-w-4xl">
            <div className="mb-1.5 flex items-center justify-between sm:mb-2">
              <span className="text-mobile-xs text-foreground/70 font-medium sm:text-sm">
                Step {currentItemIndex + 1} of {flashcardItems.length}
              </span>
              <span className="text-mobile-xs text-foreground/70 font-medium sm:text-sm">
                {Math.round(calculatedProgressPercentage)}%
              </span>
            </div>
            <LessonProgressBar
              progressPercentage={calculatedProgressPercentage}
            />
          </div>
        </div>
      </div>

      {/* Main content - Mobile Optimized */}
      <div className="px-3 py-3 pb-6 sm:px-4 sm:py-4 sm:pb-8 md:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-140px)] max-w-4xl items-center justify-center sm:min-h-[calc(100vh-200px)]">
          <div className="perspective-1000 relative w-full">
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
                      transition: {
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                        duration: 0.25,
                      },
                    },
                    exit: {
                      opacity: 0,
                      rotateY: -15,
                      x: -100,
                      scale: 0.95,
                      transition: {
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                        duration: 0.15,
                      },
                    },
                  }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <ContentDisplay
                    content={currentItem.data}
                    onNext={handleNext}
                    onBack={handleBack}
                    index={currentItemIndex}
                    total={
                      flashcardItems.filter((item) => item.type === "tutorials")
                        .length
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
                      transition: {
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                        duration: 0.25,
                      },
                    },
                    exit: {
                      opacity: 0,
                      rotateY: -15,
                      x: -100,
                      scale: 0.95,
                      transition: {
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                        duration: 0.15,
                      },
                    },
                  }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <div className="bg-moneko-background border-border/50 rounded-xl border p-3 shadow-lg sm:rounded-2xl sm:p-4 md:rounded-3xl md:p-6 lg:p-8">
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
                        catIcon={catIcons[currentItemIndex % catIcons.length]}
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
                        isCurrentQuestionAnswered={isCurrentQuestionAnswered(
                          currentItem.data,
                          answers[currentItem.data.question_id],
                        )}
                        countdownSeconds={countdownSeconds}
                        handleCheckAnswer={checkCurrentAnswer}
                        handleNext={handleNext}
                        isLastQuestion={
                          currentItemIndex >= flashcardItems.length - 1
                        }
                        isLoading={isUnlocking}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Completion message - success case */}
      <CompletionDisplay
        isOpen={isComplete}
        onClose={handleBack}
        description="Great job! You've completed this lesson."
        lessonTitle={`Lesson: ${lesson?.title}`}
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
